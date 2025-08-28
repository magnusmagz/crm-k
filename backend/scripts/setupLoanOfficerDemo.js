require('dotenv').config();
const { User, Contact, Position, RecruitingPipeline, Stage } = require('../models');

async function setupLoanOfficerDemo() {
  try {
    // Find andy (demo user)
    const andy = await User.findOne({ where: { email: 'andy@salesco.com' } });
    
    if (!andy) {
      console.error('Andy user not found. Please run setupSalesCo.js first.');
      process.exit(1);
    }
    
    console.log('Found user:', andy.email);
    
    // Create Loan Officer position
    const [position, created] = await Position.findOrCreate({
      where: {
        userId: andy.id,
        title: 'Loan Officer'
      },
      defaults: {
        userId: andy.id,
        title: 'Loan Officer',
        department: 'Mortgage Banking',
        location: 'Remote / Multiple Locations',
        type: 'full-time',
        remote: 'hybrid',
        salaryRange: {
          min: 60000,
          max: 150000,
          currency: 'USD',
          note: 'Base + Commission'
        },
        requirements: `• Active NMLS license required
• Minimum 2 years of mortgage origination experience
• Strong knowledge of conventional, FHA, VA, and USDA loan programs
• Excellent communication and interpersonal skills
• Proven track record of meeting sales targets
• Experience with loan origination software (Encompass, Calyx, etc.)
• Bachelor's degree in Finance, Business, or related field preferred`,
        description: `We are seeking experienced Loan Officers to join our growing mortgage banking team. The ideal candidate will have a proven track record in residential mortgage origination and a commitment to providing exceptional customer service.

Key Responsibilities:
• Originate residential mortgage loans through various referral sources
• Guide borrowers through the loan application process
• Analyze borrower financial information and creditworthiness
• Ensure compliance with all federal and state regulations
• Build and maintain relationships with real estate agents and other referral partners
• Meet or exceed monthly loan production goals

What We Offer:
• Competitive commission structure
• Comprehensive marketing support
• Access to wide range of loan products
• Ongoing training and professional development
• Flexible work arrangements`,
        status: 'open',
        customFields: {
          urgency: 'high',
          hiringManager: 'Sarah Johnson',
          targetStartDate: '2025-03-01'
        }
      }
    });
    
    if (created) {
      console.log('✅ Created Loan Officer position');
    } else {
      console.log('Position already exists:', position.title);
    }
    
    // Find the two demo contacts
    const contacts = await Contact.findAll({
      where: {
        userId: andy.id,
        email: ['john.smith@email.com', 'sarah.johnson@email.com']
      }
    });
    
    console.log(`Found ${contacts.length} demo contacts`);
    
    // Get the first recruiting stage (Applied/Sourced)
    const firstStage = await Stage.findOne({
      where: {
        userId: andy.id,
        pipelineType: 'recruiting',
        order: 1  // Applied/Sourced stage
      }
    });
    
    if (!firstStage) {
      console.error('No recruiting stages found. Please set up recruiting stages first.');
      process.exit(1);
    }
    
    console.log('Using stage:', firstStage.name);
    
    // Add each contact as a candidate for the Loan Officer position
    for (const contact of contacts) {
      // Update contact to be a candidate type
      await contact.update({
        contactType: 'candidate',
        currentRole: contact.position || 'Loan Officer',
        currentEmployer: contact.company || 'Previous Bank',
        experienceYears: 5,
        skills: ['Mortgage Origination', 'FHA Loans', 'VA Loans', 'Customer Service', 'Sales', 'Encompass'],
        resumeUrl: 'https://example.com/resume.pdf',
        linkedinUrl: `https://linkedin.com/in/${contact.firstName.toLowerCase()}-${contact.lastName.toLowerCase()}`,
        availability: '2 weeks notice',
        salaryExpectation: {
          min: 70000,
          max: 120000,
          currency: 'USD'
        }
      });
      
      // Check if already in pipeline
      const existing = await RecruitingPipeline.findOne({
        where: {
          candidateId: contact.id,
          positionId: position.id,
          userId: andy.id
        }
      });
      
      if (!existing) {
        // Add to recruiting pipeline
        const pipeline = await RecruitingPipeline.create({
          userId: andy.id,
          candidateId: contact.id,
          positionId: position.id,
          stageId: firstStage.id,
          status: 'active',
          rating: Math.floor(Math.random() * 2) + 4, // Random 4 or 5 star rating
          notes: `Strong candidate for Loan Officer position. ${contact.firstName} has relevant experience in mortgage banking.`,
          appliedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date in last 7 days
          customFields: {
            referralSource: 'LinkedIn',
            nmslStatus: 'Active',
            productExperience: ['Conventional', 'FHA', 'VA', 'Jumbo']
          }
        });
        
        console.log(`✅ Added ${contact.firstName} ${contact.lastName} as candidate for Loan Officer position`);
      } else {
        console.log(`${contact.firstName} ${contact.lastName} is already a candidate for this position`);
      }
    }
    
    console.log('\n✨ Demo setup complete!');
    console.log('You can now view the candidates in the Recruiting Pipeline');
    
  } catch (error) {
    console.error('Error setting up demo:', error);
    process.exit(1);
  }
}

setupLoanOfficerDemo().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});