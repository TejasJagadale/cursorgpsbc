import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../utils/jwt.js';
import { comparePassword, hashPassword } from '../utils/password.js';

export const authController = {
  register: asyncHandler(async (req, res) => {
    const { username, password, ...rest } = req.body;

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      throw ApiError.conflict('Username already exists');
    }

    const user = await User.create({
      ...rest,
      username,
      password: await hashPassword(password),
      createdBy: req.user?._id || null,
    });

    const safeUser = await User.findById(user._id).select('-password');

    res.status(201).json(ApiResponse.success(safeUser, 'User registered successfully'));
  }),

  login: asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      throw ApiError.unauthorized('Invalid username or password');
    }

    if (!user.canLogin || user.status !== 'ACTIVE') {
      throw ApiError.forbidden('Account is not allowed to login');
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      throw ApiError.unauthorized('Invalid username or password');
    }

    const token = signToken({
      id: user._id,
      role: user.role,
      dealerId: user.dealerId,
    });

    const safeUser = user.toObject();
    delete safeUser.password;

    res.json(
      ApiResponse.success(
        {
          user: safeUser,
          token,
        },
        'Login successful'
      )
    );
  }),

  getProfile: asyncHandler(async (req, res) => {
    res.json(ApiResponse.success(req.user));
  }),
};
