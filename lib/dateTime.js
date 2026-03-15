// lib/dateTime.js

/**
 * LunchApp date/time standard
 * ---------------------------------------------------------
 * Location: Southern Ontario
 * Time zone: America/Toronto
 *
 * Rules:
 * - serve_date is a DATE ONLY value from Postgres (YYYY-MM-DD)
 * - order_deadline is a TIMESTAMPTZ value from Postgres
 * - UI should display everything in America/Toronto
 * - comparisons should use real timestamps
 * - never let JS auto-shift serve_date by treating it like UTC midnight
 */

/**
 * Safely parse a Postgres date-only string without UTC shift.
 * Example: "2026-03-20" -> local Date object for that same calendar date
 */
export function parseDateOnlyLocal(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;

  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return null;

  const [year, month, day] = parts;
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Build a real ISO timestamp from local date + time inputs.
 * Example:
 *   date = "2026-03-19"
 *   time = "10:30"
 * Returns ISO string suitable for timestamptz insert/update.
 */
export function combineLocalDateAndTimeToISO(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;

  const localString = `${dateStr}T${timeStr}:00`;
  const dt = new Date(localString);

  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

/**
 * Format a date-only value for UI without shifting the day.
 */
export function formatServeDate(dateStr, options = {}) {
  const dt = parseDateOnlyLocal(dateStr);
  if (!dt) return "Not set";

  return dt.toLocaleDateString("en-CA", {
    timeZone: "America/Toronto",
    weekday: options.includeWeekday === false ? undefined : "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a timestamptz value in Toronto time.
 */
export function formatTorontoDateTime(value, options = {}) {
  if (!value) return "Not set";

  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "Not set";

  return dt.toLocaleString("en-CA", {
    timeZone: "America/Toronto",
    dateStyle: options.dateStyle || "medium",
    timeStyle: options.timeStyle || "short",
  });
}

/**
 * Format only the Toronto time portion from a timestamptz.
 * Useful for pre-filling <input type="time"> when editing.
 */
export function formatTorontoTimeInput(value) {
  if (!value) return "";

  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(dt);
  const hour = parts.find((p) => p.type === "hour")?.value || "00";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";

  return `${hour}:${minute}`;
}

/**
 * Format only the Toronto date portion from a timestamptz.
 * Useful for pre-filling <input type="date"> when editing.
 */
export function formatTorontoDateInput(value) {
  if (!value) return "";

  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(dt);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

/**
 * Is a deadline already passed?
 */
export function isPastDeadline(deadlineValue) {
  if (!deadlineValue) return false;

  const dt = new Date(deadlineValue);
  if (Number.isNaN(dt.getTime())) return false;

  return dt.getTime() < Date.now();
}

/**
 * Milliseconds remaining until deadline.
 */
export function msUntilDeadline(deadlineValue) {
  if (!deadlineValue) return null;

  const dt = new Date(deadlineValue);
  if (Number.isNaN(dt.getTime())) return null;

  return dt.getTime() - Date.now();
}

/**
 * Deadline pill helper
 * Keep your existing rough thresholds, but centralize them.
 */
export function getDeadlineStatus(deadlineValue) {
  const ms = msUntilDeadline(deadlineValue);
  if (ms === null) return "unknown";
  if (ms <= 0) return "closed";

  const hours = ms / (1000 * 60 * 60);

  if (hours > 24) return "green";
  if (hours > 12) return "yellow";
  return "orange";
}