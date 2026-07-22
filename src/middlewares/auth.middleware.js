// middlewares/auth.middleware.js
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw ApiError.unauthorized('Authentication required');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+password');
    
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }
    
    // Check if user is active and approved
    if (user.status !== 'ACTIVE') {
      throw ApiError.forbidden('Your account is not active');
    }
    
    // For SUB_USER, check if they are approved
    if (user.role === 'SUB_USER' && user.approvalStatus !== 'APPROVED') {
      throw ApiError.forbidden('Your account is pending dealer approval');
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(ApiError.unauthorized('Invalid token'));
    } else {
      next(error);
    }
  }
};