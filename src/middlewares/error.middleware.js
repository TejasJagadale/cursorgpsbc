import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

function handleMongooseValidationError(err) {
  const errors = Object.values(err.errors).map((error) => ({
    field: error.path,
    message: error.message,
  }));

  return ApiError.badRequest('Validation failed', errors);
}

function handleDuplicateKeyError(err) {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  return ApiError.conflict(`${field} already exists`);
}

function handleCastError(err) {
  return ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
}

export function errorHandler(err, _req, res, _next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    if (error.name === 'ValidationError') {
      error = handleMongooseValidationError(error);
    } else if (error.code === 11000) {
      error = handleDuplicateKeyError(error);
    } else if (error instanceof mongoose.Error.CastError) {
      error = handleCastError(error);
    } else if (error.name === 'JsonWebTokenError') {
      error = ApiError.unauthorized('Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      error = ApiError.unauthorized('Token expired');
    } else {
      error = new ApiError(500, error.message || 'Internal server error');
    }
  }

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: error.message,
  };

  if (error.errors) {
    response.errors = error.errors;
  }

  if (env.nodeEnv === 'development' && statusCode === 500 && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
