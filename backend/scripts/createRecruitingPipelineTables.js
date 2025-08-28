const { sequelize } = require('../models');

async function createRecruitingPipelineTables() {
  try {
    console.log('Creating recruiting pipeline tables...');

    // Create RecruitingPipeline table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "RecruitingPipeline" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "candidateId" UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        "positionId" UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
        "stageId" UUID REFERENCES stages(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'active',
        rating INTEGER DEFAULT 0,
        notes TEXT,
        "interviewDate" TIMESTAMP WITH TIME ZONE,
        "appliedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "hiredAt" TIMESTAMP WITH TIME ZONE,
        "rejectedAt" TIMESTAMP WITH TIME ZONE,
        "withdrawnAt" TIMESTAMP WITH TIME ZONE,
        "offerDetails" JSONB,
        "rejectionReason" TEXT,
        "customFields" JSONB DEFAULT '{}',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE("candidateId", "positionId")
      )
    `);

    console.log('✓ Created RecruitingPipeline table');

    // Add indexes for better performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_recruiting_pipeline_user 
      ON "RecruitingPipeline"("userId")
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_recruiting_pipeline_position 
      ON "RecruitingPipeline"("positionId")
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_recruiting_pipeline_stage 
      ON "RecruitingPipeline"("stageId")
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_recruiting_pipeline_status 
      ON "RecruitingPipeline"(status)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_recruiting_pipeline_applied 
      ON "RecruitingPipeline"("appliedAt")
    `);

    console.log('✓ Created indexes for RecruitingPipeline table');

    // Create interview_schedules table for tracking interviews
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS interview_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "pipelineId" UUID NOT NULL REFERENCES "RecruitingPipeline"(id) ON DELETE CASCADE,
        "scheduledAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "duration" INTEGER DEFAULT 60,
        "type" VARCHAR(50) DEFAULT 'phone',
        location TEXT,
        "interviewerIds" UUID[],
        notes TEXT,
        status VARCHAR(50) DEFAULT 'scheduled',
        "meetingLink" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log('✓ Created interview_schedules table');

    // Create candidate_evaluations table for feedback
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS candidate_evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "pipelineId" UUID NOT NULL REFERENCES "RecruitingPipeline"(id) ON DELETE CASCADE,
        "evaluatorId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        strengths TEXT,
        weaknesses TEXT,
        "technicalSkills" INTEGER CHECK ("technicalSkills" >= 1 AND "technicalSkills" <= 5),
        "communicationSkills" INTEGER CHECK ("communicationSkills" >= 1 AND "communicationSkills" <= 5),
        "cultureFit" INTEGER CHECK ("cultureFit" >= 1 AND "cultureFit" <= 5),
        recommendation VARCHAR(50),
        notes TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE("pipelineId", "evaluatorId")
      )
    `);

    console.log('✓ Created candidate_evaluations table');

    console.log('\n✅ All recruiting pipeline tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating recruiting pipeline tables:', error);
    process.exit(1);
  }
}

createRecruitingPipelineTables();