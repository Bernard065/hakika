import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '@hakika/shared-types';
import { AppError } from './error-handler.js';

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  // Default values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: string | undefined = undefined;
  let isOperational = false;

  // If it's our custom known error
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
    isOperational = err.isOperational;
  } else {
    console.error('CRITICAL ERROR:', err);
  }

  // Construct the response
  const response: ErrorResponse = {
    status: isOperational ? 'fail' : 'error', 
    message: message,
  };

  // In Development: Send everything (stack trace + details)
  if (process.env.NODE_ENV === 'development') {
    response.details = details;
    response.stack = err.stack;
    response.error = err; 
  }
  
  // In Production: Only send details if it's an operational (trusted) error
  else if (process.env.NODE_ENV === 'production' && isOperational) {
    if (details) response.details = details;
  }

  // In Production with Unknown Error: Keep it generic (already set to 'Internal Server Error')
  
  return res.status(statusCode).json(response);
}