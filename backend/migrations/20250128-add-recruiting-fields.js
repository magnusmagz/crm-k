'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add recruiting fields to contacts table
    await queryInterface.addColumn('contacts', 'resumeUrl', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('contacts', 'linkedinUrl', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('contacts', 'githubUrl', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('contacts', 'skills', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      defaultValue: [],
      allowNull: false
    });

    await queryInterface.addColumn('contacts', 'experienceYears', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn('contacts', 'salaryExpectation', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {}
    });

    await queryInterface.addColumn('contacts', 'availability', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('contacts', 'currentEmployer', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('contacts', 'currentRole', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Add pipelineType to stages table
    await queryInterface.addColumn('stages', 'pipelineType', {
      type: Sequelize.ENUM('sales', 'recruiting'),
      defaultValue: 'sales',
      allowNull: false
    });

    // Create positions table
    await queryInterface.createTable('positions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        field: 'user_id'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      department: {
        type: Sequelize.STRING,
        allowNull: true
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true
      },
      type: {
        type: Sequelize.ENUM('full-time', 'part-time', 'contract', 'internship'),
        defaultValue: 'full-time',
        allowNull: false
      },
      remote: {
        type: Sequelize.ENUM('onsite', 'remote', 'hybrid'),
        defaultValue: 'onsite',
        allowNull: false
      },
      salaryRange: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      requirements: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('open', 'closed', 'on-hold'),
        defaultValue: 'open',
        allowNull: false
      },
      customFields: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false,
        field: 'custom_fields'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at'
      }
    });

    // Create recruiting_pipeline table
    await queryInterface.createTable('recruiting_pipeline', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        field: 'user_id'
      },
      candidateId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'contacts',
          key: 'id'
        },
        onDelete: 'CASCADE',
        field: 'candidate_id'
      },
      positionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'positions',
          key: 'id'
        },
        onDelete: 'CASCADE',
        field: 'position_id'
      },
      stageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'stages',
          key: 'id'
        },
        field: 'stage_id'
      },
      status: {
        type: Sequelize.ENUM('active', 'hired', 'rejected', 'withdrawn'),
        defaultValue: 'active',
        allowNull: false
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5
        }
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      interviewDate: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'interview_date'
      },
      offerDetails: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        field: 'offer_details'
      },
      rejectionReason: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'rejection_reason'
      },
      appliedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
        field: 'applied_at'
      },
      hiredAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'hired_at'
      },
      customFields: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false,
        field: 'custom_fields'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at'
      }
    });

    // Add indexes
    await queryInterface.addIndex('positions', ['user_id']);
    await queryInterface.addIndex('positions', ['status']);
    await queryInterface.addIndex('positions', ['title']);
    await queryInterface.addIndex('recruiting_pipeline', ['user_id']);
    await queryInterface.addIndex('recruiting_pipeline', ['candidate_id']);
    await queryInterface.addIndex('recruiting_pipeline', ['position_id']);
    await queryInterface.addIndex('recruiting_pipeline', ['stage_id']);
    await queryInterface.addIndex('recruiting_pipeline', ['status']);
    await queryInterface.addIndex('contacts', ['skills'], {
      using: 'gin'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('contacts', ['skills']);
    await queryInterface.removeIndex('recruiting_pipeline', ['status']);
    await queryInterface.removeIndex('recruiting_pipeline', ['stage_id']);
    await queryInterface.removeIndex('recruiting_pipeline', ['position_id']);
    await queryInterface.removeIndex('recruiting_pipeline', ['candidate_id']);
    await queryInterface.removeIndex('recruiting_pipeline', ['user_id']);
    await queryInterface.removeIndex('positions', ['title']);
    await queryInterface.removeIndex('positions', ['status']);
    await queryInterface.removeIndex('positions', ['user_id']);

    // Drop tables
    await queryInterface.dropTable('recruiting_pipeline');
    await queryInterface.dropTable('positions');

    // Remove columns from contacts
    await queryInterface.removeColumn('contacts', 'resumeUrl');
    await queryInterface.removeColumn('contacts', 'linkedinUrl');
    await queryInterface.removeColumn('contacts', 'githubUrl');
    await queryInterface.removeColumn('contacts', 'skills');
    await queryInterface.removeColumn('contacts', 'experienceYears');
    await queryInterface.removeColumn('contacts', 'salaryExpectation');
    await queryInterface.removeColumn('contacts', 'availability');
    await queryInterface.removeColumn('contacts', 'currentEmployer');
    await queryInterface.removeColumn('contacts', 'currentRole');

    // Remove column from stages
    await queryInterface.removeColumn('stages', 'pipelineType');

    // Remove ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_stages_pipelineType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_positions_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_positions_remote";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_positions_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_recruiting_pipeline_status";');
  }
};