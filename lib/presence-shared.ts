// Online status helpers usable on the server and in the browser.
// Someone counts as online if Gamesprout was open for them in the last
// 5 minutes (the open page checks in every 2 minutes).
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;
export const PING_EVERY_MS = 2 * 60 * 1000;

export function isOnline(lastSeen: string | null | undefined, now = Date.now()) {
  return Boolean(lastSeen) && now - Date.parse(lastSeen!) < ONLINE_WINDOW_MS;
}

// "Online", "Last online 12m ago", "Last online 3h ago", "Last online 2d ago"
export function presenceText(lastSeen: string | null | undefined, now = Date.now()) {
  if (!lastSeen) return "Offline";
  if (isOnline(lastSeen, now)) return "Online";
  const mins = Math.floor((now - Date.parse(lastSeen)) / 60000);
  if (mins < 60) return `Last online ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last online ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `Last online ${days}d ago` : "Offline";
}
