import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  apiRegister,
  apiLogin,
  apiLogout,
  apiGetMe,
  apiGoogleLogin,
  apiVerifyEmail,
  apiResendVerification,
  apiExtendSession,
} from '../../api/authApi';
import { ERROR_MESSAGES } from '../../constants';
import { getRejectedMessage } from '../../utils/apiError';
import { clearStrategyDriftAlertDismissal } from '../../utils/strategyDriftAlertStorage';
import { clearTickerChatSession } from '../../utils/tickerChatSession';
import type { AuthState, LoginCredentials, RegisterCredentials } from '../../types/auth.types';

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  pendingVerificationEmail: null,
  infoMessage: null,
};

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (credentials: RegisterCredentials, { rejectWithValue }) => {
    try {
      return await apiRegister(credentials);
    } catch (error) {
      return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.AUTH_REGISTER_FAILED));
    }
  }
);

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      return await apiLogin(credentials);
    } catch (error) {
      return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.AUTH_LOGIN_FAILED));
    }
  }
);

export const googleLoginThunk = createAsyncThunk(
  'auth/googleLogin',
  async (idToken: string, { rejectWithValue }) => {
    try {
      return await apiGoogleLogin(idToken);
    } catch (error) {
      return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.AUTH_GOOGLE_LOGIN_FAILED));
    }
  }
);

export const verifyEmailThunk = createAsyncThunk(
  'auth/verifyEmail',
  async (token: string, { rejectWithValue }) => {
    try {
      return await apiVerifyEmail(token);
    } catch (error) {
      return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.AUTH_VERIFY_EMAIL_FAILED));
    }
  }
);

export const resendVerificationThunk = createAsyncThunk(
  'auth/resendVerification',
  async (email: string, { rejectWithValue }) => {
    try {
      return await apiResendVerification(email);
    } catch (error) {
      return rejectWithValue(
        getRejectedMessage(error, ERROR_MESSAGES.AUTH_RESEND_VERIFICATION_FAILED)
      );
    }
  }
);

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  clearStrategyDriftAlertDismissal();
  clearTickerChatSession();
  try {
    await apiLogout();
  } catch {
    // Cookie may already be expired; still clear the SPA session below.
  }
});

export const fetchCurrentUserThunk = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      return await apiGetMe();
    } catch {
      return rejectWithValue(null);
    }
  }
);

export const extendSessionThunk = createAsyncThunk(
  'auth/extendSession',
  async (_, { rejectWithValue }) => {
    try {
      return await apiExtendSession();
    } catch {
      return rejectWithValue(null);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    clearAuthInfoMessage(state) {
      state.infoMessage = null;
    },
    expireSession(state) {
      state.user = null;
      state.isInitialized = true;
      state.pendingVerificationEmail = null;
      state.infoMessage = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.infoMessage = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.pendingVerificationEmail = action.payload.email;
        state.infoMessage = action.payload.message;
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isInitialized = true;
        state.pendingVerificationEmail = null;
        state.infoMessage = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(googleLoginThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(googleLoginThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isInitialized = true;
        state.pendingVerificationEmail = null;
        state.infoMessage = null;
      })
      .addCase(googleLoginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(verifyEmailThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyEmailThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isInitialized = true;
        state.pendingVerificationEmail = null;
        state.infoMessage = 'Email verified. Welcome to Krepton.';
      })
      .addCase(verifyEmailThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(resendVerificationThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resendVerificationThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.infoMessage = action.payload.message;
      })
      .addCase(resendVerificationThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.isInitialized = true;
        state.pendingVerificationEmail = null;
        state.infoMessage = null;
        state.error = null;
      })
      .addCase(logoutThunk.rejected, (state) => {
        state.user = null;
        state.isInitialized = true;
        state.pendingVerificationEmail = null;
        state.infoMessage = null;
        state.error = null;
      })
      .addCase(fetchCurrentUserThunk.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isInitialized = true;
      })
      .addCase(fetchCurrentUserThunk.rejected, (state) => {
        state.user = null;
        state.isInitialized = true;
      })
      .addCase(extendSessionThunk.fulfilled, (state, action) => {
        if (state.user) {
          state.user.sessionExpiresAt = action.payload.sessionExpiresAt;
        }
      });
  },
});

export const { clearAuthError, clearAuthInfoMessage, expireSession } = authSlice.actions;
export const authReducer = authSlice.reducer;
