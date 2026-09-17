import { useState, type ReactNode } from 'react';
import { AppSidebar } from '../AppSidebar/AppSidebar';
import { AppHeader } from '../AppHeader/AppHeader';
import { BeginnerTutorialHost } from '../../tutorial/BeginnerTutorialHost';
import { BeginnerTutorialProvider } from '../../tutorial/BeginnerTutorialContext';
import { useTheme } from '../../../hooks/useTheme';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { setCurrency } from '../../../features/ui/uiSlice';
import { usePortfolioCurrencyRefresh } from '../../../hooks/usePortfolioCurrencyRefresh';
import { BEGINNER_TUTORIAL_CLIP_ATTRIBUTE, type Currency } from '../../../constants';
import styles from './AppShell.module.scss';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const dispatch = useAppDispatch();
  const currency = useAppSelector((state) => state.ui.currency);

  usePortfolioCurrencyRefresh();

  const handleCurrencyChange = (newCurrency: Currency) => {
    dispatch(setCurrency(newCurrency));
  };

  return (
    <BeginnerTutorialProvider>
      <div className={`${styles.shell} ${isSidebarExpanded ? styles.sidebarExpanded : ''}`}>
        <AppSidebar onExpandedChange={setIsSidebarExpanded} />
        <div className={styles.mainArea}>
          <AppHeader
            currency={currency}
            onCurrencyChange={handleCurrencyChange}
            isSidebarExpanded={isSidebarExpanded}
            theme={theme}
            onThemeToggle={toggleTheme}
          />
          <main className={styles.content} {...{ [BEGINNER_TUTORIAL_CLIP_ATTRIBUTE]: '' }}>
            {children}
          </main>
        </div>
        <BeginnerTutorialHost />
      </div>
    </BeginnerTutorialProvider>
  );
}
