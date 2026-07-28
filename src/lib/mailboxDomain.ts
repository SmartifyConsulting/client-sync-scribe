/**
 * Single source of truth for the document-intake email domain.
 * Mail sent to `<mailbox_alias>@INTAKE_EMAIL_DOMAIN` lands in My Documents.
 */
export const INTAKE_EMAIL_DOMAIN = "docs.holarchealth.com";

/** Build the full intake address for a mailbox alias. */
export function intakeAddress(alias: string): string {
  return `${alias}@${INTAKE_EMAIL_DOMAIN}`;
}
