// middlewares/role.middleware.js
//
// Restricts a route to specific roles. Must run AFTER `authenticate`
// (from auth.middleware.js), since it relies on `req.user` already being
// set. Usage:
//
//   import { authenticate } from '../middlewares/auth.middleware.js';
//   import { authorizeRoles } from '../middlewares/role.middleware.js';
//
//   router.get('/license-summary', authorizeRoles('ADMIN', 'DEALER'), getLicenseSummary);
//
// (routes/index.js already applies `authenticate` globally before any of
// this router's routes are reached, so it doesn't need to be repeated here.)

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
      });
    }

    next();
  };
}