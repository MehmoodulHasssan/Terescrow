import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';
import ApiResponse from '../utils/ApiResponse';
import { validationResult } from 'express-validator';
import { PrismaClient, User } from '@prisma/client';
import {
  comparePassword,
  generateOTP,
  generateToken,
  sendVerificationEmail,
} from '../utils/authUtils';

const prisma = new PrismaClient();

// import { User, UserRole } from '../models/User';
// import { DriverStatus, Driver } from '../models/Driver';
// import { comparePassword, generateToken } from '../utils/authUtils';
// import { Types } from 'mongoose';

const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw ApiError.badRequest(
        'Please enter valid credentials',
        errors.array()
      );
    }
    const { email, password }: { email: string; password: string } = req.body;
    const isUser = await prisma.user.findUnique({ where: { email } });
    if (!isUser) {
      throw ApiError.badRequest('This email is not registerd');
    }
    const isMatch = await comparePassword(password, isUser.password);
    if (!isMatch) {
      throw ApiError.badRequest('Your password is not correct');
    }
    const token = generateToken(isUser.id, isUser.username, isUser.role);
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });
    return new ApiResponse(200, isUser, 'User logged in successfully').send(
      res
    );
  } catch (error) {
    console.log(error);
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(ApiError.internal('Internal Server Error'));
  }
};

const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw ApiError.badRequest(
        'Please enter valid credentials',
        errors.array()
      );
    }
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      username,
      gender,
      country,
      role,
    }: UserRequest = req.body;

    const isUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (isUser) {
      throw ApiError.badRequest('This email is already registerd');
    }

    const newUser = await prisma.user.create({
      data: {
        firstname: firstName,
        lastname: lastName,
        email,
        phoneNumber,
        password,
        username,
        gender,
        country,
        role,
      },
    });

    if (!newUser) {
      throw ApiError.internal('User creation Failed');
    }

    const otp = generateOTP(4);

    const userOTP = await prisma.userOTP.create({
      data: {
        userId: newUser.id,
        otp,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      },
    });

    if (!userOTP) {
      await prisma.user.delete({
        where: {
          username: newUser.username,
        },
      });
      throw ApiError.internal('User OTP creation Failed');
    }
    await sendVerificationEmail(email, otp);
    const token = generateToken(newUser.id, newUser.username, newUser.role);
    res.cookie('token', token, {
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
    });
    return new ApiResponse(200, newUser, 'User created successfully').send(res);
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(ApiError.internal('Internal Server Error'));
  }
};

const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.clearCookie('token');
    return new ApiResponse(200, null, 'User logged out successfully').send(res);
  } catch (error) {
    next(error);
  }
};

const verifyUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user: User = req.body._user;
    const otp: string = req.body.otp;

    const userOTP = await prisma.userOTP.findUnique({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
    });

    if (!userOTP) {
      throw ApiError.badRequest('User not found');
    }
    if (userOTP.otp !== otp) {
      await prisma.userOTP.update({
        where: {
          userId: user.id,
        },
        data: {
          attempts: { increment: 1 },
        },
      });
      throw ApiError.badRequest('Invalid OTP');
    }
    const updateUser = prisma.user.upsert({
      where: {
        id: user.id,
      },
      update: {
        isVerified: true,
      },
      create: {
        ...user,
      },
    });

    if (!updateUser) {
      throw ApiError.internal('User verification Failed!');
    }
    return new ApiResponse(200, updateUser, 'User Verified Successfully.');
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(ApiError.internal('Internal Server Error!'));
  }
};

const resendOtpController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user: User = req.body._user;

    // Generate new OTP
    const newOtp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    // Update or create OTP in UserOTP table
    await prisma.userOTP.upsert({
      where: { userId: user.id },
      update: {
        otp: newOtp,
        expiresAt,
        attempts: 0, // Reset the attempt count on OTP resend
      },
      create: {
        userId: user.id,
        otp: newOtp,
        expiresAt,
        attempts: 0,
      },
    });

    // Send the OTP to user's email
    await sendVerificationEmail(user.email, newOtp);

    return new ApiResponse(200, null, 'OTP has been resent to your email.');
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(ApiError.internal('Internal Server Error!'));
  }
};

export {
  loginController,
  registerController,
  logoutController,
  verifyUserController,
  resendOtpController,
};

//interfaces

interface UserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  username: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER'; // Assuming an enum-like structure for gender
  country: string;
  role: 'ADMIN' | 'AGENT' | 'CUSTOMER';
}
