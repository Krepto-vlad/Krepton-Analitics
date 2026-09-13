import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutList, Star, Upload, ArrowUp } from 'lucide-react';
import { useLivePollingScope } from '../../hooks/useLivePollingScope';
import type { LivePollingScope } from '../../features/livePolling/livePollingSlice';
import { PositionsPanel } from './components/PositionsPanel/PositionsPanel';
import { WatchlistPanel } from './components/WatchlistPanel/WatchlistPanel';
import { BrokerImporterPanel } from './components/BrokerImporterPanel/BrokerImporterPanel';
import styles from './PortfolioPage.module.scss';

type PortfolioSection = 'positions' | 'watchlist' | 'importer';

interface SubNavItem {
  id: PortfolioSection;
  label: string;
  icon: React.ReactNode;
}

const SUB_NAV_ITEMS: SubNavItem[] = [
  { id: 'positions', label: 'Your Positions', icon: <LayoutList size={15} /> },
  { id: 'watchlist', label: 'Watchlist', icon: <Star size={15} /> },
  { id: 'importer', label: 'Add holdings', icon: <Upload size={15} /> },
];

const PANEL_MAP: Record<PortfolioSection, React.ReactNode> = {
  positions: <PositionsPanel />,
  watchlist: <WatchlistPanel />,
  importer: <BrokerImporterPanel />,
};

const SCROLL_TO_TOP_THRESHOLD_PX = 320;

function parsePortfolioSection(value: string | null): PortfolioSection {
  if (value === 'watchlist' || value === 'importer') return value;
  return 'positions';
}

export function PortfolioPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = parsePortfolioSection(searchParams.get('section'));
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);

  const activePollingScope = useMemo<LivePollingScope | null>(() => {
    if (activeSection === 'positions') return 'holdings';
    if (activeSection === 'watchlist') return 'watchlist';
    return null;
  }, [activeSection]);

  useLivePollingScope(activePollingScope);

  useEffect(() => {
    const scrollContainer = mainContentRef.current;
    if (!scrollContainer) return;

    const handleScroll = (): void => {
      setShowScrollToTop(scrollContainer.scrollTop > SCROLL_TO_TOP_THRESHOLD_PX);
    };

    handleScroll();
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [activeSection]);

  function handleScrollToTop() {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSectionChange(section: PortfolioSection) {
    setSearchParams({ section }, { replace: true });
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }

  return (
    <div className={styles.page}>
      <nav className={styles.subSidebar}>
        <div className={styles.subSidebarHeader}>
          <p className={styles.subSidebarTitle}>Portfolio</p>
          <p className={styles.subSidebarSubtitle}>Manage your investments</p>
        </div>

        <ul className={styles.subNav}>
          {SUB_NAV_ITEMS.map((navItem) => (
            <li key={navItem.id}>
              <button
                className={`${styles.subNavItem} ${activeSection === navItem.id ? styles.subNavItemActive : ''}`}
                onClick={() => handleSectionChange(navItem.id)}
              >
                <span className={styles.subNavIcon}>{navItem.icon}</span>
                <span className={styles.subNavLabel}>{navItem.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main ref={mainContentRef} className={styles.mainContent}>
        <div className={styles.contentWrapper}>{PANEL_MAP[activeSection]}</div>

        <button
          type="button"
          className={`${styles.scrollToTopButton} ${showScrollToTop ? styles.scrollToTopButtonVisible : ''}`}
          onClick={handleScrollToTop}
          aria-label="Scroll to top"
          title="Back to top"
        >
          <ArrowUp size={18} />
        </button>
      </main>
    </div>
  );
}
