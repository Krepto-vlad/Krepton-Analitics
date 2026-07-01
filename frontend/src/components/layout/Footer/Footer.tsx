import { TrendingUp, Lock } from 'lucide-react';
import styles from './Footer.module.scss';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <div className={styles.footerBrandIcon}>
            <TrendingUp size={10} color="#fff" />
          </div>
          Krepton Analytics — Privacy-first portfolio intelligence
        </div>
        <div className={styles.footerDisclaimer}>
          <Lock size={11} color="#10B981" />
          Not financial advice. For educational purposes only.
        </div>
      </div>
    </footer>
  );
}
