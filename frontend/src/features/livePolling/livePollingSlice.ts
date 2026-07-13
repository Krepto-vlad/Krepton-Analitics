import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type LivePollingScope = 'watchlist' | 'holdings';

export interface LivePollingState {
  scopes: Record<LivePollingScope, number>;
}

const initialState: LivePollingState = {
  scopes: {
    watchlist: 0,
    holdings: 0,
  },
};

function isScopeActive(state: LivePollingState, scope: LivePollingScope): boolean {
  return state.scopes[scope] > 0;
}

const livePollingSlice = createSlice({
  name: 'livePolling',
  initialState,
  reducers: {
    activateLivePollingScope: (state, action: PayloadAction<LivePollingScope>) => {
      state.scopes[action.payload] += 1;
    },
    deactivateLivePollingScope: (state, action: PayloadAction<LivePollingScope>) => {
      state.scopes[action.payload] = Math.max(0, state.scopes[action.payload] - 1);
    },
  },
});

export const { activateLivePollingScope, deactivateLivePollingScope } = livePollingSlice.actions;
export const livePollingReducer = livePollingSlice.reducer;

export function selectIsLivePollingScopeActive(
  state: { livePolling: LivePollingState },
  scope: LivePollingScope
): boolean {
  return isScopeActive(state.livePolling, scope);
}
