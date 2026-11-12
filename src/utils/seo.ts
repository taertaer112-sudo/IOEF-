/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SEO & Dynamic Meta Management Utility for IOEF Platform
 */

export interface SeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  keywords?: string[];
}

export function updatePageSeo({ title, description, canonicalPath, keywords }: SeoConfig): void {
  if (typeof document === 'undefined') return;

  // 1. Update Document Title
  document.title = title;

  // Helper to ensure meta tag exists and set its content
  const setMetaTag = (selector: string, keyName: string, keyValue: string, contentValue: string) => {
    let el = document.querySelector(selector) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(keyName, keyValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', contentValue);
  };

  // 2. Primary Meta Tags
  setMetaTag('meta[name="description"]', 'name', 'description', description);
  setMetaTag('meta[name="title"]', 'name', 'title', title);

  if (keywords && keywords.length > 0) {
    setMetaTag('meta[name="keywords"]', 'name', 'keywords', keywords.join(', '));
  }

  // 3. OpenGraph Tags
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);

  // 4. Twitter Card Tags
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);

  // 5. Canonical URL
  let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '/';
  const targetUrl = canonicalPath ? `${window.location.origin}${canonicalPath}` : baseUrl;
  canonicalEl.setAttribute('href', targetUrl);
}
