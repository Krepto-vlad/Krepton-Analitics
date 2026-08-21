import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { Navbar, Footer } from '../../components/layout';
import { ROUTES } from '../../constants';
import { SITE_NAME } from '../../constants/seo';
import { getLegalPdfDocumentById } from '../../content/legalDocuments';
import { usePageSeo } from '../../hooks/usePageSeo';
import styles from './LegalPdfViewerPage.module.scss';

export function LegalPdfViewerPage() {
  const { documentId = '' } = useParams<{ documentId: string }>();
  const legalDocument = getLegalPdfDocumentById(documentId);

  usePageSeo({
    title: legalDocument
      ? `${legalDocument.title} — ${SITE_NAME}`
      : `Legal Document — ${SITE_NAME}`,
    description: legalDocument
      ? `Read the ${legalDocument.title} for ${SITE_NAME}, last updated ${legalDocument.lastUpdated}.`
      : `Legal document for ${SITE_NAME}.`,
  });

  if (!legalDocument) {
    return <Navigate to={ROUTES.LEGAL} replace />;
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.body}>
        <div className={styles.toolbar}>
          <Link to={ROUTES.LEGAL} className={styles.backLink}>
            <ArrowLeft size={16} />
            Legal Documents
          </Link>
          <div className={styles.toolbarText}>
            <h1 className={styles.title}>{legalDocument.title}</h1>
            <p className={styles.meta}>Last updated {legalDocument.lastUpdated} · PDF</p>
          </div>
          <div className={styles.actions}>
            <a
              className={styles.actionButton}
              href={legalDocument.publicPath}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={14} />
              Open
            </a>
            <a
              className={styles.actionButtonPrimary}
              href={legalDocument.publicPath}
              download={legalDocument.fileName}
            >
              <Download size={14} />
              Download
            </a>
          </div>
        </div>

        <iframe
          className={styles.viewer}
          title={legalDocument.title}
          src={legalDocument.publicPath}
        />
      </main>
      <Footer />
    </div>
  );
}
