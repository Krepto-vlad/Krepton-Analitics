export interface LegalDocumentSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocumentContent {
  title: string;
  intro: string;
  sections: LegalDocumentSection[];
}

export function flattenLegalDocumentLines(
  content: LegalDocumentContent,
  lastUpdated: string
): string[] {
  const lines: string[] = [
    'Krepton Analytics',
    content.title,
    `Last updated ${lastUpdated}`,
    '',
    content.intro,
    '',
  ];

  for (const section of content.sections) {
    lines.push(section.title, '');
    for (const paragraph of section.paragraphs) {
      lines.push(paragraph, '');
    }
    if (section.bullets && section.bullets.length > 0) {
      for (const item of section.bullets) {
        lines.push(`- ${item}`);
      }
      lines.push('');
    }
  }

  return lines;
}
