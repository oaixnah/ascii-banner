export interface FontRedistributionAssessment {
  allowed: boolean;
  reason: string;
}

const conflictingNotices = [
  {
    pattern: /without permission/i,
    reason: "font header states that the work was changed or ported without permission",
  },
  {
    pattern: /derived from a copyrighted program/i,
    reason: "font header states that the work was derived from a copyrighted program",
  },
  {
    pattern: /copyright\s+1993,?\s+RSA Laboratories/i,
    reason: "font header names a separate copyright holder without redistribution terms",
  },
] as const;

export const assessFontRedistribution = (headerComment: string): FontRedistributionAssessment => {
  for (const notice of conflictingNotices) {
    if (notice.pattern.test(headerComment)) return { allowed: false, reason: notice.reason };
  }
  return {
    allowed: true,
    reason: "distributed with the MIT-licensed figlet.js font package and contains no conflicting header notice",
  };
};
