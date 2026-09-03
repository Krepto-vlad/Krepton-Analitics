import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Currency, Theme } from '../../constants';
import { resolveInitialTheme } from '../../utils/theme';

interface UiState {
  currency: Currency;
  theme: Theme;
}

const initialState: UiState = {
  currency: 'USD',
  theme: resolveInitialTheme(),
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setCurrency(state, action: PayloadAction<Currency>) {
      state.currency = action.payload;
    },
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },
  },
});

export const { setCurrency, setTheme, toggleTheme } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
