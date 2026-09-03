import { LEGAL_DOCUMENTS_PUBLIC_DIR, LEGAL_LAST_UPDATED } from './legalConstants';
import { flattenLegalDocumentLines, type LegalDocumentContent } from './legal.types';
import { PRIVACY_POLICY_CONTENT } from './privacyPolicy';
import { TERMS_OF_SERVICE_CONTENT } from './termsOfService';

export interface LegalPdfDocument {
  id: string;
  title: string;
  route: string;
  fileName: string;
  publicPath: string;
  lastUpdated: string;
  content: LegalDocumentContent;
}

export const LEGAL_PDF_DOCUMENTS: LegalPdfDocument[] = [
  {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    route: '/legal/privacy-policy',
    fileName: 'Krepton-Analytics-Privacy-Policy.pdf',
    publicPath: `${LEGAL_DOCUMENTS_PUBLIC_DIR}/Krepton-Analytics-Privacy-Policy.pdf`,
    lastUpdated: LEGAL_LAST_UPDATED,
    content: PRIVACY_POLICY_CONTENT,
  },
  {
    id: 'terms-of-service',
    title: 'Terms of Service',
    route: '/legal/terms-of-service',
    fileName: 'Krepton-Analytics-Terms-of-Service.pdf',
    publicPath: `${LEGAL_DOCUMENTS_PUBLIC_DIR}/Krepton-Analytics-Terms-of-Service.pdf`,
    lastUpdated: LEGAL_LAST_UPDATED,
    content: TERMS_OF_SERVICE_CONTENT,
  },
];

export function getLegalPdfDocumentById(documentId: string): LegalPdfDocument | null {
  return LEGAL_PDF_DOCUMENTS.find((document) => document.id === documentId) ?? null;
}

export function getLegalPdfPlainText(document: LegalPdfDocument): string[] {
  return flattenLegalDocumentLines(document.content, document.lastUpdated);
}
