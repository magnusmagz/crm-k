const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { RecruitingPipeline, Contact, Position, Stage, AutomationLog } = require('../models');
const { Op } = require('sequelize');
const automationEngine = require('../services/automationEngine');

// Get all candidates in pipeline
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { positionId, status, stageId, search, limit = 100, offset = 0 } = req.query;
    const where = { userId: req.user.id };

    if (positionId) {
      where.positionId = positionId;
    }

    if (status) {
      where.status = status;
    }

    if (stageId) {
      where.stageId = stageId;
    }

    const includeCandidate = {
      model: Contact,
      as: 'candidate',
      where: {},
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'skills', 
                   'experienceYears', 'currentEmployer', 'currentRole', 'linkedinUrl']
    };

    if (search) {
      includeCandidate.where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { currentEmployer: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const pipelines = await RecruitingPipeline.findAll({
      where,
      include: [
        includeCandidate,
        {
          model: Position,
          attributes: ['id', 'title', 'department', 'location']
        },
        {
          model: Stage,
          attributes: ['id', 'name', 'color', 'order']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['appliedAt', 'DESC']]
    });

    // Calculate analytics
    const analytics = {
      total: pipelines.length,
      active: pipelines.filter(p => p.status === 'active').length,
      hired: pipelines.filter(p => p.status === 'hired').length,
      rejected: pipelines.filter(p => p.status === 'rejected').length,
      withdrawn: pipelines.filter(p => p.status === 'withdrawn').length
    };

    res.json({ pipelines, analytics });
  } catch (error) {
    console.error('Error fetching recruiting pipeline:', error);
    res.status(500).json({ error: 'Failed to fetch recruiting pipeline' });
  }
});

// Get single candidate application
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const pipeline = await RecruitingPipeline.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id
      },
      include: [
        {
          model: Contact,
          as: 'candidate'
        },
        {
          model: Position
        },
        {
          model: Stage
        }
      ]
    });

    if (!pipeline) {
      return res.status(404).json({ error: 'Candidate application not found' });
    }

    res.json({ pipeline });
  } catch (error) {
    console.error('Error fetching candidate application:', error);
    res.status(500).json({ error: 'Failed to fetch candidate application' });
  }
});

// Add candidate to position
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      candidateId,
      positionId,
      stageId,
      status,
      rating,
      notes,
      interviewDate,
      customFields
    } = req.body;

    // Verify candidate exists and set as candidate type
    const candidate = await Contact.findOne({
      where: { 
        id: candidateId,
        userId: req.user.id
      }
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Update contact type to candidate if not already
    if (candidate.contactType !== 'candidate') {
      await candidate.update({ contactType: 'candidate' });
    }

    // Check if candidate is already in pipeline for this position
    const existing = await RecruitingPipeline.findOne({
      where: {
        candidateId,
        positionId,
        userId: req.user.id
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Candidate already applied for this position' });
    }

    // Get default stage if not provided
    let actualStageId = stageId;
    if (!actualStageId) {
      const defaultStage = await Stage.findOne({
        where: { 
          userId: req.user.id,
          pipelineType: 'recruiting',
          order: 0
        }
      });
      actualStageId = defaultStage?.id;
    }

    const pipeline = await RecruitingPipeline.create({
      userId: req.user.id,
      candidateId,
      positionId,
      stageId: actualStageId,
      status: status || 'active',
      rating,
      notes,
      interviewDate,
      customFields: customFields || {}
    });

    const result = await RecruitingPipeline.findOne({
      where: { id: pipeline.id },
      include: [
        { model: Contact, as: 'candidate' },
        { model: Position },
        { model: Stage }
      ]
    });

    // Trigger automation for candidate_added
    await automationEngine.processEvent({
      type: 'candidate_added',
      userId: req.user.id,
      data: {
        pipeline: result,
        candidate: result.candidate,
        position: result.Position,
        stage: result.Stage
      }
    });

    // Log automation trigger
    await logRecruitingAutomation(req.user.id, 'candidate_added', pipeline);

    res.status(201).json({ pipeline: result });
  } catch (error) {
    console.error('Error adding candidate to pipeline:', error);
    res.status(500).json({ error: 'Failed to add candidate to pipeline' });
  }
});

// Update candidate in pipeline (including stage changes)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const pipeline = await RecruitingPipeline.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id
      },
      include: [
        { model: Stage }
      ]
    });

    if (!pipeline) {
      return res.status(404).json({ error: 'Candidate application not found' });
    }

    const oldStageId = pipeline.stageId;
    const oldStatus = pipeline.status;

    await pipeline.update(req.body);

    const result = await RecruitingPipeline.findOne({
      where: { id: pipeline.id },
      include: [
        { model: Contact, as: 'candidate' },
        { model: Position },
        { model: Stage }
      ]
    });

    // Trigger automation for candidate_updated
    await automationEngine.processEvent({
      type: 'candidate_updated',
      userId: req.user.id,
      data: {
        pipeline: result,
        candidate: result.candidate,
        position: result.Position,
        stage: result.Stage,
        changes: req.body
      }
    });

    // Log automation triggers for significant changes
    if (req.body.stageId && req.body.stageId !== oldStageId) {
      // Trigger automation for stage change
      await automationEngine.processEvent({
        type: 'candidate_stage_changed',
        userId: req.user.id,
        data: {
          pipeline: result,
          candidate: result.candidate,
          position: result.Position,
          oldStageId,
          newStageId: req.body.stageId,
          stage: result.Stage
        }
      });

      await logRecruitingAutomation(req.user.id, 'candidate_stage_changed', {
        ...pipeline.toJSON(),
        oldStageId,
        newStageId: req.body.stageId
      });
    }

    if (req.body.status && req.body.status !== oldStatus) {
      if (req.body.status === 'hired') {
        await pipeline.update({ hiredAt: new Date() });
        await automationEngine.processEvent({
          type: 'candidate_hired',
          userId: req.user.id,
          data: {
            pipeline: result,
            candidate: result.candidate,
            position: result.Position,
            stage: result.Stage
          }
        });
        await logRecruitingAutomation(req.user.id, 'candidate_hired', pipeline);
      } else if (req.body.status === 'passed') {
        await automationEngine.processEvent({
          type: 'candidate_passed',
          userId: req.user.id,
          data: {
            pipeline: result,
            candidate: result.candidate,
            position: result.Position,
            stage: result.Stage
          }
        });
        await logRecruitingAutomation(req.user.id, 'candidate_passed', pipeline);
      }
    }

    res.json({ pipeline: result });
  } catch (error) {
    console.error('Error updating candidate in pipeline:', error);
    res.status(500).json({ error: 'Failed to update candidate in pipeline' });
  }
});

