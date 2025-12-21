export interface OtpCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
}
