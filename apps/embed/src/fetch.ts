/**
 * Fetch active surveys from the API.
 */

import type { EmbedConfig } from './types';
import type { Survey } from './types';

export async function fetchSurveys(config: EmbedConfig): Promise<Survey[]> {
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
    console.log(`[PFM Surveys] ✓ Surveys fetched successfully: ${surveys.length} survey(s) found`);
    return surveys;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Unexpected token') && config.apiUrl.includes('ngrok')) {
      console.error('[PFM Surveys] ⚠️ Ngrok setup required!');
      console.error('[PFM Surveys] Visit this URL in your browser first:', `${config.apiUrl}/health`);
      console.error('[PFM Surveys] Click "Visit Site" on the ngrok warning, then refresh your page.');
    } else {
      console.error('[PFM Surveys] Failed to fetch surveys:', err);
    }
    return [];
  }
}
