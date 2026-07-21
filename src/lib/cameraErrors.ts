// Map browser MediaDevices errors into friendly, actionable messages.
// Use everywhere we call navigator.mediaDevices.getUserMedia.

export interface FriendlyCameraError {
  title: string;
  description: string;
}

export function mapCameraError(err: unknown): FriendlyCameraError {
  const name =
    err && typeof err === "object" && "name" in err
      ? String((err as { name: unknown }).name)
      : "";

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return {
        title: "Camera permission blocked",
        description:
          "Please allow camera access in your browser settings (lock icon next to the address bar) and try again.",
      };
    case "NotReadableError":
    case "TrackStartError":
      return {
        title: "Camera is busy",
        description:
          "Your camera looks like it's being used by another app (Zoom, Teams, FaceTime, or another browser tab). Close it and try again.",
      };
    case "NotFoundError":
    case "DevicesNotFoundError":
      return {
        title: "No camera found",
        description: "We couldn't detect a camera on this device.",
      };
    case "OverconstrainedError":
      return {
        title: "Camera settings not supported",
        description: "Your camera doesn't support the requested settings. Try a different device.",
      };
    case "AbortError":
      return {
        title: "Camera was interrupted",
        description: "The camera was closed before it could start. Please try again.",
      };
    case "SecurityError":
      return {
        title: "Camera blocked for security",
        description: "Camera access is only available on secure (https) pages.",
      };
    default:
      return {
        title: "Couldn't start the camera",
        description: "Please refresh the page and try again.",
      };
  }
}
