// import { License } from '../models/License.js';
// import { createCrudController } from '../utils/createCrudController.js';

// export const licenseController = createCrudController(License, {
//   populate: ['packageId', 'dealerId', 'userId', 'activatedBy'],
//   filterableFields: ['dealerId', 'userId', 'packageId', 'status'],
//   ownerScopes: {
//     DEALER: 'dealerId',
//     USER: 'userId',
//   },
// });


// controllers/license.controller.js
import { License } from '../models/License.js';
import { Order } from '../models/Order.js';
import { createCrudController } from '../utils/createCrudController.js';
import mongoose from 'mongoose';

// Helper function to generate sequential order number
async function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prefix = `ORD-${year}${month}${day}`;
  
  const lastOrder = await Order.findOne({
    orderNumber: { $regex: `^${prefix}` }
  }).sort({ orderNumber: -1 });
  
  let sequence = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNumber.slice(-4));
    sequence = lastSeq + 1;
  }
  
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

export const licenseController = createCrudController(License, {
  populate: ['dealerId', 'userId', 'packageId', 'activatedBy'],
  searchableFields: ['licenseKey'],
  filterableFields: ['dealerId', 'userId', 'packageId', 'status'],
  ownerScopes: {
    DEALER: 'dealerId',
    USER: 'dealerId',
  },
  afterCreate: async (document, req) => {
    console.log('=== LICENSE AFTER CREATE HOOK ===');
    console.log('Document:', document);
    
    try {
      // Check if this is a user activation
      if (document.userId) {
        // Create order for user activation
        const orderData = {
          dealerId: document.dealerId,
          userId: document.userId,
          orderType: 'USER_ACTIVATION',
          licenseId: document._id,
          packageId: document.packageId,
          amount: 0, // Amount may come from package
          paymentMode: req.body.paymentMode || 'ONLINE',
          transactionReference: req.body.transactionReference || '',
          paymentStatus: 'COMPLETED',
          orderStatus: 'COMPLETED',
          description: `User Activation: License for user ${document.userId}`,
          notes: req.body.notes || 'License activation for user',
          createdBy: req.user?._id || document.activatedBy,
        };
        
        // Get package price if available
        if (document.packageId) {
          const Package = mongoose.model('LicensePackage');
          const pkg = await Package.findById(document.packageId);
          if (pkg) {
            orderData.amount = pkg.price || 0;
            orderData.description = `User Activation: ${pkg.packageName} - ${pkg.packageCode}`;
          }
        }
        
        // Generate order number
        const orderNumber = await generateOrderNumber();
        orderData.orderNumber = orderNumber;
        
        console.log('Creating order with data:', orderData);
        
        const order = await Order.create(orderData);
        console.log('Order created:', order._id);
        
        return order;
      }
    } catch (error) {
      console.error('Error creating order for license activation:', error);
      // Don't fail the license creation if order creation fails
    }
  },
});