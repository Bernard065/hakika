import express, { Router } from 'express';
import { 
    userRegistration, 
    verifyRegistration, 
    resendRegistrationOtp,
    userLogin 
} from '../controllers/auth.controller';

const router: Router = express.Router();

// Apply rate limiter to all auth routes
router.use(authEndpointLimiter);

/**
 * @route   POST /api/auth/register
 * @desc    Initiate user registration - sends OTP to email
 * @access  Public
 * @body    { name, email, password, userType, phoneNumber?, country? }
 */
router.post('/register', userRegistration);

/**
 * @route   POST /api/auth/register/verify
 * @desc    Verify OTP and complete registration - creates user account
 * @access  Public
 * @body    { email, otp }
 */
router.post('/register/verify', verifyRegistration);

/**
 * @route   POST /api/auth/register/resend-otp
 * @desc    Resend OTP for pending registration
 * @access  Public
 * @body    { email }
 */
router.post('/register/resend-otp', resendRegistrationOtp);

/**
 * @route   POST /api/auth/login
 * @desc    Login user with email and password
 * @access  Public
 * @body    { email, password }
 */
router.post('/login', userLogin);

// ============================================
// TODO: Implement these additional routes
// ============================================

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset OTP
 * @access  Public
 * @body    { email }
 */
// router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using OTP
 * @access  Public
 * @body    { email, otp, newPassword }
 */
// router.post('/reset-password', resetPassword);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (clear tokens/sessions)
 * @access  Private (requires authentication)
 */
// router.post('/logout', authMiddleware, logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user details
 * @access  Private (requires authentication)
 */
// router.get('/me', authMiddleware, getCurrentUser);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (requires valid refresh token)
 */
// router.post('/refresh', refreshToken);

/**
 * @route   POST /api/auth/verify-email-resend
 * @desc    Resend verification email for unverified users
 * @access  Public
 * @body    { email }
 */
// router.post('/verify-email-resend', resendVerificationEmail);

export const authRoutes = router;
export default router;