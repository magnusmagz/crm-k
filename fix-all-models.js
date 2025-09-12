#!/usr/bin/env node

// Comprehensive script to fix ALL model field mappings
// Based on actual database schema analysis

const fs = require('fs');
const path = require('path');

const modelFixes = {
  'backend/models/User.js': {
    description: 'User model - mixed snake_case and camelCase',
    fields: {
      // Already partially fixed, ensure completeness
      snake_case: ['is_verified', 'reset_token', 'reset_token_expiry', 'last_login', 'is_super_admin'],
      camelCase: ['organizationId', 'isAdmin', 'isLoanOfficer', 'licensedStates', 'requirePasswordChange', 'isActive']
    }
  },
  
  'backend/models/Contact.js': {
    description: 'Contact model - mixed naming',
    fields: {
      snake_case: ['user_id', 'first_name', 'last_name', 'custom_fields', 'created_at', 'updated_at'],
      camelCase: ['organizationId', 'assignedTo', 'assignedAt', 'contactType', 'resumeUrl', 'linkedinUrl', 'githubUrl', 'experienceYears', 'salaryExpectation', 'currentEmployer', 'currentRole']
    }
  },
  
  'backend/models/Deal.js': {
    description: 'Deal model field mappings',
    fields: {
      snake_case: ['user_id', 'contact_id', 'stage_id', 'expected_close_date', 'actual_close_date', 'created_at', 'updated_at'],
      camelCase: ['organizationId', 'pipelineType']
    }
  },
  
  'backend/models/Stage.js': {
    description: 'Stage model field mappings',
    fields: {
      snake_case: ['user_id', 'is_active', 'pipeline_type', 'created_at', 'updated_at'],
      camelCase: []
    }
  },
  
  'backend/models/CustomField.js': {
    description: 'CustomField model field mappings',
    fields: {
      snake_case: ['user_id', 'entity_type', 'created_at', 'updated_at'],
      camelCase: []
    }
  },
  
  'backend/models/UserProfile.js': {
    description: 'UserProfile model field mappings',
    fields: {
      snake_case: ['user_id', 'first_name', 'last_name', 'company_name', 'profile_photo', 'company_logo', 'primary_color', 'crm_name', 'email_signature', 'nmls_id', 'state_licenses', 'created_at', 'updated_at'],
      camelCase: []
    }
  },
  
  'backend/models/Organization.js': {
    description: 'Organization model field mappings',
    fields: {
      snake_case: ['owner_id', 'is_active', 'max_users', 'created_at', 'updated_at'],
      camelCase: ['billingStatus', 'subscriptionTier']
    }
  },
  
  'backend/models/Automation.js': {
    description: 'Automation model field mappings',
    fields: {
      snake_case: ['user_id', 'trigger_type', 'trigger_conditions', 'is_active', 'last_run', 'created_at', 'updated_at'],
      camelCase: []
    }
  },
  
  'backend/models/AutomationStep.js': {
    description: 'AutomationStep model field mappings',
    fields: {
      snake_case: ['automation_id', 'step_type', 'step_config', 'wait_time', 'is_active', 'created_at', 'updated_at'],
      camelCase: []
    }
  },
  
  'backend/models/AutomationEnrollment.js': {
    description: 'AutomationEnrollment model field mappings',
    fields: {
      snake_case: ['automation_id', 'contact_id', 'user_id', 'enrolled_at', 'completed_at', 'current_step', 'next_step_at', 'created_at', 'updated_at'],
      camelCase: []
    }
  },
  
  'backend/models/AutomationLog.js': {
    description: 'AutomationLog model field mappings',
    fields: {
      snake_case: ['automation_id', 'user_id', 'trigger_type', 'contact_id', 'executed_at', 'created_at', 'updated_at'],
      camelCase: []
    }
  },
  
  'backend/models/EmailSend.js': {
    description: 'EmailSend model field mappings',
    fields: {
      snake_case: ['user_id', 'contact_id', 'template_id', 'sent_at', 'message_id', 'created_at', 'updated_at'],
      camelCase: []
    }
  },
  
  'backend/models/EmailEvent.js': {
    description: 'EmailEvent model field mappings',
    fields: {
      snake_case: ['email_send_id', 'event_type', 'event_data', 'occurred_at', 'created_at', 'updated_at'],
      camelCase: []
    }
  },
  
  'backend/models/EmailLink.js': {
    description: 'EmailLink model field mappings',
    fields: {
      snake_case: ['email_send_id', 'original_url', 'tracking_id', 'click_count', 'first_clicked_at', 'last_clicked_at', 'created_at', 'updated_at'],
      camelCase: []
    }
  },
  
  'backend/models/EmailSuppression.js': {
    description: 'EmailSuppression model field mappings',
    fields: {
      snake_case: ['user_id', 'suppression_type', 'suppressed_at', 'created_at', 'updated_at'],
      camelCase: []
    }
  },
  
  'backend/models/Note.js': {
    description: 'Note model field mappings',
    fields: {
      snake_case: ['user_id', 'contact_id', 'deal_id', 'created_at', 'updated_at'],
      camelCase: []
    }
  },
  
  'backend/models/Position.js': {
    description: 'Position model field mappings',
    fields: {
      snake_case: ['user_id', 'is_active', 'created_at', 'updated_at'],
      camelCase: ['requiredSkills', 'preferredSkills', 'compensationRange']
    }
  },
  
  'backend/models/RecruitingPipeline.js': {
    description: 'RecruitingPipeline model field mappings',
    fields: {
      snake_case: ['user_id', 'position_id', 'candidate_id', 'stage_id', 'applied_at', 'rejected_at', 'hired_at', 'created_at', 'updated_at'],
      camelCase: []
    }
  }
};

console.log('=== COMPREHENSIVE MODEL FIX PLAN ===\n');
console.log('This script will analyze and report all models that need field mapping fixes.\n');

Object.entries(modelFixes).forEach(([modelPath, info]) => {
  console.log(`\n${info.description}`);
  console.log(`File: ${modelPath}`);
  console.log('Snake_case fields that need explicit mapping:');
  info.fields.snake_case.forEach(field => {
    console.log(`  - ${field} -> field: '${field}'`);
  });
  console.log('CamelCase fields that need protection from auto-conversion:');
  info.fields.camelCase.forEach(field => {
    console.log(`  - ${field} -> field: '${field}'`);
  });
});

console.log('\n=== SUMMARY ===');
console.log(`Total models to fix: ${Object.keys(modelFixes).length}`);
console.log('\nThe fix involves adding explicit field mappings to prevent Sequelize\'s');
console.log('underscored: true setting from auto-converting field names incorrectly.\n');
console.log('Next step: Run the actual fix script to apply these changes.');