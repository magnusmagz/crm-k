# Recruiting Pipeline Feature

The CRM now includes a comprehensive recruiting pipeline to manage candidates, positions, and hiring workflows alongside your existing sales pipeline.

## 🚀 Quick Start

### 1. Switch to Recruiting Mode
- Click the mode toggle in the top navigation bar
- Switch from "Sales Mode" to "Recruiting Mode"
- The interface will update to show recruiting-specific features

### 2. Set Up Positions
- Click "Manage Positions" to create job positions
- Add details like title, department, location, salary range
- Set positions as "Open", "Closed", or "On-hold"

### 3. Add Candidates
- Click "New Candidate" to add candidates to your pipeline
- Fill in candidate information (name, email, skills, experience)
- Assign to a specific position and stage
- Candidates are automatically added to the "Prospect" stage

## 📊 Pipeline Management

### Stages
The recruiting pipeline includes default stages:
- **Prospect** - Initial candidates
- **Applied/Sourced** - Candidates who have formally applied
- **Discovery Call 1** - First screening call
- **Discovery Call 2** - Second interview
- **OB Login** - Onboarding/background check
- **Offer Letter Out** - Offer extended
- **Hired** - Successfully hired candidates
- **Passed** - Candidates who didn't proceed

### Moving Candidates
- Drag and drop candidates between stages
- Update candidate status (Active, Hired, Passed, Withdrawn)
- Add ratings and notes
- Schedule interview dates

### Filtering and Search
- Filter candidates by position
- Search by name, email, skills, or current employer
- View candidates by status

## 🔧 Setup & Deployment

### Database Migration
For new deployments, run the database migration:

```bash
# Local development
node backend/scripts/createRecruitingPipelineTables.js

# Heroku production
heroku run "node backend/scripts/createRecruitingPipelineTables.js" -a your-app-name
```

This creates the following tables:
- `RecruitingPipeline` - Main candidate pipeline data
- `interview_schedules` - Interview scheduling
- `candidate_evaluations` - Candidate ratings and feedback

### Required Dependencies
- All existing CRM dependencies
- PostgreSQL database
- Proper authentication middleware

## 📋 API Endpoints

### Recruiting Pipeline
- `GET /api/recruiting-pipeline` - Get all candidates
- `POST /api/recruiting-pipeline` - Add candidate to pipeline
- `PUT /api/recruiting-pipeline/:id` - Update candidate
- `PUT /api/recruiting-pipeline/:id/move` - Move candidate to different stage
- `DELETE /api/recruiting-pipeline/:id` - Remove candidate from pipeline

### Positions
- `GET /api/positions` - Get all positions
- `POST /api/positions` - Create new position
- `PUT /api/positions/:id` - Update position
- `DELETE /api/positions/:id` - Delete position

### Query Parameters
- `positionId` - Filter by specific position
- `stageId` - Filter by pipeline stage
- `status` - Filter by candidate status
- `search` - Search candidates
- `limit` & `offset` - Pagination

## 💾 Database Schema

### RecruitingPipeline Table
```sql
CREATE TABLE "RecruitingPipeline" (
  id UUID PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES users(id),
  "candidateId" UUID NOT NULL REFERENCES contacts(id),
  "positionId" UUID NOT NULL REFERENCES positions(id),
  "stageId" UUID REFERENCES stages(id),
  status VARCHAR(50) DEFAULT 'active',
  rating INTEGER DEFAULT 0,
  notes TEXT,
  "interviewDate" TIMESTAMP WITH TIME ZONE,
  "appliedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "hiredAt" TIMESTAMP WITH TIME ZONE,
  -- Additional fields for recruiting workflow
);
```

### Key Relationships
- **Candidates** are stored in the existing `contacts` table with `contactType = 'candidate'`
- **Positions** are stored in the `positions` table
- **Stages** use the existing `stages` table with `pipelineType = 'recruiting'`

## 🔍 Features

### Candidate Management
- **Contact Integration**: Candidates are stored as contacts with recruiting-specific fields
- **Skills Tracking**: Track candidate skills, experience years, and salary expectations
- **Employment History**: Current employer and role information
- **Social Profiles**: LinkedIn and GitHub profile links
- **Document Storage**: Resume URLs and other documents

### Pipeline Analytics
- Active candidate count per position
- Hired vs. passed candidates
- Pipeline stage distribution
- Time-to-hire tracking

### Automation Support
The system supports automation triggers for:
- `candidate_added` - When candidate joins pipeline
- `candidate_stage_changed` - When moved between stages
- `candidate_hired` - When marked as hired
- `candidate_rejected` - When marked as passed
- `interview_scheduled` - When interview is scheduled

## 🐛 Troubleshooting

### Common Issues

**"relation 'RecruitingPipeline' does not exist"**
- Run the database migration script
- Ensure you have proper database permissions

**Candidates not displaying in pipeline**
- Check that candidates have valid `stageId` references
- Verify stages exist with `pipelineType = 'recruiting'`
- Check browser console for JavaScript errors

**Mode toggle not working**
- Ensure you have the latest frontend build deployed
- Check that `AppModeContext` is properly configured

### Data Migration Notes
If migrating from existing recruiting data:
1. Create positions first
2. Create recruiting stages
3. Map existing candidate data to contacts table
4. Create RecruitingPipeline entries linking candidates to positions

## 🔐 Permissions

### User Access
- **Regular Users**: Can manage candidates and positions within their organization
- **Admins**: Full access to recruiting features and settings
- **Multi-tenant**: Each organization has isolated recruiting data

### Data Isolation
All recruiting data is properly isolated by:
- `userId` for individual user data
- `organizationId` for multi-tenant deployments
- Proper authentication middleware on all endpoints

## 📈 Future Enhancements

Planned features for future releases:
- Interview scheduling integration
- Automated email templates for candidates
- Bulk candidate operations
- Advanced reporting and analytics
- Integration with job boards
- Candidate portal for application tracking

---

## 🆘 Support

For technical issues or questions:
1. Check the browser console for JavaScript errors
2. Review server logs for API errors
3. Verify database migrations have run successfully
4. Ensure proper authentication and permissions

The recruiting pipeline integrates seamlessly with the existing CRM infrastructure while providing specialized tools for talent acquisition and hiring workflows.