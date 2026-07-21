import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/jwt.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Access token is required');
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  const user = await User.findById(decoded.id).select('-password');

  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  if (!user.canLogin || user.status !== 'ACTIVE') {
    throw ApiError.forbidden('Account is not allowed to login');
  }

  req.user = user;
  next();
});
