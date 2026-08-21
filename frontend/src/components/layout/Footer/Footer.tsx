import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { LEGAL_CONTACT_EMAIL, LEGAL_COPYRIGHT_YEAR, ROUTES } from '../../../constants';
import styles from './Footer.module.scss';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.topRow}>
          <div className={styles.footerBrand}>
            <div className={styles.footerBrandIcon}>
              <TrendingUp size={10} />
            </div>
            Krepton Analytics
          </div>
          <a className={styles.footerEmail} href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>
        </div>

        <div className={styles.bottomRow}>
          <nav className={styles.footerLinks} aria-label="Site">
            <Link to={ROUTES.PRICING} className={styles.footerLink}>
              Pricing
            </Link>
            <Link to={ROUTES.SECURITY} className={styles.footerLink}>
              Security
            </Link>
            <Link to={ROUTES.LEGAL} className={styles.footerLink}>
              Legal Documents
            </Link>
          </nav>
          <p className={styles.copyright}>
            © {LEGAL_COPYRIGHT_YEAR} Krepton Analytics. All rights reserved. Not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
