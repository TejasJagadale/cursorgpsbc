// routes/order.routes.js
import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET all orders (role-based filtering)
router.get('/', authorize(['ADMIN', 'DEALER', 'USER', 'SUB_USER']), orderController.getAll);

// GET single order
router.get('/:id', authorize(['ADMIN', 'DEALER', 'USER', 'SUB_USER']), orderController.getById);

// CREATE order
router.post('/', authorize(['ADMIN', 'DEALER']), orderController.create);

// UPDATE order
router.patch('/:id', authorize(['ADMIN', 'DEALER']), orderController.update);

// DELETE order
router.delete('/:id', authorize(['ADMIN']), orderController.remove);

export default router;