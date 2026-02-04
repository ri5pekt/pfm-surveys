/**
 * Resolve embed config from the script tag (no global).
 * Supports: script src query ?site_id=..., and data-site-id / data-api-url attributes.
 */

import type { EmbedConfig } from './types';

const EMBED_SCRIPT_RE = /embed\/script\.js/i;

function getScriptElement(): HTMLScriptElement | null {
  if (document.currentScript && document.currentScript instanceof HTMLScriptElement) {
    return document.currentScript;
  }
  const scripts = document.getElementsByTagName('script');
  for (let i = scripts.length - 1; i >= 0; i--) {
    const s = scripts[i];
    if (s.src && EMBED_SCRIPT_RE.test(s.src)) return s as HTMLScriptElement;
  }
  return null;
}

/**
 * Get config from the embed script tag.
 * - site_id: from query (?site_id=...) or data-site-id
 * - apiUrl: from script src origin or data-api-url
 */
export function getConfigFromScript(): EmbedConfig | null {
  const script = getScriptElement();
  if (!script) return null;

  let siteId: string | null = null;
  let apiUrl: string | null = null;

  if (script.src) {
    try {
      const url = new URL(script.src);
      siteId = url.searchParams.get('site_id');
      if (!apiUrl) apiUrl = url.origin;
    } catch {
      // ignore
    }
  }

  siteId = siteId ?? script.getAttribute('data-site-id');
  apiUrl = apiUrl ?? script.getAttribute('data-api-url');

  if (!siteId || !apiUrl) return null;

  return { apiUrl, siteId };
}
