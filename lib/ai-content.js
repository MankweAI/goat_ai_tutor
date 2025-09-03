// lib/ai-content.js
// AI Content Generation for Diagnostic & Practice Packs
// EVERYTHING (except welcome messages) should come from here eventually.
// Safe for first integration.

// DEPENDENCIES
const { getOpenAIClient } = require("./config/openai");
const { normalizeSubjectName } = require("../api/caps-knowledge");

// -------- Simple In-Memory Cache (resets on cold start) --------
const _cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 8; // 8 minutes

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}
function cacheSet(key, data) {
  _cache.set(key, { createdAt: Date.now(), data });
}

// -------- Normalizers --------
function normalizeTopic(topicRaw = "") {
  const t = topicRaw.toLowerCase();
  if (/trig/.test(t)) return "Trigonometry";
  if (/function/.test(t) || /parabola|graph/.test(t)) return "Functions";
  if (/pattern|sequence|series/.test(t)) return "Number Patterns";
  if (/algebra|factor|equation|quadratic|polynomial/.test(t)) return "Algebra";
  if (/stat|data/.test(t)) return "Statistics";
  if (/prob/.test(t)) return "Probability";
  if (/geometry|midpoint|gradient|distance|coordinate|circle/.test(t))
    return "Geometry";
  if (/finance/.test(t)) return "Finance";
  if (/calculus|deriv/.test(t)) return "Differential Calculus";
  return "Algebra";
}

function pickBaseDifficulty(grade) {
  if (!grade) return "easy";
  const g = parseInt(grade, 10);
  if (g >= 11) return "medium";
  return "easy";
}

// -------- System Prompt Builders --------
function buildDiagnosticSystemPrompt(spec) {
  return `You are a South African CAPS-aligned tutoring content generator.

Task: Produce ONE exam warm-up diagnostic question ONLY.
Return STRICT JSON:
{
  "question_id": "string",
  "question_text": "string",
  "topic": "string",
  "difficulty": "easy|medium|hard",
  "metadata": { "caps_topic": "string" }
}

Constraints:
- Grade: ${spec.grade || "unknown"}
- Subject: ${spec.subject}
- Topic: ${spec.topic}
- Style: CAPS exam warm-up, concise (<=30 words)
- NO answer. NO solution hints.
- No multiple questions. No numbering like "1)".

If unclear topic-level detail, choose a central Grade ${
    spec.grade || "10/11"
  } concept for that topic.`;
}

function buildAIPracticePackPrompt(spec) {
  return `You are a South African CAPS-aligned question generator.

Generate a 3-question practice pack. Return STRICT JSON:
{
  "pack_id": "string",
  "topic": "string",
  "difficulty_base": "${spec.difficulty}",
  "questions": [
    {
      "id": "string",
      "text": "string",
      "difficulty": "easy|medium|hard|challenge",
      "caps_topic": "string",
      "marks_estimate": 2
    },
    { ... },
    { ... }
  ]
}

Rules:
- Grade: ${spec.grade || "unknown"}
- Subject: ${spec.subject}
- Topic: ${spec.topic}
- Q1 easiest, Q3 hardest (logical escalation).
- All CAPS aligned. DO NOT include answers.
- Keep each question under 35 words unless data set needed.
- No instructions outside JSON.`;
}

// -------- Core OpenAI Caller (JSON enforced) --------
async function callOpenAIForJSON(systemPrompt, userPrompt) {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.35,
    max_tokens: 550,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt || "Generate now." },
    ],
  });
  let raw = completion.choices?.[0]?.message?.content?.trim() || "{}";
  // Defensive parse
  const openBrace = raw.indexOf("{");
  const closeBrace = raw.lastIndexOf("}");
  if (openBrace === -1 || closeBrace === -1) throw new Error("No JSON braces");
  raw = raw.slice(openBrace, closeBrace + 1);
  return JSON.parse(raw);
}

// -------- Validators --------
function validateDiagnosticJSON(json) {
  if (!json.question_text) throw new Error("Missing question_text");
  if (/answer|solution/i.test(json.question_text))
    throw new Error("Answer leakage");
  return true;
}

function validatePracticeJSON(json) {
  if (!Array.isArray(json.questions) || json.questions.length < 3)
    throw new Error("Need 3 questions");
  json.questions.forEach((q) => {
    if (!q.text) throw new Error("Question missing text");
    if (/answer|solution/i.test(q.text)) throw new Error("Answer leakage");
  });
  return true;
}

