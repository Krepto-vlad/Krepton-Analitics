import { Navbar, Footer } from '../../components/layout';
import { LEGAL_PDF_DOCUMENTS } from '../../content/legalDocuments';
import { ROUTES } from '../../constants';
import { PAGE_SEO_METADATA } from '../../constants/seo';
import { useAppSelector } from '../../hooks/useAppSelector';
import { usePageSeo } from '../../hooks/usePageSeo';
import { joinClassNames } from '../../utils/classNames';
import { ChevronRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './LegalDocumentsPage.module.scss';

export function LegalDocumentsPage() {
  const isAuthenticated = Boolean(useAppSelector((state) => state.auth.user));
  const Body = isAuthenticated ? 'div' : 'main';
  usePageSeo(PAGE_SEO_METADATA[ROUTES.LEGAL]);

  return (
    <div className={joinClassNames(styles.page, isAuthenticated && styles.inApp)}>
      {!isAuthenticated && <Navbar />}
      <Body className={joinClassNames(styles.body, isAuthenticated && styles.inApp)}>
        <div className={styles.inner}>
          <h1 className={styles.title}>Legal Documents</h1>
          <p className={styles.subtitle}>Official PDFs you can open in the browser or download.</p>

          <ul className={styles.list}>
            {LEGAL_PDF_DOCUMENTS.map((document) => (
              <li key={document.id}>
                <Link to={document.route} className={styles.row}>
                  <FileText size={18} className={styles.rowIcon} aria-hidden />
                  <span className={styles.rowTitle}>{document.title}</span>
                  <ChevronRight size={18} className={styles.rowChevron} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Body>
      {!isAuthenticated && <Footer />}
    </div>
  );
}
