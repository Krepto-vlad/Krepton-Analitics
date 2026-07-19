import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiRegister, apiLogin, apiLogout, apiGetMe } from '../../api/authApi';
import { ERROR_MESSAGES } from '../../constants';
import { getRejectedMessage } from '../../utils/apiError';
import type { AuthState, LoginCredentials, RegisterCredentials } from '../../types/auth.types';

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
  isInitialized: false,
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

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  await apiLogout();
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

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // register
      .addCase(registerThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // login
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // logout
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
      })
      // fetch current user (on app init)
      .addCase(fetchCurrentUserThunk.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isInitialized = true;
      })
      .addCase(fetchCurrentUserThunk.rejected, (state) => {
        state.user = null;
        state.isInitialized = true;
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export const authReducer = authSlice.reducer;
