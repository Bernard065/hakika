import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    service: process.env.SMTP_SERVICE, 
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const emailTemplate = async (templateName: string, data: Record<string, unknown>): Promise<string> => {
    const templatePath = path.join(
        process.cwd(),
        'apps/auth-service/src/assets/templates', 
        `${templateName}.ejs`
    );
    
    return ejs.renderFile(templatePath, data);
};

export const sendEmail = async (
    to: string,
    subject: string,
    templateName: string,
    data: Record<string, unknown>
): Promise<void> => {
    try {
        const html = await emailTemplate(templateName, data);

        await transporter.sendMail({
            from: process.env.SMTP_USER, 
            to,
            subject,
            html,
        });

        console.log(`Email sent to ${to}`);
        return;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
}