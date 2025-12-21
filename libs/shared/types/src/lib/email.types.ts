export interface EmailOptions {
  to: string;
  subject: string;
  templateName: string;
  data: Record<string, unknown>;
  from?: string;
  replyTo?: string;
}