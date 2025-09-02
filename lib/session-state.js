// lib/session-state.js
// (UNCHANGED except added 'intent','agent','stage' fields for clarity.)
const sessions = new Map();
const MAX_AGE_MS = 20 * 60 * 1000;

function getSession(id) {
  prune();
  if (!sessions.has(id)) {
    sessions.set(id, {
      created_at: Date.now(),
      updated_at: Date.now(),
      turns: 0,
      intent: null,
      agent: null,
      stage: null,
      topic: null,
      subtopic: null,
      last_hash: null,
      history: [],
    });
  }
  return sessions.get(id);
}
function updateSession(id, patch) {
  const s = getSession(id);
  Object.assign(s, patch);
  s.updated_at = Date.now();
  return s;
}
function hashMessage(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h.toString();
}
function isDuplicate(id, message) {
  const s = getSession(id);
  const h = hashMessage(message.trim().toLowerCase());
  if (s.last_hash === h) return true;
  s.last_hash = h;
  return false;
}
function addHistory(id, role, content) {
  const s = getSession(id);
  s.history.push({ role, content, t: Date.now() });
  if (s.history.length > 14) s.history.splice(0, s.history.length - 14);
}
function prune() {
  const now = Date.now();
  for (const [k, v] of sessions.entries()) {
    if (now - v.updated_at > MAX_AGE_MS) sessions.delete(k);
  }
}
module.exports = { getSession, updateSession, isDuplicate, addHistory };
