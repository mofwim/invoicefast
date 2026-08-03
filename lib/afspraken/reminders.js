/**
 * Reminders.
 *
 * The point of the whole tool is not forgetting, so a nudge before an
 * appointment matters more than any other feature. There is no server here and
 * no push subscription, which means honesty about the limit: notifications are
 * scheduled by this page, so they arrive while it is open — as a tab, or as the
 * installed app. That is exactly the situation the tool is used in, and it is
 * stated plainly in the settings rather than promised and quietly missed.
 *
 * Everything already fired is remembered, so reopening the page does not
 * replay this morning's reminders.
 */

const FIRED_KEY = "mijn_afspraken_gemeld_v1";
/** Timers further out than this are re-planned later; setTimeout is not exact over hours. */
export const HORIZON_MS = 6 * 3600000;
const KEEP_FIRED_MS = 3 * 86400000;

export const REMINDER_CHOICES = [
  { value: 0, label: "Uit" },
  { value: 10, label: "10 minuten van tevoren" },
  { value: 30, label: "30 minuten van tevoren" },
  { value: 60, label: "1 uur van tevoren" },
  { value: 120, label: "2 uur van tevoren" },
  { value: 1440, label: "een dag van tevoren" },
];

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission() {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function askPermission() {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function loadFired() {
  try {
    const raw = JSON.parse(localStorage.getItem(FIRED_KEY) || "{}");
    const cutoff = Date.now() - KEEP_FIRED_MS;
    return Object.fromEntries(Object.entries(raw).filter(([, at]) => at > cutoff));
  } catch {
    return {};
  }
}

function saveFired(fired) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
  } catch {
    /* storage full or unavailable — reminders simply repeat once */
  }
}

function bodyFor(appointment) {
  const time = new Date(appointment.start).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const where = appointment.location ? ` · ${appointment.location.split(",")[0]}` : "";
  return `${time}${where}`;
}

/**
 * Plan the reminders that fall inside the horizon.
 *
 * @param {object[]} appointments
 * @param {number} minutesBefore  0 turns reminders off
 * @param {number} now
 * @returns {function} cancels every timer this call created
 */
export function scheduleReminders(appointments, minutesBefore, now = Date.now()) {
  if (!minutesBefore || !notificationsSupported() || Notification.permission !== "granted") {
    return () => {};
  }

  const fired = loadFired();
  const timers = [];
  const lead = minutesBefore * 60000;

  for (const appointment of appointments) {
    if (appointment.status === "CANCELLED" || appointment.allDay) continue;

    const at = appointment.start - lead;
    // Already past its moment, or too far out to hold a timer for.
    if (at <= now || at - now > HORIZON_MS) continue;

    const key = `${appointment.dedupeKey}|${minutesBefore}`;
    if (fired[key]) continue;

    timers.push(
      setTimeout(() => {
        try {
          const notification = new Notification(appointment.title, {
            body: bodyFor(appointment),
            icon: "/afspraken-icon-192.png",
            badge: "/afspraken-icon-192.png",
            tag: key,
            lang: "nl",
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch {
          /* the browser refused; nothing useful to do here */
        }
        const current = loadFired();
        current[key] = Date.now();
        saveFired(current);
      }, at - now)
    );
  }

  return () => timers.forEach(clearTimeout);
}

/** How many reminders the current setting would actually produce right now. */
export function countPlanned(appointments, minutesBefore, now = Date.now()) {
  if (!minutesBefore) return 0;
  const lead = minutesBefore * 60000;
  return appointments.filter(
    (a) =>
      a.status !== "CANCELLED" &&
      !a.allDay &&
      a.start - lead > now &&
      a.start - lead <= now + HORIZON_MS
  ).length;
}