// Move candidate to different stage
router.put('/:id/move', authMiddleware, async (req, res) => {
  try {
    const { stageId } = req.body;

    const pipeline = await RecruitingPipeline.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!pipeline) {
      return res.status(404).json({ error: 'Candidate application not found' });
    }

    const oldStageId = pipeline.stageId;
    await pipeline.update({ stageId });

    const result = await RecruitingPipeline.findOne({
      where: { id: pipeline.id },
      include: [
        { model: Contact, as: 'candidate' },
        { model: Position },
        { model: Stage }
      ]
    });

    // Trigger automation for stage change
    await automationEngine.processEvent({
      type: 'candidate_stage_changed',
      userId: req.user.id,
      data: {
        pipeline: result,
        candidate: result.candidate,
        position: result.Position,
        oldStageId,
        newStageId: stageId,
        stage: result.Stage
      }
    });

    // Log automation trigger for stage change
    await logRecruitingAutomation(req.user.id, 'candidate_stage_changed', {
      ...pipeline.toJSON(),
      oldStageId,
      newStageId: stageId
    });

    res.json({ pipeline: result });
  } catch (error) {
    console.error('Error moving candidate:', error);
    res.status(500).json({ error: 'Failed to move candidate' });
  }
});

// Remove candidate from pipeline
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const pipeline = await RecruitingPipeline.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!pipeline) {
      return res.status(404).json({ error: 'Candidate application not found' });
    }

    await pipeline.destroy();

    res.json({ message: 'Candidate removed from pipeline successfully' });
  } catch (error) {
    console.error('Error removing candidate:', error);
    res.status(500).json({ error: 'Failed to remove candidate from pipeline' });
  }
});

// Bulk move candidates
router.put('/bulk/move', authMiddleware, async (req, res) => {
  try {
    const { candidateIds, stageId } = req.body;

    if (!candidateIds || !Array.isArray(candidateIds)) {
      return res.status(400).json({ error: 'Candidate IDs array is required' });
    }

    const pipelines = await RecruitingPipeline.findAll({
      where: {
        id: candidateIds,
        userId: req.user.id
      }
    });

    // Update all and log automation triggers
    for (const pipeline of pipelines) {
      const oldStageId = pipeline.stageId;
      await pipeline.update({ stageId });
      
      await logRecruitingAutomation(req.user.id, 'candidate_stage_changed', {
        ...pipeline.toJSON(),
        oldStageId,
        newStageId: stageId
      });
    }

    res.json({ message: `${pipelines.length} candidates moved successfully` });
  } catch (error) {
    console.error('Error bulk moving candidates:', error);
    res.status(500).json({ error: 'Failed to bulk move candidates' });
  }
});

// Helper function to log recruiting automation events
async function logRecruitingAutomation(userId, triggerType, data) {
  try {
    // This will integrate with your existing automation system
    await AutomationLog.create({
      userId,
      automationId: null, // Will be populated by automation engine
      triggerType: `recruiting_${triggerType}`,
      triggerData: data,
      conditionsMet: true,
      status: 'pending',
      executedAt: new Date()
    });
  } catch (error) {
    console.error('Error logging recruiting automation:', error);
  }
}

module.exports = router;