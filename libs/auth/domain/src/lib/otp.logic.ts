import crypto from 'crypto';
import { redis } from '@hakika/shared-data-access';
import { sendEmail } from '@hakika/shared-utils';
import { AUTH_CONSTANTS } from './constants';
import { OtpCheckResult } from '@hakika/shared-types';

// Generate cryptographically secure OTP 
const generateOtp = (length: number): string => {
  const max = Math.pow(10, length) - 1;
  const min = Math.pow(10, length - 1);
  
  let otp: string;
  do {
    otp = crypto.randomInt(min, max + 1).toString();
  } while (otp.length !== length);
  
  return otp;
};

 // Check if user can request an OTP
export const checkOtpRestrictions = async (
  email: string
): Promise<OtpCheckResult> => {
  try {
    // Check cooldown
    const cooldownKey = `${AUTH_CONSTANTS.REDIS_KEYS.COOLDOWN_PREFIX}${email}`;
    const cooldownTtl = await redis.ttl(cooldownKey);
    
    if (cooldownTtl > 0) {
      return { 
        allowed: false, 
        reason: AUTH_CONSTANTS.MESSAGES.COOLDOWN,
        retryAfter: cooldownTtl
      };
    }

    // Check daily limit
    const dailyKey = `${AUTH_CONSTANTS.REDIS_KEYS.DAILY_COUNT_PREFIX}${email}`;
    const attempts = await redis.get(dailyKey);
    
    if (attempts && parseInt(attempts) >= AUTH_CONSTANTS.OTP.DAILY_LIMIT) {
      return { 
        allowed: false, 
        reason: AUTH_CONSTANTS.MESSAGES.DAILY_LIMIT 
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[checkOtpRestrictions] Redis error:', error);
    throw new Error(AUTH_CONSTANTS.MESSAGES.SERVICE_UNAVAILABLE);
  }
};

// Send OTP to user's email
export const sendOtp = async (
  email: string, 
  name: string, 
  template: string = AUTH_CONSTANTS.TEMPLATES.OTP
): Promise<void> => {
  // Check restrictions first
  const check = await checkOtpRestrictions(email);
  if (!check.allowed) {
    const error = new Error(check.reason) as Error & { retryAfter?: number };
    error.retryAfter = check.retryAfter;
    throw error;
  }

  const otp = generateOtp(AUTH_CONSTANTS.OTP.LENGTH);

  const otpKey = `${AUTH_CONSTANTS.REDIS_KEYS.OTP_PREFIX}${email}`;
  const cooldownKey = `${AUTH_CONSTANTS.REDIS_KEYS.COOLDOWN_PREFIX}${email}`;
  const dailyKey = `${AUTH_CONSTANTS.REDIS_KEYS.DAILY_COUNT_PREFIX}${email}`;

  try {
    // Send email FIRST - if this fails, we don't update Redis
    await sendEmail(email, 'Your OTP Code', template, { name, otp });

    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Store OTP
    pipeline.set(otpKey, otp, 'EX', AUTH_CONSTANTS.OTP.EXPIRY_SECONDS);
    
    // Set cooldown
    pipeline.set(cooldownKey, '1', 'EX', AUTH_CONSTANTS.OTP.COOLDOWN_SECONDS);
    
    // Increment daily counter atomically
    pipeline.incr(dailyKey);
    pipeline.expire(dailyKey, 86400, 'NX'); 
    
    await pipeline.exec();

  console.log('[sendOtp] OTP sent successfully to %s', email);
  } catch (error) {
    console.error('[sendOtp] Failed for %s:', email, error);

    
    // If email failed, don't update Redis - let user retry
    if (error instanceof Error && error.message.includes('Failed to send email')) {
      throw new Error(AUTH_CONSTANTS.MESSAGES.EMAIL_SEND_FAILED);
    }
    
    // For Redis errors after email sent, we have a problem
    // The user has the OTP but we couldn't store it
    throw new Error(AUTH_CONSTANTS.MESSAGES.SERVICE_UNAVAILABLE);
  }
};

// Verify the provided OTP
export const verifyOtp = async (
  email: string, 
  inputOtp: string
): Promise<boolean> => {
  // Basic validation
  if (!inputOtp || inputOtp.length !== AUTH_CONSTANTS.OTP.LENGTH) {
    throw new Error('Invalid OTP format');
  }

  const otpKey = `${AUTH_CONSTANTS.REDIS_KEYS.OTP_PREFIX}${email}`;
  const failureKey = `${AUTH_CONSTANTS.REDIS_KEYS.FAILURE_PREFIX}${email}`;

  try {
    // Get both values in parallel
    const [storedOtp, currentFailures] = await Promise.all([
      redis.get(otpKey),
      redis.get(failureKey)
    ]);

    // Check if OTP exists
    if (!storedOtp) {
      throw new Error(AUTH_CONSTANTS.MESSAGES.EXPIRED);
    }

    // Check if already exceeded max attempts
    const failures = currentFailures ? parseInt(currentFailures) : 0;
    if (failures >= AUTH_CONSTANTS.OTP.MAX_ATTEMPTS) {
      await redis.del(otpKey);
      throw new Error(AUTH_CONSTANTS.MESSAGES.MAX_FAILURES);
    }

    // Verify OTP
    if (storedOtp !== inputOtp) {
      // Use pipeline for atomic failure tracking
      const pipeline = redis.pipeline();
      pipeline.incr(failureKey);
      pipeline.expire(failureKey, AUTH_CONSTANTS.OTP.EXPIRY_SECONDS, 'NX');
      
      const results = await pipeline.exec();
      const newCount = results?.[0]?.[1] as number || failures + 1;

      // If max attempts reached, invalidate OTP
      if (newCount >= AUTH_CONSTANTS.OTP.MAX_ATTEMPTS) {
        await redis.del(otpKey);
        throw new Error(AUTH_CONSTANTS.MESSAGES.MAX_FAILURES);
      }

      const remaining = AUTH_CONSTANTS.OTP.MAX_ATTEMPTS - newCount;
      throw new Error(
        `${AUTH_CONSTANTS.MESSAGES.INVALID} You have ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
      );
    }

    // Success - cleanup atomically
    await Promise.all([
      redis.del(otpKey),
      redis.del(failureKey)
    ]);

    console.log('[verifyOtp] OTP verified successfully for %s', email);

    return true;
  } catch (error) {
    // Re-throw known errors
    if (error instanceof Error && error.message.includes('OTP')) {
      throw error;
    }
    
    // Redis or other system errors
    console.error('[verifyOtp] System error:', error);
    throw new Error(AUTH_CONSTANTS.MESSAGES.SERVICE_UNAVAILABLE);
  }
};

// Clear all OTP-related data for a user (for testing or cleanup)
export const clearOtpData = async (email: string): Promise<void> => {
  const keys = [
    `${AUTH_CONSTANTS.REDIS_KEYS.OTP_PREFIX}${email}`,
    `${AUTH_CONSTANTS.REDIS_KEYS.COOLDOWN_PREFIX}${email}`,
    `${AUTH_CONSTANTS.REDIS_KEYS.DAILY_COUNT_PREFIX}${email}`,
    `${AUTH_CONSTANTS.REDIS_KEYS.FAILURE_PREFIX}${email}`,
  ];

  try {
    await Promise.all(keys.map(key => redis.del(key)));
    console.log(`[clearOtpData] Cleared OTP data for ${email}`);
  } catch (error) {
    console.error('[clearOtpData] Error:', error);
    throw new Error('Failed to clear OTP data');
  }
};

// Get OTP status for a user (for debugging/admin)
export const getOtpStatus = async (email: string): Promise<{
  hasActiveOtp: boolean;
  cooldownRemaining: number;
  dailyAttemptsUsed: number;
  failedAttempts: number;
}> => {
  const otpKey = `${AUTH_CONSTANTS.REDIS_KEYS.OTP_PREFIX}${email}`;
  const cooldownKey = `${AUTH_CONSTANTS.REDIS_KEYS.COOLDOWN_PREFIX}${email}`;
  const dailyKey = `${AUTH_CONSTANTS.REDIS_KEYS.DAILY_COUNT_PREFIX}${email}`;
  const failureKey = `${AUTH_CONSTANTS.REDIS_KEYS.FAILURE_PREFIX}${email}`;

  try {
    const [hasOtp, cooldownTtl, dailyCount, failures] = await Promise.all([
      redis.exists(otpKey),
      redis.ttl(cooldownKey),
      redis.get(dailyKey),
      redis.get(failureKey)
    ]);

    return {
      hasActiveOtp: hasOtp === 1,
      cooldownRemaining: Math.max(0, cooldownTtl),
      dailyAttemptsUsed: dailyCount ? parseInt(dailyCount) : 0,
      failedAttempts: failures ? parseInt(failures) : 0
    };
  } catch (error) {
    console.error('[getOtpStatus] Error:', error);
    throw new Error('Failed to get OTP status');
  }
};