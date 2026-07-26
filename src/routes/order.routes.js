// routes/order.routes.js
import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { getPagination } from '../utils/pagination.js';
import { Order } from '../models/Order.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Custom route for getting orders by user/dealer
router.get('/my-orders', authorize(['ADMIN', 'DEALER', 'USER', 'SUB_USER']), async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    
    if (req.user.role === 'ADMIN') {
      // Admin sees all orders
    } else if (req.user.role === 'DEALER') {
      filter.dealerId = req.user._id;
    } else if (req.user.role === 'USER' || req.user.role === 'SUB_USER') {
      // For USER and SUB_USER, show orders for their dealer
      const dealerId = req.user.dealerId?._id || req.user.dealerId;
      if (dealerId) {
        filter.dealerId = dealerId;
      }
      // Also show orders specifically for this user
      filter.$or = [
        { userId: req.user._id },
        { dealerId: dealerId }
      ];
    }
    
    const orders = await Order.find(filter)
      .populate('dealerId userId packageId licenseId createdBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Order.countDocuments(filter);
    
    res.json({
      success: true,
      data: orders,
      meta: { page, limit, total }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Use CRUD routes
router.get('/', authorize(['ADMIN', 'DEALER']), orderController.getAll);
router.get('/:id', authorize(['ADMIN', 'DEALER']), orderController.getById);
router.post('/', authorize(['ADMIN', 'DEALER']), orderController.create);
router.patch('/:id', authorize(['ADMIN', 'DEALER']), orderController.update);
router.delete('/:id', authorize(['ADMIN']), orderController.remove);

export default router;