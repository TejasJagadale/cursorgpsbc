// controllers/order.controller.js
import { Order } from '../models/Order.js';
import { createCrudController } from '../utils/createCrudController.js';

export const orderController = createCrudController(Order, {
  populate: ['dealerId', 'userId', 'packageId', 'licenseId', 'createdBy'],
  searchableFields: ['orderNumber', 'transactionReference', 'description'],
  filterableFields: ['dealerId', 'userId', 'orderType', 'paymentStatus', 'orderStatus', 'status'],
  ownerScopes: {
    DEALER: 'dealerId',
    USER: 'dealerId', // USERs see orders for their dealer
    SUB_USER: 'dealerId', // SUB_USERs see orders for their dealer
  },
  transformCreate: async (body, req) => {
    // Set createdBy to current user
    if (req.user) {
      body.createdBy = req.user._id;
      
      // If user is DEALER, set dealerId to their ID
      if (req.user.role === 'DEALER') {
        body.dealerId = req.user._id;
      }
    }
    
    // Ensure dealerId is set
    if (!body.dealerId) {
      throw new Error('dealerId is required for orders');
    }
    
    return body;
  },
});