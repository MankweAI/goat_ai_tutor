// lib/session-state.js
// SIMPLE IN-MEMORY SESSION STATE (MVP)
// NOTE: On Vercel serverless this resets when function instance is cold-started.
// For production persistence, mirror these writes to Supabase.
// State shape: { topic, subtopic, awaiting, last_hash, last_interaction, turns, history[] }

const sessions = new Map();
const MAX_AGE_MS = 20 * 60 * 1000; // 20 minutes idle timeout

function getSession(id) {
  prune();
  if (!sessions.has(id)) {
    sessions.set(id, {
      created_at: Date.now(),
      updated_at: Date.now(),
      topic: null,
      subtopic: null,
      awaiting: "topic", // topic | subtopic | problem | followup
      last_hash: null,
      turns: 0,
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
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
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
  if (s.history.length > 12) s.history.splice(0, s.history.length - 12); // keep last 12 turns
}

function prune() {
  const now = Date.now();
  for (const [k, v] of sessions.entries()) {
    if (now - v.updated_at > MAX_AGE_MS) sessions.delete(k);
  }
}

module.exports = {
  getSession,
  updateSession,
  isDuplicate,
  addHistory,
};
