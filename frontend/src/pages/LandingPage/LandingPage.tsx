import { useState, useEffect, useRef, useCallback, type MouseEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  TrendingUp,
  Shield,
  Upload,
  Sparkles,
  Calendar,
  ChevronRight,
  ArrowRight,
  Lock,
  Globe,
  Zap,
  BarChart3,
  Check,
} from 'lucide-react';
import { ROUTES, TICKER_CACHE_TTL_MS } from '../../constants';
import { fetchTickerTape } from '../../api/stockApi';
import type { StockQuote } from '../../types/stock.types';
import { Navbar, Footer } from '../../components/layout';
import { joinClassNames } from '../../utils/classNames';
import { toCssCustomProperties } from '../../utils/cssCustomProperties';
import styles from './LandingPage.module.scss';

// ─── Ticker data ──────────────────────────────────────────────────────────────

interface TickerItem {
  symbol: string;
  price: string;
  change: string;
  positive: boolean;
}

const TICKER_FALLBACK: TickerItem[] = [
  { symbol: 'AAPL', price: '213.40', change: '+1.56%', positive: true },
  { symbol: 'MSFT', price: '447.90', change: '+1.15%', positive: true },
  { symbol: 'NVDA', price: '875.40', change: '+1.43%', positive: true },
  { symbol: 'GOOGL', price: '168.70', change: '+1.11%', positive: true },
  { symbol: 'AMZN', price: '194.20', change: '+0.82%', positive: true },
  { symbol: 'TLT', price: '94.50', change: '-0.34%', positive: false },
  { symbol: 'GLD', price: '188.30', change: '+0.67%', positive: true },
  { symbol: 'VOO', price: '504.80', change: '+0.91%', positive: true },
];

// In-memory fallback cache — primary caching is HTTP Cache-Control (1h) set by the server.
// This module-level cache prevents duplicate fetches within a single SPA session
// (e.g. navigating away and back before the HTTP cache is populated).
let inMemoryCachedItems: TickerItem[] | null = null;
let inMemoryCacheTimestamp = 0;

function quoteToTickerItem(quote: StockQuote, fallback: TickerItem): TickerItem {
  if (quote.price === 0) return fallback; // backend returned a zero-value fallback
  const changePercent = quote.changePercent ?? 0;
  const sign = changePercent >= 0 ? '+' : '';
  return {
    symbol: quote.ticker,
    price: quote.price.toFixed(2),
    change: `${sign}${changePercent.toFixed(2)}%`,
    positive: changePercent >= 0,
  };
}

async function loadTickerData(): Promise<TickerItem[]> {
  if (inMemoryCachedItems && Date.now() - inMemoryCacheTimestamp < TICKER_CACHE_TTL_MS) {
    return inMemoryCachedItems;
  }

  const quotes = await fetchTickerTape();
  const items = quotes.map((quote, i) =>
    quoteToTickerItem(quote, TICKER_FALLBACK[i] ?? TICKER_FALLBACK[0])
  );

  inMemoryCachedItems = items;
  inMemoryCacheTimestamp = Date.now();
  return items;
}

// ─── Static page data ─────────────────────────────────────────────────────────

type LandingAccentTone = 'primary' | 'indigo' | 'warning' | 'blue' | 'pink';

const LANDING_ACCENT_CLASS_NAME: Record<LandingAccentTone, string> = {
  primary: styles.accentPrimary,
  indigo: styles.accentIndigo,
  warning: styles.accentWarning,
  blue: styles.accentBlue,
  pink: styles.accentPink,
};

