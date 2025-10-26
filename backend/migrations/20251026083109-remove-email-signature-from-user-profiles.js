'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('user_profiles', 'email_signature');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('user_profiles', 'email_signature', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {
        enabled: false,
        layout: 'modern',
        includePhoto: true,
        includeLogo: true,
        includeSocial: true,
        photoUrl: null,
        logoUrl: null,
        fields: {
          name: { show: true, value: '' },
          title: { show: true, value: '' },
          email: { show: true, value: '' },
          phone: { show: true, value: '' },
          company: { show: true, value: '' },
          address: { show: true, value: '' }
        },
        social: {
          linkedin: { show: false, url: '' },
          twitter: { show: false, url: '' },
          facebook: { show: false, url: '' },
          instagram: { show: false, url: '' },
          website: { show: false, url: '' }
        },
        style: {
          primaryColor: '#1f2937',
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          spacing: 'normal',
          dividerStyle: 'none'
        },
        customHtml: null
      },
      comment: 'Email signature configuration and content'
    });
  }
};
