/**
 * PushSubscription Model
 *
 * Stores Web Push notification subscriptions for users.
 * Each user can have multiple subscriptions (one per device/browser).
 *
 * The subscription data comes from the browser's PushManager API:
 * - endpoint: Unique URL identifying the subscription
 * - keys.p256dh: Public key for encrypting messages
 * - keys.auth: Authentication secret for secure delivery
 */

module.exports = (sequelize, DataTypes) => {
  const PushSubscription = sequelize.define('PushSubscription', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    endpoint: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        isUrl: true
      },
      comment: 'Push service endpoint URL'
    },
    p256dh: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      },
      comment: 'Public key for message encryption'
    },
    auth: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      },
      comment: 'Authentication secret for encryption'
    },
    deviceType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'device_type',
      comment: 'Device type: ios, android, desktop, etc.'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent',
      comment: 'Browser/device user agent string'
    }
  }, {
    tableName: 'push_subscriptions',
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        unique: true,
        fields: ['endpoint']
      }
    ]
  });

  /**
   * Convert to web-push format
   * Returns an object that can be passed to web-push.sendNotification()
   */
  PushSubscription.prototype.toWebPushFormat = function() {
    return {
      endpoint: this.endpoint,
      keys: {
        p256dh: this.p256dh,
        auth: this.auth
      }
    };
  };

  return PushSubscription;
};
