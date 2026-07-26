// backend/routes/reportsRoutes.js
import { Router } from 'express';
import { getLicenseSummary, getLicenseTrend, getVehicleStatusSummary } from '../controllers/reportsController.js';
// Adjust these two imports to match your actual auth middleware file names/paths.
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = Router();

// All three are read-only aggregates; ADMIN sees everything (no dealerId/ownerUserId
// filter passed from the frontend), DEALER passes its own dealerId, USER passes its
// own ownerUserId. The controller trusts whatever scope query params it's given, so
// enforce that a DEALER/USER can only ever request their own scope here if you don't
// already do that in `protect`/`authorizeRoles`.
router.get('/license-summary', protect, authorizeRoles('ADMIN', 'DEALER'), getLicenseSummary);
router.get('/license-trend', protect, authorizeRoles('ADMIN', 'DEALER'), getLicenseTrend);
router.get('/vehicle-status', protect, authorizeRoles('ADMIN', 'DEALER', 'USER'), getVehicleStatusSummary);

export default router;

// In your main app/router file:
//   import reportsRoutes from './routes/reportsRoutes.js';
//   app.use('/api/reports', reportsRoutes);