// -------- Public Generators --------
async function generateExamDiagnosticAI({ grade, subject, topic }) {
  const spec = {
    grade,
    subject: normalizeSubjectName(subject || "Mathematics"),
    topic: normalizeTopic(topic || "algebra"),
  };
  const cacheKey = JSON.stringify({ kind: "diag", spec });
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const sys = buildDiagnosticSystemPrompt(spec);
    const json = await callOpenAIForJSON(sys, "Diagnostic now.");
    validateDiagnosticJSON(json);
    const diag = {
      help_type: "diagnostic_question",
      subject: spec.subject,
      topic: spec.topic.toLowerCase(),
      difficulty: json.difficulty || "easy",
      question: {
        id: json.question_id || "diag_" + Date.now(),
        text: json.question_text,
      },
      text: `Exam warm-up (${spec.subject}${
        spec.grade ? " G" + spec.grade : ""
      }, ${spec.topic}).\nQ1) ${
        json.question_text
      }\nIf stuck: 'hint'. Say 'full pack' for a full set.`,
      expectation: "awaiting_answers",
    };
    cacheSet(cacheKey, diag);
    return diag;
  } catch (e) {
    // Fallback simple
    return {
      help_type: "diagnostic_question",
      subject: spec.subject,
      topic: spec.topic.toLowerCase(),
      difficulty: "easy",
      question: {
        id: "diag_fallback_" + Date.now(),
        text: "Solve for x: 2x + 5 = 17",
      },
      text: `Exam warm-up (${spec.subject}${
        spec.grade ? " G" + spec.grade : ""
      }, ${
        spec.topic
      }).\nQ1) Solve for x: 2x + 5 = 17\nIf stuck: 'hint'. Say 'full pack' for a full set.`,
      expectation: "awaiting_answers",
      fallback: true,
    };
  }
}

async function generatePracticePackAI({
  grade,
  subject,
  topic,
  baseDifficulty,
}) {
  const spec = {
    grade,
    subject: normalizeSubjectName(subject || "Mathematics"),
    topic: normalizeTopic(topic || "algebra"),
    difficulty: baseDifficulty || pickBaseDifficulty(grade),
  };
  const cacheKey = JSON.stringify({ kind: "practice", spec });
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const sys = buildAIPracticePackPrompt(spec);
    const json = await callOpenAIForJSON(sys, "Practice pack now.");
    validatePracticeJSON(json);

    const pack = {
      help_type: "practice_pack",
      topic: spec.topic.toLowerCase(),
      difficulty: spec.difficulty,
      questions: json.questions.map((q) => ({
        id: q.id,
        q: q.text,
        difficulty: q.difficulty,
        caps_topic: q.caps_topic,
        marks: q.marks_estimate,
      })),
      question_ids: json.questions.map((q) => q.id),
      text:
        `Practice (${spec.topic} – ${spec.difficulty}).\n` +
        json.questions.map((q, i) => `${i + 1}) ${q.text}`).join("\n") +
        `\n\nTell me if you don’t know where to start. Say 'more' for harder or name a new topic.`,
      expectation: "awaiting_answers",
    };
    cacheSet(cacheKey, pack);
    return pack;
  } catch (e) {
    // Fallback small static trio
    const fallbackQs = [
      {
        id: "fb1",
        q: "Solve for x: 2x + 3 = 11",
        difficulty: "easy",
        caps_topic: "Algebra",
        marks: 2,
      },
      {
        id: "fb2",
        q: "Factor: x^2 - 9",
        difficulty: "medium",
        caps_topic: "Algebra",
        marks: 3,
      },
      {
        id: "fb3",
        q: "If f(x)=x^2−4x, state its turning point.",
        difficulty: "hard",
        caps_topic: "Functions",
        marks: 3,
      },
    ];
    return {
      help_type: "practice_pack",
      topic: spec.topic.toLowerCase(),
      difficulty: spec.difficulty,
      questions: fallbackQs,
      question_ids: fallbackQs.map((q) => q.id),
      text:
        `Practice (${spec.topic} – ${spec.difficulty}).\n` +
        fallbackQs.map((q, i) => `${i + 1}) ${q.q}`).join("\n") +
        `\n\n(⚠️ Fallback mode) Tell me if you don’t know where to start.`,
      expectation: "awaiting_answers",
      fallback: true,
    };
  }
}

module.exports = {
  generateExamDiagnosticAI,
  generatePracticePackAI,
};
