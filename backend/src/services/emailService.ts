import nodemailer from 'nodemailer';
import { env, isSmtpConfigured } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

function assertSmtpConfigured(): void {
  if (!isSmtpConfigured) {
    throw new AppError(
      503,
      'Email delivery is not configured. Please contact support or try again later.'
    );
  }
}

function createMailTransporter(): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPassword,
    },
  });
}

async function sendMail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
  failureMessage: string;
}): Promise<void> {
  assertSmtpConfigured();

  try {
    await createMailTransporter().sendMail({
      from: env.smtpFrom,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to send email');
    throw new AppError(503, params.failureMessage);
  }
}

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

function buildPasswordResetEmailBody(resetUrl: string): { text: string; html: string } {
  const text = [
    'Reset your Krepton Analytics password',
    '',
    'We received a request to reset your password. Open this link to choose a new password:',
    resetUrl,
    '',
    'This link expires in 1 hour.',
    'If you did not request a password reset, you can ignore this message.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827; max-width: 560px;">
      <h2 style="margin: 0 0 12px; font-size: 20px;">Reset your password</h2>
      <p style="margin: 0 0 16px;">
        We received a request to reset your Krepton Analytics password. Click the button below to
        choose a new one.
      </p>
      <p style="margin: 0 0 20px;">
        <a
          href="${resetUrl}"
          style="display: inline-block; padding: 12px 18px; background: #10b981; color: #041410; text-decoration: none; border-radius: 8px; font-weight: 700;"
        >
          Reset password
        </a>
      </p>
      <p style="margin: 0 0 8px; font-size: 13px; color: #4b5563;">
        Or paste this link into your browser:
      </p>
      <p style="margin: 0 0 16px; font-size: 13px; word-break: break-all;">
        <a href="${resetUrl}" style="color: #059669;">${resetUrl}</a>
      </p>
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        This link expires in 1 hour. If you did not request a reset, you can ignore this email.
      </p>
    </div>
  `;

  return { text, html };
}

function buildGoogleOnlySignInHintBody(): { text: string; html: string } {
  const text = [
    'Krepton Analytics sign-in',
    '',
    'This email is registered with Google sign-in and has no password reset link.',
    'Sign in with Google, then you can set a password in Profile if you want email/password login.',
    '',
    'If you did not request this, you can ignore this message.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827; max-width: 560px;">
      <h2 style="margin: 0 0 12px; font-size: 20px;">Sign in with Google</h2>
      <p style="margin: 0 0 16px;">
        This email is linked to Google sign-in. There is no password reset link for this account.
        Sign in with Google, then open Profile to set a password if you want email/password login.
      </p>
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        If you did not request this, you can ignore this email.
      </p>
    </div>
  `;

  return { text, html };
}

export async function sendEmailVerificationLink(
  email: string,
  verificationToken: string
): Promise<void> {
  const verificationUrl = `${env.frontendUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;
  const { text, html } = buildVerificationEmailBody(verificationUrl);

  await sendMail({
    to: email,
    subject: 'Verify your Krepton Analytics email',
    text,
    html,
    failureMessage: 'Unable to send verification email. Please try again later.',
  });
}

export async function sendPasswordResetLink(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${env.frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const { text, html } = buildPasswordResetEmailBody(resetUrl);

  await sendMail({
    to: email,
    subject: 'Reset your Krepton Analytics password',
    text,
    html,
    failureMessage: 'Unable to send password reset email. Please try again later.',
  });
}

export async function sendGoogleOnlySignInHint(email: string): Promise<void> {
  const { text, html } = buildGoogleOnlySignInHintBody();

  await sendMail({
    to: email,
    subject: 'Krepton Analytics sign-in help',
    text,
    html,
    failureMessage: 'Unable to send sign-in help email. Please try again later.',
  });
}
