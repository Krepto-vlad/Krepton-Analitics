import { store } from '../index';

describe('store', () => {
  it('exposes the combined application reducers', () => {
    const state = store.getState();
    expect(state.auth).toBeDefined();
    expect(state.portfolio).toBeDefined();
    expect(state.watchlist).toBeDefined();
    expect(state.livePolling).toBeDefined();
    expect(state.ticker).toBeDefined();
    expect(state.ui).toBeDefined();
  });
});
