export const TOUR_STORAGE_KEY = "ascii-banner:onboarding";
export const TOUR_VERSION = 1;

export type TourStatus = "dismissed" | "completed";
export type TourStepId = "text" | "display" | "color" | "browse" | "copy";

export interface TourState {
  version: number;
  status: TourStatus;
}

export interface TourStepCopy {
  title: string;
  description: string;
}

export interface TourMessages {
  helpLabel: string;
  welcomeEyebrow: string;
  welcomeTitle: string;
  welcomeDescription: string;
  start: string;
  notNow: string;
  back: string;
  next: string;
  skip: string;
  finish: string;
  closeLabel: string;
  progress: (current: number, total: number) => string;
  steps: Record<TourStepId, TourStepCopy>;
}

export interface TourStep extends TourStepCopy {
  id: TourStepId;
  target: string;
  fallback: string;
}

export const parseTourState = (raw: string | null): TourState | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<TourState>;
    if (
      value.version !== TOUR_VERSION ||
      (value.status !== "dismissed" && value.status !== "completed")
    ) return null;
    return { version: TOUR_VERSION, status: value.status };
  } catch {
    return null;
  }
};

export const serializeTourState = (status: TourStatus) => JSON.stringify({
  version: TOUR_VERSION,
  status,
} satisfies TourState);
