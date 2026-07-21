import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { User } from './src/models/User.js';
import { hashPassword } from './src/utils/password.js';
import {
  UserRole,
  EntityStatus,
} from './src/constants/enums.js';

dotenv.config();

const seedUser = async () => {
  try {
    await mongoose.connect("mongodb+srv://tejasjagadale25:VAkZVPbnRFlzjgQs@cluster0.dlnzepm.mongodb.net/gps_tracking");

    console.log('Connected to MongoDB');

    // Change the username if you don't want to overwrite an existing one
    const username = 'admin';

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      console.log('User already exists');
      process.exit(0);
    }

    const user = await User.create({
      role: UserRole.ADMIN,
      username: username,
      password: await hashPassword('Admin@123'),
      name: 'System Administrator',
      email: 'admin@example.com',
      phoneNumber: '9876543210',
      status: EntityStatus.ACTIVE,
      canLogin: true,
      createdBy: null,
    });

    console.log('User created successfully');
    console.log({
      id: user._id,
      username: user.username,
      password: 'Admin@123',
    });

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedUser();