const { Stage, Position, RecruitingPipeline, Contact, User } = require('../models');
const { sequelize } = require('../models');

async function testRecruitingPipeline() {
  try {
    console.log('🧪 Testing Recruiting Pipeline Setup...\n');
    
    // Get andy user
    const andy = await User.findOne({ 
      where: { email: 'andy@salesco.com' }
    });
    
    if (!andy) {
      console.log('❌ Andy not found! Run fixUserProfiles.js first.');
      return;
    }
    
    console.log('✅ Found Andy:', andy.email);
    
    // Check for recruiting stages
    console.log('\n📊 Checking recruiting stages...');
    let recruitingStages = await Stage.findAll({
      where: { 
        userId: andy.id,
        pipelineType: 'recruiting' 
      },
      order: [['order', 'ASC']]
    });
    
    if (recruitingStages.length === 0) {
      console.log('No recruiting stages found. Creating default stages...');
      
      const defaultRecruitingStages = [
        { name: 'Applied', isWon: false, isLost: false },
        { name: 'Phone Screen', isWon: false, isLost: false },
        { name: 'Technical Interview', isWon: false, isLost: false },
        { name: 'Onsite Interview', isWon: false, isLost: false },
        { name: 'Reference Check', isWon: false, isLost: false },
        { name: 'Offer', isWon: false, isLost: false },
        { name: 'Hired', isWon: true, isLost: false },
        { name: 'Rejected', isWon: false, isLost: true }
      ];
      
      for (let i = 0; i < defaultRecruitingStages.length; i++) {
        await Stage.create({
          ...defaultRecruitingStages[i],
          userId: andy.id,
          order: i,
          pipelineType: 'recruiting'
        });
      }
      
      recruitingStages = await Stage.findAll({
        where: { 
          userId: andy.id,
          pipelineType: 'recruiting' 
        },
        order: [['order', 'ASC']]
      });
      
      console.log('✅ Created default recruiting stages');
    }
    
    console.log('\nRecruiting Stages:');
    recruitingStages.forEach(stage => {
      console.log(`  ${stage.order}. ${stage.name}${stage.isWon ? ' (Hired)' : ''}${stage.isLost ? ' (Rejected)' : ''}`);
    });
    
    // Check for positions
    console.log('\n💼 Checking positions...');
    let positions = await Position.findAll({
      where: { userId: andy.id }
    });
    
    if (positions.length === 0) {
      console.log('No positions found. Creating test positions...');
      
      const testPositions = [
        {
          title: 'Senior Software Engineer',
          department: 'Engineering',
          location: 'San Francisco, CA',
          type: 'full-time',
          remote: 'hybrid',
          salaryRange: { min: 150000, max: 200000 },
          description: 'Looking for a senior engineer to join our team',
          requirements: '• 5+ years experience\n• React expertise\n• Node.js proficiency',
          status: 'open'
        },
        {
          title: 'Product Manager',
          department: 'Product',
          location: 'Remote',
          type: 'full-time',
          remote: 'remote',
          salaryRange: { min: 130000, max: 180000 },
          description: 'Product manager for our SaaS platform',
          requirements: '• 3+ years PM experience\n• B2B SaaS background',
          status: 'open'
        }
      ];
      
      for (const posData of testPositions) {
        await Position.create({
          ...posData,
          userId: andy.id
        });
      }
      
      positions = await Position.findAll({
        where: { userId: andy.id }
      });
      
      console.log('✅ Created test positions');
    }
    
    console.log('\nPositions:');
    positions.forEach(pos => {
      console.log(`  - ${pos.title} (${pos.department}) - ${pos.location}`);
    });
    
    // Check for candidates in pipeline
    console.log('\n👥 Checking recruiting pipeline...');
    const pipelines = await RecruitingPipeline.findAll({
      where: { userId: andy.id },
      include: [
        { model: Contact, as: 'candidate' },
        { model: Position },
        { model: Stage }
      ]
    });
    
    if (pipelines.length === 0) {
      console.log('No candidates in pipeline. Adding test candidates...');
      
      // Create test candidates
      const candidates = [
        {
          firstName: 'John',
          lastName: 'Developer',
          email: 'john@example.com',
          phone: '555-0101',
          skills: ['JavaScript', 'React', 'Node.js'],
          yearsOfExperience: 6,
          desiredSalary: 175000,
          linkedinUrl: 'https://linkedin.com/in/johndeveloper'
        },
        {
          firstName: 'Jane',
          lastName: 'Product',
          email: 'jane@example.com',
          phone: '555-0102',
          skills: ['Product Management', 'Agile', 'Data Analysis'],
          yearsOfExperience: 4,
          desiredSalary: 150000,
          linkedinUrl: 'https://linkedin.com/in/janeproduct'
        }
      ];
      
      for (const candData of candidates) {
        const contact = await Contact.create({
          ...candData,
          userId: andy.id,
          source: 'LinkedIn'
        });
        
        // Add to pipeline
        const position = candData.skills.includes('JavaScript') ? positions[0] : positions[1];
        const stage = recruitingStages[Math.floor(Math.random() * 4)]; // Random early stage
        
        await RecruitingPipeline.create({
          userId: andy.id,
          candidateId: contact.id,
          positionId: position.id,
          stageId: stage.id,
          status: 'active',
          rating: Math.floor(Math.random() * 3) + 3, // 3-5 rating
          notes: `Strong candidate for ${position.title}`
        });
      }
      
      console.log('✅ Added test candidates to pipeline');
    }
    
    // Show final pipeline status
    const finalPipelines = await RecruitingPipeline.findAll({
      where: { userId: andy.id },
      include: [
        { model: Contact, as: 'candidate' },
        { model: Position },
        { model: Stage }
      ]
    });
    
    console.log('\n📋 Current Recruiting Pipeline:');
    finalPipelines.forEach(pipeline => {
      console.log(`  ${pipeline.candidate.firstName} ${pipeline.candidate.lastName}`);
      console.log(`    Position: ${pipeline.Position.title}`);
      console.log(`    Stage: ${pipeline.Stage.name}`);
      console.log(`    Rating: ${'⭐'.repeat(pipeline.rating || 0)}`);
      console.log('');
    });
    
    console.log('✅ Recruiting pipeline is ready!');
    console.log('\n🎯 You can now switch to Recruiting Mode in the app to see candidates.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testRecruitingPipeline();