const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

// Get all candidates in pipeline
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { positionId, status, stageId, search, limit = 50, offset = 0 } = req.query;
    
    let whereConditions = [`rp."userId" = :userId`];
    const replacements = { 
      userId: req.user.id,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    if (positionId) {
      whereConditions.push(`rp."positionId" = :positionId`);
      replacements.positionId = positionId;
    }
    
    if (status) {
      whereConditions.push(`rp.status = :status`);
      replacements.status = status;
    }
    
    if (stageId) {
      whereConditions.push(`rp."stageId" = :stageId`);
      replacements.stageId = stageId;
    }
    
    if (search) {
      whereConditions.push(`(
        c.first_name ILIKE :search OR 
        c.last_name ILIKE :search OR 
        c.email ILIKE :search OR
        c."currentRole" ILIKE :search OR
        c."currentEmployer" ILIKE :search
      )`);
      replacements.search = `%${search}%`;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Get pipeline entries with candidate and position details
    const rawPipelines = await sequelize.query(
      `SELECT 
        rp.*,
        c.id as candidateid,
        c.first_name as candidatefirstname,
        c.last_name as candidatelastname,
        c.email as candidateemail,
        c.phone as candidatephone,
        c."currentRole" as currentrole,
        c."currentEmployer" as currentemployer,
        c."experienceYears" as experienceyears,
        c.skills as skills,
        c."salaryExpectation" as salaryexpectation,
        c."linkedinUrl" as linkedinurl,
        c."githubUrl" as githuburl,
        p.id as positionidfull,
        p.title as positiontitle,
        p.department as positiondepartment,
        p.location as positionlocation,
        s.name as stagename,
        s.color as stagecolor
      FROM "RecruitingPipeline" rp
      LEFT JOIN contacts c ON rp."candidateId" = c.id
      LEFT JOIN positions p ON rp."positionId" = p.id
      LEFT JOIN stages s ON rp."stageId" = s.id
      WHERE ${whereClause}
      ORDER BY rp."appliedAt" DESC
      LIMIT :limit OFFSET :offset`,
      {
        replacements,
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    // Transform flat data into nested structure expected by frontend
    const pipelines = rawPipelines.map(p => ({
      id: p.id,
      userId: p.userId,
      candidateId: p.candidateId,
      positionId: p.positionId,
      stageId: p.stageId,
      status: p.status,
      rating: p.rating,
      notes: p.notes,
      interviewDate: p.interviewDate,
      appliedAt: p.appliedAt,
      hiredAt: p.hiredAt,
      rejectedAt: p.rejectedAt,
      withdrawnAt: p.withdrawnAt,
      offerDetails: p.offerDetails,
      rejectionReason: p.rejectionReason,
      customFields: p.customFields,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      candidate: p.candidatefirstname ? {
        id: p.candidateid,
        firstName: p.candidatefirstname,
        lastName: p.candidatelastname,
        email: p.candidateemail,
        phone: p.candidatephone,
        currentRole: p.currentrole,
        currentEmployer: p.currentemployer,
        experienceYears: p.experienceyears,
        skills: p.skills,
        salaryExpectation: p.salaryexpectation,
        linkedinUrl: p.linkedinurl,
        githubUrl: p.githuburl
      } : null,
      Position: p.positiontitle ? {
        id: p.positionidfull,
        title: p.positiontitle,
        department: p.positiondepartment,
        location: p.positionlocation
      } : null,
      Stage: p.stagename ? {
        name: p.stagename,
        color: p.stagecolor
      } : null
    }));
    
    
    // Get total count
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as count 
      FROM "RecruitingPipeline" rp
      LEFT JOIN contacts c ON rp."candidateId" = c.id
      WHERE ${whereClause}`,
      {
        replacements,
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    res.json({
      pipelines,
      total: parseInt(countResult?.count || 0),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
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
      status = 'active',
      rating = 0,
      notes = '',
      interviewDate,
      customFields = {}
    } = req.body;

    console.log('Adding candidate to pipeline:', { candidateId, positionId, userId: req.user.id });

    // Verify candidate exists
    const [candidate] = await sequelize.query(
      `SELECT id, user_id FROM contacts WHERE id = :candidateId AND user_id = :userId`,
      {
        replacements: { candidateId, userId: req.user.id },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Check if candidate is already in pipeline for this position
    const [existing] = await sequelize.query(
      `SELECT id FROM "RecruitingPipeline" 
      WHERE "candidateId" = :candidateId 
      AND "positionId" = :positionId 
      AND "userId" = :userId`,
      {
        replacements: { candidateId, positionId, userId: req.user.id },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (existing) {
      return res.status(400).json({ error: 'Candidate already applied for this position' });
    }

    // Get default stage if not provided
    let actualStageId = stageId;
    if (!actualStageId) {
      const [defaultStage] = await sequelize.query(
        `SELECT id FROM stages 
        WHERE user_id = :userId 
        AND pipeline_type = 'recruiting'
        ORDER BY "order" ASC 
        LIMIT 1`,
        {
          replacements: { userId: req.user.id },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (defaultStage) {
        actualStageId = defaultStage.id;
      }
    }

    const pipelineId = uuidv4();
    
    // Create pipeline entry
    await sequelize.query(
      `INSERT INTO "RecruitingPipeline" 
      (id, "userId", "candidateId", "positionId", "stageId", status, rating, notes, "interviewDate", "customFields", "appliedAt", "createdAt", "updatedAt")
      VALUES (:id, :userId, :candidateId, :positionId, :stageId, :status, :rating, :notes, :interviewDate, :customFields, NOW(), NOW(), NOW())`,
      {
        replacements: {
          id: pipelineId,
          userId: req.user.id,
          candidateId,
          positionId,
          stageId: actualStageId,
          status,
          rating,
          notes,
          interviewDate: interviewDate || null,
          customFields: JSON.stringify(customFields)
        }
      }
    );

    // Fetch the created entry with details
    const [newPipeline] = await sequelize.query(
      `SELECT 
        rp.*,
        c.first_name as "candidateFirstName",
        c.last_name as "candidateLastName",
        c.email as "candidateEmail",
        p.title as "positionTitle",
        s.name as "stageName"
      FROM "RecruitingPipeline" rp
      LEFT JOIN contacts c ON rp."candidateId" = c.id
      LEFT JOIN positions p ON rp."positionId" = p.id
      LEFT JOIN stages s ON rp."stageId" = s.id
      WHERE rp.id = :id`,
      {
        replacements: { id: pipelineId },
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.status(201).json({ pipeline: newPipeline });
  } catch (error) {
    console.error('Error adding candidate to pipeline:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      sql: error.sql
    });
    res.status(500).json({ 
      error: 'Failed to add candidate to pipeline',
      details: error.message 
    });
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