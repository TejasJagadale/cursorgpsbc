import { body } from 'express-validator';

export const registerValidator = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role').optional().isIn(['ADMIN', 'DEALER', 'USER', 'PERSON']).withMessage('Invalid role'),
  body('email').optional().isEmail().withMessage('Invalid email'),
];

export const loginValidator = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];