const FEATURES: Array<{
  icon: typeof Upload;
  accent: LandingAccentTone;
  title: string;
  description: string;
  tags: string[];
}> = [
  {
    icon: Upload,
    accent: 'primary',
    title: 'Multi-Broker Import',
    description:
      'Seamlessly import portfolio statements from Interactive Brokers, Revolut, Charles Schwab, Fidelity and more via CSV or XLSX.',
    tags: ['IB', 'Revolut', 'Schwab', 'Fidelity'],
  },
  {
    icon: Sparkles,
    accent: 'indigo',
    title: 'AI Insights',
    description:
      'Automated portfolio health audits, allocation deviation warnings, and rebalancing recommendations powered by AI analysis.',
    tags: ['Real-time', 'Alerts', 'Smart'],
  },
  {
    icon: Calendar,
    accent: 'warning',
    title: 'Dividend Calendar',
    description:
      '12-month passive income forecasting based on historical ex-dividend dates. Track coupons, dividends and total yield in one view.',
    tags: ['12-Month', 'Coupons', 'Yield'],
  },
  {
    icon: BarChart3,
    accent: 'blue',
    title: 'Stock Screener',
    description:
      'Side-by-side fundamental comparison with P/E, ROE, Debt/Equity, Dividend Yield. Superior metrics automatically highlighted.',
    tags: ['P/E Ratio', 'ROE', 'Multi-ticker'],
  },
  {
    icon: Zap,
    accent: 'pink',
    title: 'Auto Rebalancing',
    description:
      'Strategy-driven rebalancing engine. Pre-built Ray Dalio, Buffett 90/10, and custom allocation targets with exact trade instructions.',
    tags: ['All-Weather', 'Buffett', 'Custom'],
  },
  {
    icon: Lock,
    accent: 'primary',
    title: 'Zero-Identity Architecture',
    description:
      'No KYC. No real names. No bank linking. Cryptographic separation of financial records from personal identity by design.',
    tags: ['No KYC', 'Encrypted', 'Anonymous'],
  },
];

const STATS = [
  { value: '0', suffix: '', label: 'Personal data collected' },
  { value: '6', suffix: '+', label: 'Supported brokers' },
  { value: '12', suffix: '-mo', label: 'Month income forecast' },
  { value: '99.9', suffix: '%', label: 'Platform uptime' },
];

const MINI_CHART_HEIGHTS = [40, 55, 48, 62, 58, 72, 65, 80, 70, 88, 82, 95];

const PREVIEW_POSITIONS = [
  { ticker: 'AAPL', price: '$213.40', gain: '+$3,720', positive: true },
  { ticker: 'TLT', price: '$94.50', gain: '-$340', positive: false },
  { ticker: 'GLD', price: '$188.30', gain: '+$1,128', positive: true },
];

const PRIVACY_FEATURES = [
  { icon: Lock, label: 'End-to-End Encrypted' },
  { icon: Globe, label: 'No IP Logging' },
  { icon: Shield, label: 'No KYC Required' },
];

const TILT_MAX_DEGREES = 12;
const TICKER_PX_PER_SEC = 55;

// ─── Dashboard preview with 3D tilt ──────────────────────────────────────────

