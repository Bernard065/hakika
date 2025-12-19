import crypto from 'crypto';
import { redis } from '@hakika/shared-data-access';
import { AUTH_CONSTANTS } from './constants';
import { sendEmail } from '@hakika/shared-utils';

export const checkOtpRestrictions = async (email: string) => {
    const cooldownKey = `${AUTH_CONSTANTS.REDIS_KEYS.COOLDOWN_PREFIX}${email}`;
    const cooldown = await redis.get(cooldownKey);
    
    if (cooldown) {
        throw new Error(AUTH_CONSTANTS.MESSAGES.COOLDOWN);
    }

    const dailyKey = `${AUTH_CONSTANTS.REDIS_KEYS.DAILY_COUNT_PREFIX}${email}`;
    const attempts = await redis.get(dailyKey);
    
    if (attempts && parseInt(attempts) > AUTH_CONSTANTS.OTP.DAILY_LIMIT) {
        throw new Error(AUTH_CONSTANTS.MESSAGES.DAILY_LIMIT);
    }
};

export const sendOtp = async (email: string, name: string, template: string) => {
    const max = Math.pow(10, AUTH_CONSTANTS.OTP.LENGTH) - 1;
    const min = Math.pow(10, AUTH_CONSTANTS.OTP.LENGTH - 1);
    const otp = crypto.randomInt(min, max).toString();

    const otpKey = `${AUTH_CONSTANTS.REDIS_KEYS.OTP_PREFIX}${email}`;
    const cooldownKey = `${AUTH_CONSTANTS.REDIS_KEYS.COOLDOWN_PREFIX}${email}`;
    const dailyKey = `${AUTH_CONSTANTS.REDIS_KEYS.DAILY_COUNT_PREFIX}${email}`;

    await sendEmail(email, 'Your OTP Code', template, { name, otp });

    await redis.set(otpKey, otp, 'EX', AUTH_CONSTANTS.OTP.EXPIRY_SECONDS);
    await redis.set(cooldownKey, '1', 'EX', AUTH_CONSTANTS.OTP.COOLDOWN_SECONDS);

    await redis.incr(dailyKey);
    const currentCount = await redis.get(dailyKey);
    if (currentCount === '1') {
        await redis.expire(dailyKey, 86400); 
    }

    return otp;
};

export const verifyOtp = async (email: string, inputOtp: string): Promise<boolean> => {
    const otpKey = `${AUTH_CONSTANTS.REDIS_KEYS.OTP_PREFIX}${email}`;
    const failureKey = `${AUTH_CONSTANTS.REDIS_KEYS.FAILURE_PREFIX}${email}`;

    const storedOtp = await redis.get(otpKey);
    if (!storedOtp) {
        throw new Error(AUTH_CONSTANTS.MESSAGES.EXPIRED);
    }

    const currentFailures = await redis.get(failureKey);
    if (currentFailures && parseInt(currentFailures) >= AUTH_CONSTANTS.OTP.MAX_ATTEMPTS) {
        await redis.del(otpKey); 
        throw new Error(AUTH_CONSTANTS.MESSAGES.MAX_FAILURES);
    }

    if (storedOtp !== inputOtp) {
        const newCount = await redis.incr(failureKey);

        if (newCount === 1) {
            await redis.expire(failureKey, AUTH_CONSTANTS.OTP.EXPIRY_SECONDS);
        }

        if (newCount >= AUTH_CONSTANTS.OTP.MAX_ATTEMPTS) {
            await redis.del(otpKey); 
            throw new Error(AUTH_CONSTANTS.MESSAGES.MAX_FAILURES);
        }

        const remaining = AUTH_CONSTANTS.OTP.MAX_ATTEMPTS - newCount;
        throw new Error(`${AUTH_CONSTANTS.MESSAGES.INVALID} You have ${remaining} attempts remaining.`);
    }

    await redis.del(otpKey);       
    await redis.del(failureKey);   
    
    return true;
};