/**
 * Targeting and display frequency logic.
 */

import { getShownSurveys, SESSION_SHOWN_KEY } from './utils';
import type { Targeting as TargetingType, UserGeo } from './types';

export function shouldShowSurvey(
  surveyId: string,
  siteId: string,
  displayFrequency: 'once_per_user' | 'once_per_session' = 'once_per_session'
): boolean {
  const shown = getShownSurveys(siteId);
  const sessionShown = sessionStorage.getItem(SESSION_SHOWN_KEY(siteId, surveyId));

  if (displayFrequency === 'once_per_user' && shown[surveyId]) {
    return false;
  }

  if (displayFrequency === 'once_per_session' && sessionShown) {
    return false;
  }

  return true;
}

function matchGeoRule(
  rule: { country?: string; state?: string; city?: string },
  userGeo: UserGeo | null
): boolean {
  if (!userGeo) {
    console.log('[PFM Surveys] user rule (geo): no userGeo — rule not met');
    return false;
  }
  const rCountry = String(rule.country ?? '').trim().toUpperCase();
  const rState = String(rule.state ?? '').trim().toUpperCase();
  const rCity = String(rule.city ?? '').trim().toLowerCase();
  const uCountry = (userGeo.country ?? '').toUpperCase();
  const uState = (userGeo.state ?? '').toUpperCase();
  const uCity = (userGeo.city ?? '').toLowerCase();

  const countryOk = !rCountry || uCountry === rCountry;
  const stateOk = !rState || uState === rState;
  // City: exact match or one contains the other (e.g. "Tel Aviv" matches "Tel Aviv-Yafo")
  const cityOk =
    !rCity ||
    uCity === rCity ||
    uCity.includes(rCity) ||
    rCity.includes(uCity);
  const matched = countryOk && stateOk && cityOk;
  console.log('[PFM Surveys] user rule (geo):', {
    'Survey rule (what you set in Admin)': { country: rule.country || '(any)', state: rule.state || '(any)', city: rule.city || '(any)' },
    'Visitor location (resolved from their IP)': userGeo,
    matched,
    reason: !matched && rCity ? `Visitor city "${userGeo.city}" does not match rule city "${rule.city}"` : undefined,
  });
  return matched;
}

export function matchesTargetingRules(
  targeting: TargetingType | null | undefined,
  userGeo?: UserGeo | null
): boolean {
  if (!targeting) {
    return true;
  }

  const currentUrl = window.location.href;
  const currentPath = window.location.pathname;

  if (targeting.pageType === 'specific' && targeting.pageRules?.length) {
    const pageMatch = targeting.pageRules.some((rule) => {
      if (rule.type === 'exact') {
        return currentPath === rule.value;
      }
      if (rule.type === 'contains') {
        return currentUrl.includes(rule.value) || currentPath.includes(rule.value);
      }
      return false;
    });
    if (!pageMatch) return false;
  }

  if (targeting.userType === 'specific' && targeting.userRules?.length) {
    const userMatch = targeting.userRules.some((rule) => {
      if (rule.type === 'geo') {
        return matchGeoRule(rule, userGeo ?? null);
      }
      return false;
    });
    if (!userMatch) {
      console.log('[PFM Surveys] user targeting: no user rule matched. Visitor location (from IP):', userGeo, '| Survey rules:', targeting.userRules);
      return false;
    }
    console.log('[PFM Surveys] user targeting: at least one geo rule matched');
  }

  return true;
}
