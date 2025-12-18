export interface ErrorResponse {
  status: 'fail' | 'error';
  message: string;
  details?: string;
  stack?: string;
  error?: Error;
}