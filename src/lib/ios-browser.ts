export type IosBrowser = "safari" | "chrome" | "firefox" | "in-app" | "other";

export function detectIosBrowser(): IosBrowser | null {
  if (typeof navigator === "undefined") return null;
  if (!/iPad|iPhone|iPod/.test(navigator.userAgent)) return null;

  const ua = navigator.userAgent;
  if (/Instagram|FBAN|FBAV|LinkedInApp|Twitter|Line\//i.test(ua)) return "in-app";
  if (/CriOS/.test(ua)) return "chrome";
  if (/FxiOS/.test(ua)) return "firefox";
  if (/Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) return "safari";
  return "other";
}
