const CONTACT_EMAIL_PATTERN = /^[^\s@<>"(),;:]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export const parseContactEmail = (value: unknown) => {
  if (typeof value !== "string") {
    throw new Error("CONTACT_EMAIL must be configured before building the site.");
  }

  const email = value.trim();
  if (!email || email.length > 254 || !CONTACT_EMAIL_PATTERN.test(email)) {
    throw new Error("CONTACT_EMAIL must be a valid email address, such as contact@example.com.");
  }

  return email;
};
