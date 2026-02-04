/**
 * Targeting and display frequency logic.
 */

import { getShownSurveys, SESSION_SHOWN_KEY } from './utils';
import type { Targeting as TargetingType } from './types';

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

export function matchesTargetingRules(targeting: TargetingType | null | undefined): boolean {
  if (!targeting || targeting.pageType === 'all') {
    return true;
  }

  const currentUrl = window.location.href;
  const currentPath = window.location.pathname;

  if (targeting.pageType === 'specific' && targeting.pageRules) {
    return targeting.pageRules.some((rule) => {
      if (rule.type === 'exact') {
        return currentPath === rule.value;
      }
      if (rule.type === 'contains') {
        return currentUrl.includes(rule.value) || currentPath.includes(rule.value);
      }
      return false;
    });
  }

  return false;
}