function DashboardPreview() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0 → 1 left to right
    const y = (e.clientY - rect.top) / rect.height; // 0 → 1 top to bottom
    // Repel effect: card tilts AWAY from cursor (bottom-right hover → top-right rises, bottom sinks)
    const tiltX = (y - 0.5) * -TILT_MAX_DEGREES;
    const tiltY = (x - 0.5) * TILT_MAX_DEGREES;
    el.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    el.style.transform = 'perspective(1000px) rotateX(4deg) rotateY(-2deg)';
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={styles.previewCard}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.previewHeader}>
        <div className={styles.previewDots}>
          <div className={`${styles.previewDot} ${styles.previewDotRed}`} />
          <div className={`${styles.previewDot} ${styles.previewDotAmber}`} />
          <div className={`${styles.previewDot} ${styles.previewDotGreen}`} />
        </div>
        <span className={styles.previewTitle}>Krepton Analytics</span>
        <div className={styles.previewLive}>
          <span className={styles.previewLiveDot} />
          LIVE
        </div>
      </div>

      <div className={styles.previewBody}>
        <div className={styles.previewPortfolioRow}>
          <div>
            <div className={styles.previewLabel}>Portfolio Value</div>
            <div className={styles.previewValue}>$947,283</div>
            <div className={styles.previewGrowth}>
              <TrendingUp size={10} />
              +14.2% YoY
            </div>
          </div>
          <div className={styles.previewStats}>
            <div>
              <div className={styles.previewStatLabel}>Risk Score</div>
              <div className={`${styles.previewStatValue} ${styles.previewStatValueDanger}`}>
                67/100
              </div>
            </div>
            <div>
              <div className={styles.previewStatLabel}>Div. Yield</div>
              <div className={`${styles.previewStatValue} ${styles.previewStatValueSuccess}`}>
                4.8%
              </div>
            </div>
          </div>
        </div>

        <div className={styles.previewBars}>
          {MINI_CHART_HEIGHTS.map((heightPercent, barIndex) => (
            <div
              key={barIndex}
              className={joinClassNames(
                styles.previewBar,
                barIndex === MINI_CHART_HEIGHTS.length - 1 && styles.previewBarPeak
              )}
              style={toCssCustomProperties({
                '--bar-height': `${heightPercent}%`,
                '--bar-opacity': 0.2 + barIndex * 0.04,
              })}
            />
          ))}
        </div>

        <div className={styles.previewAiCard}>
          <div className={styles.previewAiHeader}>
            <div className={styles.previewAiIcon}>
              <Sparkles size={8} />
            </div>
            <span className={styles.previewAiLabel}>AI Insights</span>
          </div>
          <p className={styles.previewAiText}>
            Portfolio deviates from All-Weather target. Scale into LT Bonds (TLT) to reduce
            volatility exposure...
          </p>
        </div>

        <div className={styles.previewPositions}>
          {PREVIEW_POSITIONS.map((pos) => (
            <div key={pos.ticker} className={styles.previewPosition}>
              <span className={styles.previewPosTicker}>${pos.ticker}</span>
              <span className={styles.previewPosPrice}>{pos.price}</span>
              <span
                className={`${styles.previewPosGain} ${pos.positive ? styles.positive : styles.negative}`}
              >
                {pos.gain}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface LandingLocationState {
  scrollToFeatures?: boolean;
}

export function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tickerItems, setTickerItems] = useState<TickerItem[]>(TICKER_FALLBACK);
  const tickerTrackRef = useRef<HTMLDivElement>(null);

  // Reset scroll on entry; Features nav passes location.state (avoids keeping prior page scroll).
  useEffect(() => {
    const shouldScrollToFeatures = Boolean(
      (location.state as LandingLocationState | null)?.scrollToFeatures
    );

    if (shouldScrollToFeatures) {
      const timeoutId = window.setTimeout(() => {
        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    return undefined;
    // location.key identifies each navigation; state is read from that entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [location.key]);

  // Fetch real quotes once on mount (cached across navigation)
  useEffect(() => {
    loadTickerData()
      .then(setTickerItems)
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  // DOM-rotation ticker: leftmost item moves to the end when it exits viewport.
  // No copies needed beyond filling the initial visible area → works on any screen width.
  useEffect(() => {
    const track = tickerTrackRef.current;
    if (!track || track.children.length === 0) return;

    let rafId: number;
    let position = 0;
    let prevTime: number | undefined;

    // Read CSS gap once (flex gap: $space-8 = 2rem = 32px at default font size)
    const itemGap = parseFloat(getComputedStyle(track).columnGap) || 32;

    const step = (now: number) => {
      const dt = prevTime !== undefined ? now - prevTime : 0;
      prevTime = now;

      position -= (TICKER_PX_PER_SEC * dt) / 1000;

      // When the first item has fully scrolled past the left edge, rotate it to the end
      const first = track.firstElementChild as HTMLElement | null;
      if (first) {
        const itemSlotWidth = first.offsetWidth + itemGap;
        if (position <= -itemSlotWidth) {
          position += itemSlotWidth; // offset compensation — no visual jump
          track.appendChild(first); // move DOM node to end of flex row
        }
      }

      track.style.transform = `translateX(${position}px)`;
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [tickerItems]);

  const handleLogin = () => navigate(ROUTES.LOGIN);
  const handleRegister = () => navigate(ROUTES.REGISTER);

  return (
    <div className={styles.page}>
      <Navbar activeRoute="home" />

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroGrid} />

        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Advanced Analytics for Your{' '}
            <span className={styles.heroTitleAccent}>Global Portfolio.</span> 100% Anonymously.
          </h1>

          <p className={styles.heroSubtitle}>
            Track multi-broker assets, automate rebalancing, and monitor dividends.{' '}
            <strong>No real names. No bank connections. Pure math.</strong>
          </p>

          <div className={styles.heroCtas}>
            <button className={styles.btnHeroPrimary} onClick={handleRegister}>
              Analyze Your Portfolio Free
              <ArrowRight size={16} />
            </button>
            <button className={styles.btnHeroOutline} onClick={handleLogin}>
              Sign In
            </button>
          </div>

          <div className={styles.heroTrust}>
            {['No credit card required', 'No KYC verification', 'Zero personal data'].map(
              (text) => (
                <div key={text} className={styles.heroTrustItem}>
                  <Check size={12} className={styles.accentIcon} />
                  {text}
                </div>
              )
            )}
          </div>
        </div>

        <div className={styles.previewWrapper}>
          <DashboardPreview />
        </div>
      </section>

      {/* ── Ticker tape — DOM rotation, 3 copies to fill any screen initially ── */}
      <div className={styles.ticker}>
        <div ref={tickerTrackRef} className={styles.tickerTrack}>
          {[...tickerItems, ...tickerItems, ...tickerItems].map((item, i) => (
            <div key={i} className={styles.tickerItem}>
              <span className={styles.tickerSymbol}>${item.symbol}</span>
              <span className={styles.tickerPrice}>{item.price}</span>
              <span
                className={`${styles.tickerChange} ${
                  item.positive ? styles.positive : styles.negative
                }`}
              >
                {item.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats ── */}
      <section className={styles.stats}>
        <div className={styles.statsGrid}>
          {STATS.map((stat) => (
            <div key={stat.label} className={styles.statItem}>
              <div className={styles.statValue}>
                {stat.value}
                {stat.suffix}
              </div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionBadge}>
              <Zap size={12} className={styles.accentIcon} />
              Platform Features
            </div>
            <h2 className={styles.sectionTitle}>
              Everything you need for <span>professional portfolio management</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Built for independent investors who demand institutional-grade tools without
              institutional overhead.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className={joinClassNames(
                    styles.featureCard,
                    LANDING_ACCENT_CLASS_NAME[feat.accent]
                  )}
                >
                  <div className={styles.featureIconWrap}>
                    <Icon size={17} />
                  </div>
                  <div>
                    <h3 className={styles.featureTitle}>{feat.title}</h3>
                    <p className={styles.featureDesc}>{feat.description}</p>
                  </div>
                  <div className={styles.featureTags}>
                    {feat.tags.map((tag) => (
                      <span key={tag} className={styles.featureTag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Privacy banner ── */}
      <section className={styles.privacy}>
        <div className={styles.privacyCard}>
          <div className={styles.privacyGlow} />
          <div className={styles.privacyIconWrap}>
            <Shield size={26} />
          </div>
          <div className={styles.privacyBody}>
            <div className={styles.privacyTitleRow}>
              <h3 className={styles.privacyTitle}>Zero Personal Data Tracked</h3>
              <span className={styles.privacyCertBadge}>CERTIFIED</span>
            </div>
            <p className={styles.privacyText}>
              We separate your financial records from your identity using cryptographic
              architecture. No real names, no phone numbers, no bank connections.{' '}
              <strong>Your assets remain your business.</strong>
            </p>
            <div className={styles.privacyFeatures}>
              {PRIVACY_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className={styles.privacyFeatureItem}>
                  <Icon size={12} className={styles.accentIcon} />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <button className={styles.btnPrivacyCta} onClick={handleRegister}>
            Start Anonymously
            <ChevronRight size={14} />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
