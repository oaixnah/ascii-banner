export const ANALYTICS_CONSENT_STORAGE_KEY = "ascii-banner:analytics-consent";
export const ANALYTICS_PROMPT_SESSION_KEY = "ascii-banner:analytics-prompt-collapsed";
export const ANALYTICS_CONSENT_VERSION = 2;
export const ANALYTICS_CONSENT_MAX_AGE_MS = 15 * 24 * 60 * 60 * 1000;

export type AnalyticsConsentStatus = "granted" | "denied";

export interface AnalyticsConsentState {
  version: typeof ANALYTICS_CONSENT_VERSION;
  status: AnalyticsConsentStatus;
  decidedAt: number;
}

export interface AnalyticsConfig {
  gaMeasurementId: string;
  clarityProjectId: string;
}

const GA_ID_PATTERN = /^G-[A-Z0-9]{4,30}$/i;
const CLARITY_ID_PATTERN = /^[A-Z0-9]{5,64}$/i;

export const parseAnalyticsConfig = (
  gaMeasurementId: unknown,
  clarityProjectId: unknown,
): AnalyticsConfig => {
  if (typeof gaMeasurementId !== "string" || !GA_ID_PATTERN.test(gaMeasurementId.trim())) {
    throw new Error("GA_MEASUREMENT_ID must be a valid GA4 measurement ID beginning with G-.");
  }
  if (typeof clarityProjectId !== "string" || !CLARITY_ID_PATTERN.test(clarityProjectId.trim())) {
    throw new Error("CLARITY_PROJECT_ID must contain only letters and numbers.");
  }

  return {
    gaMeasurementId: gaMeasurementId.trim().toUpperCase(),
    clarityProjectId: clarityProjectId.trim().toLowerCase(),
  };
};

export const parseAnalyticsConsent = (
  raw: string | null,
  now = Date.now(),
): AnalyticsConsentStatus | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AnalyticsConsentState>;
    const age = now - (value.decidedAt ?? Number.NaN);
    if (
      value.version === ANALYTICS_CONSENT_VERSION
      && (value.status === "granted" || value.status === "denied")
      && Number.isFinite(age)
      && age >= 0
      && age < ANALYTICS_CONSENT_MAX_AGE_MS
    ) return value.status;
  } catch {
    // Invalid or stale values are treated as no decision.
  }
  return null;
};

export const serializeAnalyticsConsent = (
  status: AnalyticsConsentStatus,
  decidedAt = Date.now(),
) => JSON.stringify({
  version: ANALYTICS_CONSENT_VERSION,
  status,
  decidedAt,
} satisfies AnalyticsConsentState);

export const analyticsPageLocation = (url: URL) => `${url.origin}${url.pathname}`;

export const shouldLoadClarity = (url: URL) => !url.searchParams.has("text");
