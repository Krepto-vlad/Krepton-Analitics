import { Navbar, Footer } from '../../components/layout';
import { LEGAL_PDF_DOCUMENTS } from '../../content/legalDocuments';
import { ChevronRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './LegalDocumentsPage.module.scss';

export function LegalDocumentsPage() {
  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.body}>
        <div className={styles.inner}>
          <h1 className={styles.title}>Legal Documents</h1>
          <p className={styles.subtitle}>
            Official PDFs you can open in the browser or download.
          </p>

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
      </main>
      <Footer />
    </div>
  );
}
