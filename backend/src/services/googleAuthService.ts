import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { env, isGoogleAuthConfigured } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

export interface VerifiedGoogleIdentity {
  googleSub: string;
  email: string;
  emailVerified: boolean;
}

const googleOAuthClient = new OAuth2Client(env.googleClientId);

export async function verifyGoogleIdToken(idToken: unknown): Promise<VerifiedGoogleIdentity> {
  if (!isGoogleAuthConfigured) {
    throw new AppError(503, 'Google sign-in is not configured on the server.');
  }

  if (typeof idToken !== 'string' || idToken.trim().length === 0) {
    throw new AppError(400, 'Google ID token is required');
  }

  let payload: TokenPayload | undefined;

  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: idToken.trim(),
      audience: env.googleClientId,
    });
    payload = ticket.getPayload();
  } catch (error) {
    console.warn('[GoogleAuth] ID token verification failed', error);
    throw new AppError(401, 'Invalid Google credentials');
  }

  const googleSub = payload?.sub;
  const email = payload?.email?.trim().toLowerCase();
  const emailVerified = payload?.email_verified === true;

  if (!googleSub || !email) {
    throw new AppError(401, 'Google account email is required');
  }

  if (!emailVerified) {
    throw new AppError(401, 'Google account email is not verified');
  }

  return { googleSub, email, emailVerified };
}
