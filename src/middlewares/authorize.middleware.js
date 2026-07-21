import { ApiError } from '../utils/ApiError.js';

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }

    next();
  };
}
