import { z } from 'zod';

const emailRule = z.string().email({ message: 'Invalid email address' });
const passwordRule = z.string().min(6, { message: 'Password must be at least 6 characters' });
const nameRule = z.string().min(2, { message: 'Name must be at least 2 characters' });

// Base Fields (Shared by everyone)
const baseAuth = z.object({
  name: nameRule,
  email: emailRule,
  password: passwordRule,
});

// User Schema
const userSchema = baseAuth.extend({
  userType: z.literal('user'), // This is the "Discriminator"
});

// Seller Schema
const sellerSchema = baseAuth.extend({
  userType: z.literal('seller'), // This is the "Discriminator"
  phoneNumber: z.string().min(10, { message: 'Valid phone number is required for sellers' }),
  country: z.string().min(2, { message: 'Country is required for sellers' }),
});

// The Main Registration Schema
// Zod will check 'userType' first to decide which rules to apply
export const registerSchema = z.discriminatedUnion('userType', [
  userSchema,
  sellerSchema,
]);

// Export Types
export type RegistrationInput = z.infer<typeof registerSchema>;