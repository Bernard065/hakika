export const AUTH_CONSTANTS = {
  OTP: {
    EXPIRY_SECONDS: 300,      // 5 Minutes
    COOLDOWN_SECONDS: 60,     // 1 Minute
    DAILY_LIMIT: 10,          // Max OTP requests per day
    LENGTH: 6,                // OTP length
    MAX_ATTEMPTS: 3,          // Max failed verification attempts
  },
  
  REDIS_KEYS: {
    OTP_PREFIX: 'otp:',
    COOLDOWN_PREFIX: 'otp_cooldown:',
    DAILY_COUNT_PREFIX: 'otp_daily_attempts:',
    FAILURE_PREFIX: 'otp_failures:',
  },
  
  MESSAGES: {
    // Restriction Messages
    COOLDOWN: 'Please wait 1 minute before requesting another OTP.',
    DAILY_LIMIT: 'You have reached the maximum OTP requests for today.',
    
    // Verification Messages
    INVALID: 'Invalid OTP. Please try again.',
    EXPIRED: 'OTP has expired or does not exist.',
    MAX_FAILURES: 'Too many failed attempts. This OTP has been invalidated.',
    SUCCESS: 'OTP verified successfully.',
    
    // Service Messages
    EMAIL_SEND_FAILED: 'Failed to send OTP email. Please try again.',
    SERVICE_UNAVAILABLE: 'OTP service temporarily unavailable. Please try again.',
  },
  
  // Template names
  TEMPLATES: {
    OTP: 'otp-template',
    WELCOME: 'welcome-email',
    PASSWORD_RESET: 'password-reset',
  }
} as const;

export const SALT_ROUNDS = 10;

// Type-safe access to constants
export type AuthConstants = typeof AUTH_CONSTANTS;