import nodemailer from 'nodemailer';
import { env, isSmtpConfigured } from '../config/env.js';

function buildVerificationEmailBody(verificationUrl: string): { text: string; html: string } {
  const text = [
    'Confirm your Krepton Analytics email',
    '',
    'Open this link to verify your account:',
    verificationUrl,
    '',
    'This link expires in 24 hours. If you did not create an account, ignore this email.',
  ].join('\n');

  const html = `
    <p><strong>Confirm your Krepton Analytics email</strong></p>
    <p><a href="${verificationUrl}">Verify my email</a></p>
    <p>This link expires in 24 hours. If you did not create an account, ignore this email.</p>
  `;

  return { text, html };
}

export async function sendEmailVerificationLink(
  email: string,
  verificationToken: string
): Promise<void> {
  const verificationUrl = `${env.frontendUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;
  const { text, html } = buildVerificationEmailBody(verificationUrl);

  if (!isSmtpConfigured) {
    console.info('[EmailService] SMTP not configured. Verification link for local development:');
    console.info(`[EmailService] to=${email} url=${verificationUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPassword,
    },
  });

  await transporter.sendMail({
    from: env.smtpFrom,
    to: email,
    subject: 'Verify your Krepton Analytics email',
    text,
    html,
  });
}
