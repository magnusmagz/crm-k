const { User } = require('../models');

/**
 * Middleware to check if the authenticated user is a super admin
 * Must be used after authMiddleware
 */
const requireSuperAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check if user has super admin privileges
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ 
        error: 'Super admin access required',
        code: 'SUPER_ADMIN_REQUIRED'
      });
    }

    // Log super admin action for audit trail
    console.log(`🔐 Super admin action: ${req.user.email} ${req.method} ${req.path}`, {
      userId: req.user.id,
      email: req.user.email,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    next();
  } catch (error) {
    console.error('Super admin middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware to check if user is super admin OR organization admin
 * Provides flexibility for organization-level admin features
 */
const requireAdminAccess = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check if user has super admin OR organization admin privileges
    if (!req.user.isSuperAdmin && !req.user.isAdmin) {
      return res.status(403).json({ 
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }

    // Add admin level to request for downstream use
    req.adminLevel = req.user.isSuperAdmin ? 'super' : 'organization';

    next();
  } catch (error) {
    console.error('Admin access middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware to load super admin context and add helper methods
 * Enriches req object with super admin utilities
 */
const loadSuperAdminContext = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isSuperAdmin) {
      return next();
    }

    // Add helper methods for super admin operations
    req.superAdmin = {
      // Check if super admin can perform action on organization
      canAccessOrganization: (organizationId) => {
        // Super admin can access all organizations
        return true;
      },

      // Get organizations scope (super admin sees all)
      getOrganizationScope: () => {
        return null; // null means no restriction
      },

      // Log super admin action with context
      logAction: (action, details = {}) => {
        console.log(`🔐 Super Admin Action: ${action}`, {
          userId: req.user.id,
          email: req.user.email,
          action,
          details,
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      },

      // Check if impersonating another user
      isImpersonating: () => {
        return !!req.session?.impersonating;
      },

      // Get original user if impersonating
      getOriginalUser: () => {
        return req.session?.originalUser;
      }
    };

    next();
  } catch (error) {
    console.error('Super admin context middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware for organization data scoping
 * Automatically restricts data to user's organization unless super admin
 */
const applyScopeMiddleware = (req, res, next) => {
  try {
    if (req.user?.isSuperAdmin) {
      // Super admin sees all data - no scope restriction
      req.organizationScope = null;
    } else if (req.user?.organizationId) {
      // Regular user sees only their organization's data
      req.organizationScope = req.user.organizationId;
    } else {
      // User without organization can't see any data
      return res.status(403).json({
        error: 'User not associated with any organization',
        code: 'NO_ORGANIZATION'
      });
    }

    next();
  } catch (error) {
    console.error('Scope middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  requireSuperAdmin,
  requireAdminAccess,
  loadSuperAdminContext,
  applyScopeMiddleware
};