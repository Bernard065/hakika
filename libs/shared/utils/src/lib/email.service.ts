import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import { EmailOptions } from '@hakika/shared-types';


const TEMPLATE_BASE_PATH = process.env.EMAIL_TEMPLATE_PATH || 
  path.join(process.cwd(), 'apps/auth-service/src/assets/templates');

// Create transporter with validation
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  // Validate required environment variables
  if (!config.auth.user || !config.auth.pass) {
    throw new Error('SMTP credentials not configured');
  }

  return nodemailer.createTransport(config);
};

const transporter = createTransporter();

// Verify transporter connection on startup
if (process.env.NODE_ENV !== 'test') {
  transporter.verify((error) => {
    if (error) {
      console.error('[Email Service] SMTP connection failed:', error);
    } else {
      console.log('[Email Service] SMTP connection verified');
    }
  });
}

// Render email template
const emailTemplate = async (
  templateName: string,
  data: Record<string, unknown>
): Promise<string> => {
  const templatePath = path.join(TEMPLATE_BASE_PATH, `${templateName}.ejs`);

  try {
    return await ejs.renderFile(templatePath, {
      ...data,
      currentYear: new Date().getFullYear(), 
    });
  } catch (error) {
    console.error('[Email Template] Render failed:', error);
    throw new Error(`Failed to render email template: ${templateName}`);
  }
};

// Send email using template
export const sendEmail = async (
  to: string,
  subject: string,
  templateName: string,
  data: Record<string, unknown>
): Promise<void> => {
  try {
    // Render template
    const html = await emailTemplate(templateName, data);

    // Send email
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER || process.env.SMTP_FROM,
      to,
      subject,
      html,
    });

    console.log(`[Email Service] Email sent to ${to}, messageId: ${info.messageId}`);
  } catch (error) {
    console.error('[Email Service] Send failed:', error);

    if (error instanceof Error) {
      if (error.message.includes('authentication') || error.message.includes('Invalid login')) {
        throw new Error('Email service authentication failed');
      }

      if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        throw new Error('Email service unavailable');
      }

      if (error.message.includes('Invalid recipient') || error.message.includes('No recipients')) {
        throw new Error('Invalid email address');
      }
    }

    throw new Error('Failed to send email');
  }
};

/**
 * Send email with advanced options
 * Useful for custom from addresses, reply-to, etc.
 */
export const sendEmailAdvanced = async (options: EmailOptions): Promise<void> => {
  try {
    const html = await emailTemplate(options.templateName, options.data);

    await transporter.sendMail({
      from: options.from || process.env.SMTP_USER,
      to: options.to,
      replyTo: options.replyTo,
      subject: options.subject,
      html,
    });

    console.log(`[Email Service] Advanced email sent to ${options.to}`);
  } catch (error) {
    console.error('[Email Service] Advanced send failed:', error);
    throw new Error('Failed to send email');
  }
};


// Send bulk emais
export const sendBulkEmails = async (
  emails: EmailOptions[]
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const email of emails) {
    try {
      await sendEmailAdvanced(email);
      success++;
    } catch (error) {
      console.error(`[Email Service] Bulk email failed for ${email.to}:`, error);
      failed++;
    }
  }

  console.log(`[Email Service] Bulk send complete: ${success} success, ${failed} failed`);
  return { success, failed };
};