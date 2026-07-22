export const userController = createCrudController(User, {
  select: '-password',
  populate: ['dealerId', 'parentId', 'referredByUserId', 'createdBy'],
  searchableFields: ['name', 'username', 'email', 'phoneNumber'],
  filterableFields: ['role', 'dealerId', 'parentId', 'status', 'occupation'],
  ownerScopes: {
    DEALER: 'dealerId',
    USER: 'parentId',
  },
  transformCreate: async (body, req) => {
    // Hash password if provided
    if (body.password) {
      body.password = await hashPassword(body.password);
    }
    
    // If the current user is creating a sub-user (role: SUB_USER)
    if (req.user && body.role === 'SUB_USER') {
      // Set the referring user
      body.referredByUserId = req.user._id;
      
      // Set parentId to the current user (the one creating the sub-user)
      if (!body.parentId) {
        body.parentId = req.user._id;
      }
      
      // Set dealerId from the parent user if not provided
      if (!body.dealerId && req.user.dealerId) {
        body.dealerId = req.user.dealerId;
      }
    }
    
    // Set createdBy to the current user
    if (req.user) {
      body.createdBy = req.user._id;
    }
    
    return body;
  },
  transformUpdate: async (body, req) => {
    if (body.password) {
      body.password = await hashPassword(body.password);
    }
    return body;
  },
});