import { useEffect } from 'react';
import { SITE_DEFAULT_DESCRIPTION, SITE_DEFAULT_TITLE } from '../constants/seo';

const META_DESCRIPTION_SELECTOR = 'meta[name="description"]';
const META_ROBOTS_SELECTOR = 'meta[name="robots"]';
const CANONICAL_LINK_SELECTOR = 'link[rel="canonical"]';
const ROBOTS_NOINDEX_CONTENT = 'noindex, nofollow';

/** [selector, attribute-to-match-by, attribute-value] for each Open Graph / Twitter tag we sync per page. */
const SOCIAL_META_TAGS: ReadonlyArray<{
  selector: string;
  attribute: 'property' | 'name';
  value: string;
  field: 'title' | 'description';
}> = [
  {
    selector: 'meta[property="og:title"]',
    attribute: 'property',
    value: 'og:title',
    field: 'title',
  },
  {
    selector: 'meta[property="og:description"]',
    attribute: 'property',
    value: 'og:description',
    field: 'description',
  },
  {
    selector: 'meta[name="twitter:title"]',
    attribute: 'name',
    value: 'twitter:title',
    field: 'title',
  },
  {
    selector: 'meta[name="twitter:description"]',
    attribute: 'name',
    value: 'twitter:description',
    field: 'description',
  },
];

export interface PageSeoInput {
  title: string;
  description: string;
  /** Excludes the page from search results while remaining crawlable (e.g. reset-password, 404). */
  noIndex?: boolean;
  /** Optional JSON-LD payload, injected as a single <script type="application/ld+json">. */
  structuredData?: object;
}

function upsertMetaTag(
  selector: string,
  attribute: 'name' | 'property',
  value: string,
  content: string
): HTMLMetaElement {
  let tag = document.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, value);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
  return tag;
}

function syncSocialMetaTags(title: string, description: string): void {
  for (const tag of SOCIAL_META_TAGS) {
    upsertMetaTag(
      tag.selector,
      tag.attribute,
      tag.value,
      tag.field === 'title' ? title : description
    );
  }
}

function upsertCanonicalLink(): void {
  let link = document.querySelector<HTMLLinkElement>(CANONICAL_LINK_SELECTOR);
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', `${window.location.origin}${window.location.pathname}`);
}

/**
 * Manages `document.title`, meta description, canonical link, robots directive, and optional
 * JSON-LD for the currently mounted route. Needed because this is a client-rendered SPA served
 * from a single static `index.html` — without this, every route shares the same tags.
 *
 * Resets to the site-wide defaults on unmount so pages that do not call this hook (authenticated
 * app screens, which are not meant to be indexed) fall back to sane values instead of inheriting
 * whatever the previously visited page set.
 */
export function usePageSeo({ title, description, noIndex, structuredData }: PageSeoInput): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    upsertMetaTag(META_DESCRIPTION_SELECTOR, 'name', 'description', description);
    syncSocialMetaTags(title, description);
    upsertCanonicalLink();
    if (noIndex) {
      upsertMetaTag(META_ROBOTS_SELECTOR, 'name', 'robots', ROBOTS_NOINDEX_CONTENT);
    }

    let structuredDataScript: HTMLScriptElement | null = null;
    if (structuredData) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.type = 'application/ld+json';
      structuredDataScript.textContent = JSON.stringify(structuredData);
      document.head.appendChild(structuredDataScript);
    }

    return () => {
      document.title = previousTitle;
      upsertMetaTag(META_DESCRIPTION_SELECTOR, 'name', 'description', SITE_DEFAULT_DESCRIPTION);
      syncSocialMetaTags(SITE_DEFAULT_TITLE, SITE_DEFAULT_DESCRIPTION);
      document.querySelector(CANONICAL_LINK_SELECTOR)?.remove();
      if (noIndex) {
        document.querySelector(META_ROBOTS_SELECTOR)?.remove();
      }
      structuredDataScript?.remove();
    };
  }, [title, description, noIndex, structuredData]);
}
