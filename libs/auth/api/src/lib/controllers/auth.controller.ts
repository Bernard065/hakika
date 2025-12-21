import { Request, Response, NextFunction } from 'express';
import { registerSchema, verifyOtpSchema, RegistrationInput } from '@hakika/shared-dto';
import { prisma, redis } from '@hakika/shared-data-access';
import { RateLimitError, ValidationError } from '@hakika/shared-utils';
import { SALT_ROUNDS, sendOtp, verifyOtp } from '@hakika/auth-domain';
import { AUTH_CONSTANTS } from '@hakika/auth-domain';
import bcrypt from 'bcrypt';


// Initiate Registration (Send OTP)
export const userRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedData = registerSchema.parse(req.body); 
        const { email, name } = validatedData;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return next(new ValidationError('An account with this email already exists.'));
        }

        // Store pending registration data in Redis (temporary, expires with OTP)
        const pendingKey = `${AUTH_CONSTANTS.REDIS_KEYS.OTP_PREFIX}pending:${email}`;
        await redis.set(
            pendingKey, 
            JSON.stringify(validatedData), 
            'EX', 
            AUTH_CONSTANTS.OTP.EXPIRY_SECONDS
        );

        // Send OTP
        await sendOtp(email, name);

        res.status(200).json({ 
            message: 'OTP sent to your email. Please verify to complete registration.',
            email 
        });

    } catch (error) {
        if (error instanceof Error) {
            // Handle rate limiting errors
            if (error.message.includes('wait') || error.message.includes('cooldown')) {
                return next(new RateLimitError(
                    error.message,
                    (error as Error & { retryAfter?: number }).retryAfter
                ));
            }
            // Handle daily limit errors
            if (error.message.includes('maximum') || error.message.includes('limit')) {
                return next(new RateLimitError(error.message));
            }
        }
        next(error);
    }
};

// Verify OTP and Complete Registration
export const verifyRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, otp } = verifyOtpSchema.parse(req.body);

        // Verify OTP first
        const isValid = await verifyOtp(email, otp);
        
        if (!isValid) {
            return next(new ValidationError('Invalid or expired OTP'));
        }

        // Retrieve pending registration data
        const pendingKey = `${AUTH_CONSTANTS.REDIS_KEYS.OTP_PREFIX}pending:${email}`;
        const pendingDataStr = await redis.get(pendingKey);
        
        if (!pendingDataStr) {
            return next(new ValidationError('Registration session expired. Please start over.'));
        }

        const registrationData: RegistrationInput = JSON.parse(pendingDataStr);

        // Check again if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            await redis.del(pendingKey);
            return next(new ValidationError('An account with this email already exists.'));
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(registrationData.password, SALT_ROUNDS);

        // Create user in database
        const newUser = await prisma.user.create({
            data: {
                email: registrationData.email,
                name: registrationData.name,
                password: hashedPassword,
                userType: registrationData.userType,
                isVerified: true, // Email verified via OTP
                // Add seller-specific fields if applicable
                ...(registrationData.userType === 'seller' && {
                    phoneNumber: registrationData.phoneNumber,
                    country: registrationData.country,
                }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                userType: true,
                createdAt: true,
            }
        });

        // Clean up pending data
        await redis.del(pendingKey);

        res.status(201).json({
            message: 'Registration successful! You can now log in.',
            user: newUser
        });

    } catch (error) {
        if (error instanceof Error && error.message.includes('OTP')) {
            return next(new ValidationError(error.message));
        }
        next(error);
    }
};

// Resend OTP during registration
export const resendRegistrationOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;

        if (!email) {
            return next(new ValidationError('Email is required'));
        }

        // Check if there's a pending registration
        const pendingKey = `${AUTH_CONSTANTS.REDIS_KEYS.OTP_PREFIX}pending:${email}`;
        const pendingData = await redis.get(pendingKey);

        if (!pendingData) {
            return next(new ValidationError('No pending registration found for this email'));
        }

        const registrationData: RegistrationInput = JSON.parse(pendingData);

        // Send new OTP
        await sendOtp(email, registrationData.name);

        // Refresh pending data expiry
        await redis.set(
            pendingKey, 
            pendingData, 
            'EX', 
            AUTH_CONSTANTS.OTP.EXPIRY_SECONDS
        );

        res.status(200).json({
            message: 'New OTP sent to your email'
        });

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('wait') || error.message.includes('limit')) {
                return next(new RateLimitError(error.message, (error as Error & { retryAfter?: number }).retryAfter));
            }
        }
        next(error);
    }
};

// Login endpoint 
export const userLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) {
            return next(new ValidationError('Invalid email or password'));
        }

        // Verify password exists 
        if (!user.password) {
            return next(new ValidationError('This account uses social login. Please sign in with your social provider.'));
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return next(new ValidationError('Invalid email or password'));
        }

        // Check if email is verified
        if (!user.isVerified) {
            return next(new ValidationError('Please verify your email before logging in'));
        }

        // TODO: Generate JWT token and set in cookie/header

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                userType: user.userType
            }
        });

    } catch (error) {
        next(error);
    }
};