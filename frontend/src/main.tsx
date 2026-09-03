import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { registerUnauthorizedHandler } from './api/unauthorizedSession';
import { expireClientSession } from './features/auth/expireClientSession';
import { store } from './store';
import App from './app/App';
import './styles/index.scss';

registerUnauthorizedHandler(() => {
  if (!store.getState().auth.user) {
    return;
  }
  expireClientSession(store.dispatch);
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found in DOM');

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
