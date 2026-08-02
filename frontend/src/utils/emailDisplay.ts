export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');

  if (atIndex <= 0 || atIndex === trimmed.length - 1) {
    return trimmed;
  }

  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  const visiblePrefix = localPart.slice(0, Math.min(2, localPart.length));

  return `${visiblePrefix}${'•'.repeat(6)}@${domain}`;
}

export function getEmailInitials(email: string): string {
  const localPart = email.split('@')[0] ?? email;
  return localPart.slice(0, 2).toUpperCase();
}

export function formatMemberSince(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
}
