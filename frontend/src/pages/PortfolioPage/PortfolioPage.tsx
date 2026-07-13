import { useState, useRef, useEffect, useMemo } from 'react';
import { LayoutList, Star, Upload, CloudUpload, ArrowUp } from 'lucide-react';
import { Button } from '../../components/ui';
import { useLivePollingScope } from '../../hooks/useLivePollingScope';
import type { LivePollingScope } from '../../features/livePolling/livePollingSlice';
import { PositionsPanel } from './components/PositionsPanel/PositionsPanel';
import { WatchlistPanel } from './components/WatchlistPanel/WatchlistPanel';
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
  { id: 'importer', label: 'Broker Importer', icon: <Upload size={15} /> },
];

const SUPPORTED_BROKERS = [
  { name: 'Interactive Brokers', short: 'IB' },
  { name: 'Revolut', short: 'RV' },
  { name: 'Charles Schwab', short: 'CS' },
  { name: 'Fidelity', short: 'FI' },
  { name: 'eToro', short: 'ET' },
  { name: 'Trading 212', short: 'T2' },
];

function BrokerImporterPanel() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      setUploadedFile(droppedFile);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setUploadedFile(selectedFile);
    }
  }

  function handleBrowseClick() {
    fileInputRef.current?.click();
  }

  function handleClearFile() {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div className={styles.panelContent}>
      <div className={styles.panelHeader}>
        <div className={styles.panelHeaderIcon}>
          <Upload size={16} />
        </div>
        <div>
          <h2 className={styles.panelTitle}>Multi-Broker Report Importer</h2>
          <p className={styles.panelSubtitle}>
            Sync your brokerage statements from Interactive Brokers, Revolut, Charles Schwab and
            more
          </p>
        </div>
      </div>

      <div
        className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''} ${uploadedFile ? styles.dropZoneFilled : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className={styles.fileInput}
          onChange={handleFileChange}
        />

        {uploadedFile ? (
          <div className={styles.uploadedFile}>
            <div className={styles.uploadedFileIcon}>
              <Upload size={24} />
            </div>
            <p className={styles.uploadedFileName}>{uploadedFile.name}</p>
            <p className={styles.uploadedFileSize}>{(uploadedFile.size / 1024).toFixed(1)} KB</p>
            <div className={styles.uploadedFileActions}>
              <Button variant="primary" size="sm">
                Import Now
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClearFile}>
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.dropZoneContent}>
            <div className={styles.dropZoneIcon}>
              <CloudUpload size={28} />
            </div>
            <p className={styles.dropZoneText}>
              Drop broker statements here, or{' '}
              <button className={styles.browseLink} onClick={handleBrowseClick}>
                browse files
              </button>
            </p>
            <p className={styles.dropZoneHint}>
              Accepts: .xlsx &middot; .xls &middot; .csv &middot; Max 50 MB
            </p>
          </div>
        )}
      </div>

      <div className={styles.supportedBrokers}>
        <p className={styles.supportedBrokersLabel}>Supported brokers</p>
        <div className={styles.brokersList}>
          {SUPPORTED_BROKERS.map((broker) => (
            <div key={broker.name} className={styles.brokerBadge}>
              <span className={styles.brokerShort}>{broker.short}</span>
              <span className={styles.brokerName}>{broker.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const PANEL_MAP: Record<PortfolioSection, React.ReactNode> = {
  positions: <PositionsPanel />,
  watchlist: <WatchlistPanel />,
  importer: <BrokerImporterPanel />,
};

const SCROLL_TO_TOP_THRESHOLD_PX = 320;

export function PortfolioPage() {
  const [activeSection, setActiveSection] = useState<PortfolioSection>('positions');
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
    setActiveSection(section);
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
