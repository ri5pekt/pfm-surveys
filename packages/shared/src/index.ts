// Shared types and utilities

export interface SurveyConfig {
  id: string;
  siteId: string;
  name: string;
  active: boolean;
}

export interface Site {
  id: string;
  tenantId: string;
  name: string;
  siteId: string;
  siteSecret: string;
  domains: string[];
  active: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  active: boolean;
}

// More types will be added as we develop the application
