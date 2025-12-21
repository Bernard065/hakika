import { z } from 'zod';

// Shared Validation Rules

const emailRule = z.string().email({ message: 'Invalid email address' });
const passwordRule = z.string().min(6, { message: 'Password must be at least 6 characters' });
const nameRule = z.string().min(2, { message: 'Name must be at least 2 characters' });

// Registration Schemas

const baseAuth = z.object({
  name: nameRule,
  email: emailRule,
  password: passwordRule,
});

const userSchema = baseAuth.extend({
  userType: z.literal('user'),
});

const sellerSchema = baseAuth.extend({
  userType: z.literal('seller'),
  phoneNumber: z.string().min(10, { message: 'Valid phone number is required for sellers' }),
  country: z.string().min(2, { message: 'Country is required for sellers' }),
});

export const registerSchema = z.discriminatedUnion('userType', [
  userSchema,
  sellerSchema,
]);

export type RegistrationInput = z.infer<typeof registerSchema>;

// OTP Schemas

const otpRule = z
  .string()
  .length(6, { message: 'OTP must be exactly 6 digits' })
  .regex(/^\d+$/, { message: 'OTP must contain only digits' });

// Template name validation (alphanumeric, hyphens, underscores only)
const templateRule = z
  .string()
  .min(1, { message: 'Template name is required' })
  .regex(/^[a-zA-Z0-9_-]+$/, { 
    message: 'Template name can only contain letters, numbers, hyphens, and underscores' 
  });

// Request OTP Schema
export const requestOtpSchema = z.object({
  email: emailRule,
  name: nameRule.optional(), 
  template: templateRule.optional().default('otp-template'),
});

// Verify OTP Schema
export const verifyOtpSchema = z.object({
  email: emailRule,
  otp: otpRule,
});

// Login Schema
export const loginSchema = z.object({
  email: emailRule,
  password: passwordRule,
});

// Forgot Password Schema
export const forgotPasswordSchema = z.object({
  email: emailRule,
});

// Reset Password Schema
export const resetPasswordSchema = z.object({
  email: emailRule,
  otp: otpRule,
  newPassword: passwordRule,
});

// Export Types
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;