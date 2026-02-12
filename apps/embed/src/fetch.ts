/**
 * Fetch active surveys and user geo from the API.
 */

import type { EmbedConfig } from './types';
import { logger } from './logger';
import type { Survey, UserGeo } from './types';

export interface FetchSurveysResult {
  surveys: Survey[];
  userGeo: UserGeo | null;
}

export async function fetchSurveys(config: EmbedConfig): Promise<FetchSurveysResult> {
  try {
    const response = await fetch(
      `${config.apiUrl}/api/public/surveys?site_id=${config.siteId}`,
      {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as { surveys?: Survey[] };
    const surveys = data.surveys ?? [];
    logger.log(`[PFM Surveys] ✓ Surveys fetched successfully: ${surveys.length} survey(s) found`);
    return { surveys, userGeo: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Unexpected token') && config.apiUrl.includes('ngrok')) {
      logger.error('[PFM Surveys] ⚠️ Ngrok setup required!');
      logger.error('[PFM Surveys] Visit this URL in your browser first:', `${config.apiUrl}/health`);
      logger.error('[PFM Surveys] Click "Visit Site" on the ngrok warning, then refresh your page.');
    } else {
      logger.error('[PFM Surveys] Failed to fetch surveys:', err);
    }
    return { surveys: [], userGeo: null };
  }
}

/** Fetch user geo only when needed (lazy). Called when evaluating a survey that has user geo rules. */
export async function fetchUserGeo(config: EmbedConfig): Promise<UserGeo | null> {
  try {
    const response = await fetch(
      `${config.apiUrl}/api/public/geo?site_id=${config.siteId}`,
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { userGeo?: UserGeo | null };
    const userGeo = data.userGeo ?? null;
    logger.log('[PFM Surveys] userGeo fetched (lazy):', userGeo);
    return userGeo;
  } catch (err) {
    logger.warn('[PFM Surveys] Failed to fetch userGeo:', err);
    return null;
  }
}
