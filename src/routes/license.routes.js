// routes/license.routes.js
import { Router } from 'express';
import { licenseController } from '../controllers/license.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET all licenses with order data
router.get('/', authorize(['ADMIN', 'DEALER', 'USER', 'SUB_USER']), licenseController.getAll);

// GET single license with order data
router.get('/:id', authorize(['ADMIN', 'DEALER', 'USER', 'SUB_USER']), licenseController.getById);

// CREATE license
router.post('/', authorize(['ADMIN', 'DEALER']), licenseController.create);

// UPDATE license
router.patch('/:id', authorize(['ADMIN', 'DEALER']), licenseController.update);

// DELETE license
router.delete('/:id', authorize(['ADMIN']), licenseController.remove);

export default router;