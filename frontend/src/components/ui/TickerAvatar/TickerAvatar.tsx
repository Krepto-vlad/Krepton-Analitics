import { useMemo, useState } from 'react';
import { FMP_STOCK_LOGO_URL_TEMPLATE } from '../../../constants';
import styles from './TickerAvatar.module.scss';

interface TickerAvatarProps {
  ticker: string;
  logoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

interface LogoLoadState {
  sourceKey: string;
  candidateIndex: number;
  hasFailedLastCandidate: boolean;
}

const SIZE_CLASS_BY_NAME = {
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  md: styles.sizeMd,
} as const;

function getTickerInitials(ticker: string): string {
  const compactTicker = ticker.replace(/[^A-Za-z0-9]/g, '');
  return (compactTicker || ticker).slice(0, 2).toUpperCase();
}

function buildFmpStockLogoUrl(ticker: string): string {
  return FMP_STOCK_LOGO_URL_TEMPLATE.replace('{ticker}', encodeURIComponent(ticker));
}

function canUseFmpStockLogoFallback(ticker: string): boolean {
  // Futures like GC=F are not covered by the FMP equity logo CDN.
  return !ticker.includes('=');
}

function buildLogoCandidates(ticker: string, logoUrl: string | null): string[] {
  const candidates: string[] = [];

  if (logoUrl && logoUrl.trim().length > 0) {
    candidates.push(logoUrl.trim());
  }

  if (canUseFmpStockLogoFallback(ticker)) {
    const fmpLogoUrl = buildFmpStockLogoUrl(ticker.toUpperCase());
    if (!candidates.includes(fmpLogoUrl)) {
      candidates.push(fmpLogoUrl);
    }
  }

  return candidates;
}

function buildLogoSourceKey(ticker: string, logoUrl: string | null): string {
  return `${ticker}::${logoUrl ?? ''}`;
}

export function TickerAvatar({
  ticker,
  logoUrl = null,
  size = 'md',
  className,
}: TickerAvatarProps) {
  const logoCandidates = useMemo(() => buildLogoCandidates(ticker, logoUrl), [ticker, logoUrl]);
  const logoSourceKey = buildLogoSourceKey(ticker, logoUrl);
  const [loadState, setLoadState] = useState<LogoLoadState>(() => ({
    sourceKey: logoSourceKey,
    candidateIndex: 0,
    hasFailedLastCandidate: false,
  }));

  // Reset fallback chain when ticker/logo identity changes (React-recommended render-time adjust).
  if (loadState.sourceKey !== logoSourceKey) {
    setLoadState({
      sourceKey: logoSourceKey,
      candidateIndex: 0,
      hasFailedLastCandidate: false,
    });
  }

  const activeCandidateIndex = loadState.sourceKey === logoSourceKey ? loadState.candidateIndex : 0;
  const hasFailedLastCandidate =
    loadState.sourceKey === logoSourceKey ? loadState.hasFailedLastCandidate : false;
  const activeLogoUrl = logoCandidates[activeCandidateIndex] ?? null;
  const shouldRenderImage = activeLogoUrl !== null && !hasFailedLastCandidate;

  const rootClassName = [styles.avatar, SIZE_CLASS_BY_NAME[size], className]
    .filter(Boolean)
    .join(' ');

  function handleImageError(): void {
    if (activeCandidateIndex < logoCandidates.length - 1) {
      setLoadState((currentState) => ({
        ...currentState,
        sourceKey: logoSourceKey,
        candidateIndex: currentState.candidateIndex + 1,
        hasFailedLastCandidate: false,
      }));
      return;
    }

    setLoadState({
      sourceKey: logoSourceKey,
      candidateIndex: activeCandidateIndex,
      hasFailedLastCandidate: true,
    });
  }

  return (
    <div className={rootClassName} aria-hidden="true">
      {shouldRenderImage ? (
        <img
          key={activeLogoUrl}
          src={activeLogoUrl}
          alt=""
          className={styles.logo}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={handleImageError}
        />
      ) : (
        <span className={styles.initials}>{getTickerInitials(ticker)}</span>
      )}
    </div>
  );
}
