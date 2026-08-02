import nodemailer from 'nodemailer';
import { env, isSmtpConfigured } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

function buildVerificationEmailBody(verificationUrl: string): { text: string; html: string } {
  const text = [
    'Confirm your Krepton Analytics email',
    '',
    'Thanks for creating an account. Open this link to verify your email and activate sign-in:',
    verificationUrl,
    '',
    'This link expires in 24 hours.',
    'If you did not create a Krepton Analytics account, you can ignore this message.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827; max-width: 560px;">
      <h2 style="margin: 0 0 12px; font-size: 20px;">Confirm your email</h2>
      <p style="margin: 0 0 16px;">
        Thanks for creating a Krepton Analytics account. Click the button below to verify your email
        and activate sign-in.
      </p>
      <p style="margin: 0 0 20px;">
        <a
          href="${verificationUrl}"
          style="display: inline-block; padding: 12px 18px; background: #10b981; color: #041410; text-decoration: none; border-radius: 8px; font-weight: 700;"
        >
          Verify email
        </a>
      </p>
      <p style="margin: 0 0 8px; font-size: 13px; color: #4b5563;">
        Or paste this link into your browser:
      </p>
      <p style="margin: 0 0 16px; font-size: 13px; word-break: break-all;">
        <a href="${verificationUrl}" style="color: #059669;">${verificationUrl}</a>
      </p>
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        This link expires in 24 hours. If you did not create this account, you can ignore this email.
      </p>
    </div>
  `;

  return { text, html };
}

export async function sendEmailVerificationLink(
  email: string,
  verificationToken: string
): Promise<void> {
  if (!isSmtpConfigured) {
    throw new AppError(
      503,
      'Email delivery is not configured. Please contact support or try again later.'
    );
  }

  const verificationUrl = `${env.frontendUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;
  const { text, html } = buildVerificationEmailBody(verificationUrl);

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPassword,
    },
  });

  try {
    await transporter.sendMail({
      from: env.smtpFrom,
      to: email,
      subject: 'Verify your Krepton Analytics email',
      text,
      html,
    });
  } catch (error) {
    console.error('[EmailService] Failed to send verification email', error);
    throw new AppError(503, 'Unable to send verification email. Please try again later.');
  }
}
