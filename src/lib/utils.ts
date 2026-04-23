import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Lightweight cross-component event bus for medication updates.
 * Components save medications via PatientDetailsEditor, then any view
 * showing prescriptions / adherence / chronic meds can subscribe to
 * `medications-updated` and invalidate its query caches.
 */
export const medicationSyncBus = new EventTarget();
export const emitMedicationsUpdated = (patientId?: string) => {
  medicationSyncBus.dispatchEvent(
    new CustomEvent("medications-updated", { detail: { patientId } }),
  );
};
