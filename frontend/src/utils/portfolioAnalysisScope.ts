export function isIncludedInPortfolioAnalysis(position: { includedInAnalysis?: boolean }): boolean {
  return position.includedInAnalysis !== false;
}
