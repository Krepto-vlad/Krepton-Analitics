import { AppRouter } from '../router/AppRouter';
import { ThemeSync } from '../components/ThemeSync/ThemeSync';
import { AppErrorBoundary } from './AppErrorBoundary';

export default function App() {
  return (
    <AppErrorBoundary>
      <ThemeSync />
      <AppRouter />
    </AppErrorBoundary>
  );
}
