import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Currency } from '../../constants';

interface UiState {
  currency: Currency;
}

const initialState: UiState = {
  currency: 'USD',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setCurrency(state, action: PayloadAction<Currency>) {
      state.currency = action.payload;
    },
  },
});

export const { setCurrency } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
