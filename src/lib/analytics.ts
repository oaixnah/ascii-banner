export const ANALYTICS_CONSENT_STORAGE_KEY = "ascii-banner:analytics-consent";
export const ANALYTICS_CONSENT_VERSION = 3;

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
): AnalyticsConsentStatus => {
  if (!raw) return "granted";
  try {
    const value = JSON.parse(raw) as Partial<AnalyticsConsentState>;
    if (value.status === "denied") return "denied";
  } catch {
    // Invalid values fall back to the default-on setting.
  }
  return "granted";
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
