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

// Add the authorize middleware
export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    
    // If roles array is empty, allow all authenticated users
    if (roles.length === 0) {
      return next();
    }
    
    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Access denied. Required roles: ${roles.join(', ')}`));
    }
    
    next();
  };
};

// Optional: Add convenience functions for specific role checks
export const isAdmin = authorize(['ADMIN']);
export const isDealer = authorize(['DEALER']);
export const isUser = authorize(['USER', 'ADMIN', 'DEALER']);