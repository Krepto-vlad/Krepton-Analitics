import { LEGAL_CONTACT_EMAIL, LEGAL_NOT_INVESTMENT_ADVICE } from './legalConstants';
import type { LegalDocumentContent } from './legal.types';

export const TERMS_OF_SERVICE_CONTENT: LegalDocumentContent = {
  title: 'Terms of Service',
  intro:
    'These terms govern use of Krepton Analytics at www.kreptonanalytics.com. The product is educational software, not a licensed financial service.',
  sections: [
    {
      id: 'not-advice',
      title: '1. Not investment advice',
      paragraphs: [
        LEGAL_NOT_INVESTMENT_ADVICE,
        'Krepton is not a broker, custodian, investment firm, or financial advisor. It does not execute trades, hold client money, or transmit orders to a venue.',
      ],
    },
    {
      id: 'the-service',
      title: '2. The service',
      paragraphs: [
        'The app lets you track holdings, import broker files in memory, compare allocations to a strategy you choose, and optionally generate AI explanations. Market data may be delayed or incomplete. You are responsible for checking figures against your broker.',
      ],
    },
    {
      id: 'ai',
      title: '3. Artificial intelligence',
      paragraphs: [
        'Some screens generate text with a large language model. That output can be wrong, outdated, or incomplete. AI text is informational only and must not be treated as a personal recommendation to buy or sell.',
      ],
    },
    {
      id: 'accounts',
      title: '4. Accounts and acceptable use',
      paragraphs: [
        'You must provide a working email and keep credentials confidential. Do not upload files you are not allowed to process. Do not attempt to disrupt the service, scrape it abusively, or use it to provide regulated advice to others as if it were licensed software.',
      ],
    },
    {
      id: 'paid-plans',
      title: '5. Paid plans',
      paragraphs: [
        'Paid Plus subscriptions are sold by Paddle as Merchant of Record, not by Krepton Analytics. Paddle is the seller on the receipt, calculates and remits applicable VAT/GST/sales tax, and emails tax invoices. Refunds and the EU 14-day withdrawal right for digital services are handled under Paddle’s checkout and refund policy. Access to Plus is provisioned immediately after Paddle confirms payment.',
        'Cancelling stops future renewals. You keep Plus until the current period end stored from Paddle (or until an admin complimentary grant expires). We do not shorten that period ourselves.',
      ],
    },
    {
      id: 'liability',
      title: '6. Limitation of liability',
      paragraphs: [
        'The service is provided as-is for educational and informational use. To the extent permitted by applicable law, Krepton Analytics is not liable for investment losses, missed trades, or decisions you make after viewing analytics or AI text. Nothing in these terms limits liability that cannot be limited by law.',
        `Questions: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};
