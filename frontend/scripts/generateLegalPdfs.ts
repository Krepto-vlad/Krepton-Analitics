import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PDFFont } from 'pdf-lib';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { LEGAL_PDF_DOCUMENTS, getLegalPdfPlainText } from '../src/content/legalDocuments.ts';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 56;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 56;
const TITLE_SIZE = 18;
const BODY_SIZE = 10;
const LINE_HEIGHT = 14;
const MAX_LINE_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const OUTPUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/legal');

function toWinAnsi(text: string): string {
  return text
    .replaceAll('\u2013', '-')
    .replaceAll('\u2014', '-')
    .replaceAll('\u2018', "'")
    .replaceAll('\u2019', "'")
    .replaceAll('\u201c', '"')
    .replaceAll('\u201d', '"')
    .replaceAll('\u2022', '-')
    .replaceAll('\u00a0', ' ');
}

function wrapLine(text: string, font: PDFFont, size: number): string[] {
  const normalized = toWinAnsi(text).trim();
  if (normalized.length === 0) {
    return [''];
  }

  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine.length === 0 ? word : `${currentLine} ${word}`;
    if (font.widthOfTextAtSize(candidate, size) <= MAX_LINE_WIDTH) {
      currentLine = candidate;
      continue;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    currentLine = word;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

async function createPdf(lines: string[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - MARGIN_TOP;

  function addPage(): void {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    cursorY = PAGE_HEIGHT - MARGIN_TOP;
  }

  for (const [index, rawLine] of lines.entries()) {
    const isTitle = index <= 1;
    const size = isTitle ? TITLE_SIZE : BODY_SIZE;
    const activeFont = index === 1 ? boldFont : font;
    const wrappedLines = wrapLine(rawLine, activeFont, size);

    for (const wrappedLine of wrappedLines) {
      if (cursorY < MARGIN_BOTTOM) {
        addPage();
      }

      if (wrappedLine.length > 0) {
        page.drawText(wrappedLine, {
          x: MARGIN_X,
          y: cursorY,
          size,
          font: activeFont,
          color: rgb(0.12, 0.14, 0.18),
        });
      }

      cursorY -= isTitle ? 22 : LINE_HEIGHT;
    }
  }

  return pdf.save();
}

async function generateLegalPdfs(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const document of LEGAL_PDF_DOCUMENTS) {
    const bytes = await createPdf(getLegalPdfPlainText(document));
    const outputPath = path.join(OUTPUT_DIR, document.fileName);
    await writeFile(outputPath, bytes);
    console.log(`Wrote ${outputPath}`);
  }
}

void generateLegalPdfs();
