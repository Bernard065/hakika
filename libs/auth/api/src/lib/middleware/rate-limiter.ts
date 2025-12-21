import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/** 
 * This is a secondary defense layer that complements:
 * 1. API Gateway: 100 req/15min per IP (general protection)
 * 2. Redis Logic: Per-email cooldowns (60s), daily limits (10/day), 
 *    and verification attempts (3 max)
 * 
 * Purpose: Protect against gateway bypass and satisfy security scanning requirements
 */
export const authEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, 
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((req.rateLimit.resetTime ?? Date.now() + 15 * 60 * 1000) / 1000)
    });
  }
});