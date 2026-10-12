// Timezone helpers.
//
// Day boundaries are computed against an explicit UTC offset (minutes east of
// UTC) supplied by the client via ?tz=, rather than the server's local clock.
// The offset is fixed — DST transitions are not modelled — which is an
// acceptable simplification for day-bucketed analytics.

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

function parseTz(raw) {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(-720, Math.min(840, Math.round(n))) : 0;
}

function shifted(date, tz) {
  return new Date(date.getTime() + tz * MIN);
}

// YYYY-MM-DD of `date` as seen in the given offset.
function dayKey(date, tz = 0) {
  return shifted(date, tz).toISOString().slice(0, 10);
}

// Start of the local day containing `date`.
function startOfDay(date, tz = 0) {
  const d = shifted(date, tz);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - tz * MIN);
}

function endOfDay(date, tz = 0) {
  return new Date(startOfDay(date, tz).getTime() + DAY - 1);
}

// Monday-based start of the local week containing `date`.
function startOfWeek(date, tz = 0) {
  const s = startOfDay(date, tz);
  const mondayIndex = (shifted(s, tz).getUTCDay() + 6) % 7;
  return new Date(s.getTime() - mondayIndex * DAY);
}

function startOfMonth(date, tz = 0) {
  const d = shifted(date, tz);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - tz * MIN);
}

function hourOfDay(date, tz = 0) {
  return shifted(date, tz).getUTCHours();
}

// 0 = Monday ... 6 = Sunday
function weekdayMon(date, tz = 0) {
  return (shifted(date, tz).getUTCDay() + 6) % 7;
}

module.exports = { parseTz, dayKey, startOfDay, endOfDay, startOfWeek, startOfMonth, hourOfDay, weekdayMon };
