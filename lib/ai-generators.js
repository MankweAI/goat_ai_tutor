// lib/ai-generators.js
// Central AI generation for Concept Explanations, Homework Scaffolds, Exam Prep Packs
// All responses are CAPS aligned. JSON format enforced with response_format.
// Includes basic in-memory caching + fallbacks.

const { getOpenAIClient } = require("./config/openai");
const {
  normalizeSubjectName,
  getSubjectInfo,
} = require("../api/caps-knowledge");
const {
  validateConceptJSON,
  validateHomeworkJSON,
  validateExamPrepJSON,
  clampWords,
} = require("./ai-validators");

// ------------------- SIMPLE CACHE -------------------
const _cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes

function cacheKey(obj) {
  return JSON.stringify(obj);
}
function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return entry.value;
}
function cacheSet(key, value) {
  _cache.set(key, { value, time: Date.now() });
}

// ------------------- GENERIC CALLER -------------------
async function callOpenAIJSON(systemPrompt, userPrompt) {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.45,
    max_tokens: 900,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt || "Generate now." },
    ],
  });
  const raw = completion.choices?.[0]?.message?.content?.trim() || "{}";
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("No JSON braces");
  return JSON.parse(raw.slice(first, last + 1));
}

// ------------------- NORMALIZERS -------------------
function normalizeTopic(topic = "") {
  const t = topic.toLowerCase();
  if (/trig/.test(t)) return "Trigonometry";
  if (/function|parabola|graph/.test(t)) return "Functions";
  if (/pattern|sequence|series/.test(t)) return "Number Patterns";
  if (/algebra|factor|equation|quadratic|polynomial/.test(t)) return "Algebra";
  if (/stat|data/.test(t)) return "Statistics";
  if (/prob/.test(t)) return "Probability";
  if (/geometry|midpoint|gradient|distance|coordinate|circle/.test(t))
    return "Geometry";
  if (/finance/.test(t)) return "Finance";
  if (/calculus|deriv/.test(t)) return "Differential Calculus";
  return topic ? topic[0].toUpperCase() + topic.slice(1) : "Algebra";
}

// ------------------- CONCEPT EXPLANATION -------------------
async function generateConceptExplanationAI({
  subject = "Mathematics",
  grade = "11",
  topic = "Algebra",
  focus = null,
}) {
  subject = normalizeSubjectName(subject || "Mathematics");
  topic = normalizeTopic(topic || "Algebra");
  const spec = { kind: "concept", subject, grade, topic, focus: focus || "" };
  const key = cacheKey(spec);
  const cached = cacheGet(key);
  if (cached) return cached;

  const subjectInfo = getSubjectInfo(subject, grade);
  const capsTopics =
    subjectInfo?.grade_specific_topics?.slice(0, 8).join(", ") || "";

  const systemPrompt = `You are a South African CAPS-aligned tutoring content generator.
Generate a concept explanation for one topic.

Return STRICT JSON:
{
  "topic": "string",
  "grade": "string",
  "subject": "string",
  "main_explanation": "string",
  "key_points": ["point 1","point 2","point 3"],
  "quick_check_question": "string",
  "encouragement": "string"
}

Rules:
- Topic: ${topic}
- Subject: ${subject}
- Grade: ${grade}
- CAPS context topics (for alignment only): ${capsTopics}
- Keep main_explanation ≤ 160 words, friendly, no final numeric answers.
- quick_check_question = 1 short question (no answer).
- Avoid repeating the same sentence openers.`;

  try {
    const json = await callOpenAIJSON(systemPrompt, "Generate concept now.");
    validateConceptJSON(json);
    const pack = {
      help_type: "concept_pack",
      subject,
      grade,
      topic: topic.toLowerCase(),
      text:
        `Concept: ${topic} (Grade ${grade} ${subject})\n` +
        clampWords(json.main_explanation, 160) +
        `\n\nKey Points:\n- ${json.key_points.join("\n- ")}\nQuick Check: ${
          json.quick_check_question
        }\n${
          json.encouragement
        }\nSay 'practice' for questions or name another topic.`,
      expectation: "awaiting_follow_up",
      meta: { topic, subject, grade },
    };
    cacheSet(key, pack);
    return pack;
  } catch (e) {
    // Fallback minimal
    return {
      help_type: "concept_pack",
      subject,
      grade,
      topic: topic.toLowerCase(),
      text: `Concept: ${topic}\nThis topic is important in Grade ${grade} ${subject}. (AI fallback – try again for richer explanation.)\nSay 'practice' for questions.`,
      expectation: "awaiting_follow_up",
      fallback: true,
    };
  }
}

// ------------------- HOMEWORK SCAFFOLD -------------------
async function generateHomeworkScaffoldAI({
  subject = "Mathematics",
  grade = "11",
  topic = "Algebra",
  question = "",
  userName = "Student",
}) {
  subject = normalizeSubjectName(subject);
  topic = normalizeTopic(topic);
  const spec = {
    kind: "homework_scaffold",
    subject,
    grade,
    topic,
    qhash: question.slice(0, 60),
  };
  const key = cacheKey(spec);
  // No caching here because each question is unique; you can enable if needed.

  const systemPrompt = `You are a step-by-step CAPS-aligned homework scaffold generator.

Return STRICT JSON:
{
  "question_type": "string",
  "analysis": "string",
  "steps": [
    { "step_number": 1, "action": "string", "hint": "string" },
    { "step_number": 2, "action": "string", "hint": "string" }
  ],
  "common_mistakes": ["mistake 1","mistake 2"],
  "encouragement": "string"
}

Rules:
- Subject: ${subject}
- Grade: ${grade}
- Topic: ${topic}
- Use 3–5 steps if non-trivial.
- DO NOT provide final numeric answer.
- Focus on structure, method, reasoning breadcrumbs.
- encouragement: ≤ 20 words.
- analysis: ≤ 60 words.`;

  const userPrompt = `Homework question from learner: "${question}"\nGenerate scaffold JSON now.`;

  try {
    const json = await callOpenAIJSON(systemPrompt, userPrompt);
    validateHomeworkJSON(json);
    const stepsStr = json.steps
      .map(
        (s) =>
          `${s.step_number}) ${s.action}${s.hint ? `\n   Hint: ${s.hint}` : ""}`
      )
      .join("\n");
    return {
      help_type: "homework_scaffold",
      subject,
      grade,
      topic: topic.toLowerCase(),
      text: `Homework Support (${topic})\nQuestion: ${question}\n\nAnalysis: ${
        json.analysis
      }\nSteps:\n${stepsStr}\n\nWatch out:\n- ${json.common_mistakes.join(
        "\n- "
      )}\n${json.encouragement}\nReply with your working or ask 'next hint'.`,
      expectation: "awaiting_follow_up",
    };
  } catch (e) {
    return {
      help_type: "homework_scaffold",
      subject,
      grade,
      topic: topic.toLowerCase(),
      text: `Homework: ${question}\nLet’s break it down: identify type, isolate what's asked, plan steps. (AI fallback – resend for more detail.)`,
      expectation: "awaiting_follow_up",
      fallback: true,
    };
  }
}

// ------------------- EXAM PREP PACK -------------------
async function generateExamPrepPackAI({
  subject = "Mathematics",
  grade = "11",
  topic = "Algebra",
  focus = null,
  difficulty = "mixed",
}) {
  subject = normalizeSubjectName(subject);
  topic = normalizeTopic(topic);
  const spec = { kind: "exam_prep", subject, grade, topic, difficulty };
  const key = cacheKey(spec);
  const cached = cacheGet(key);
  if (cached) return cached;

  const systemPrompt = `You are a South African CAPS exam style question generator.

Return STRICT JSON:
{
  "pack_id": "string",
  "meta": {
    "subject": "string",
    "grade": "string",
    "topic": "string",
    "difficulty_pattern": "string"
  },
  "questions": [
    {
      "id": "string",
      "marks": 5,
      "difficulty": "easy|medium|hard",
      "text": "CAPS exam-style question (no answer)"
    },
    { ... },
    { ... },
    { ... }
  ],
  "strategy_tip": "string"
}

Rules:
- Subject: ${subject}
- Grade: ${grade}
- Topic: ${topic}
- 4 questions: escalate difficulty (easy → medium → medium/hard → hard).
- Each question ≤ 45 words unless necessary for data.
- No solutions. No final answers.
- strategy_tip ≤ 25 words.`;

  try {
    const json = await callOpenAIJSON(systemPrompt, "Generate exam pack now.");
    validateExamPrepJSON(json);
    const qLines = json.questions
      .map((q, i) => `${i + 1}) [${q.difficulty}, ${q.marks} marks] ${q.text}`)
      .join("\n");
    const pack = {
      help_type: "exam_prep_pack",
      subject,
      grade,
      topic: topic.toLowerCase(),
      text:
        `Exam Prep (${topic} – Grade ${grade} ${subject})\n` +
        qLines +
        `\n\nStrategy: ${json.strategy_tip}\nSay 'answers' (later), 'more' for new set, or name another topic.`,
      expectation: "awaiting_answers",
      question_ids: json.questions.map((q) => q.id),
      questions: json.questions.map((q) => ({
        id: q.id,
        q: q.text,
        difficulty: q.difficulty,
        marks: q.marks,
      })),
    };
    cacheSet(key, pack);
    return pack;
  } catch (e) {
    return {
      help_type: "exam_prep_pack",
      subject,
      grade,
      topic: topic.toLowerCase(),
      text: `Exam Prep (${topic}) fallback.\n1) Simplify an algebraic expression.\n2) Solve a quadratic.\n3) Apply a pattern rule.\n4) Application word problem.\nSay 'more' for another set.`,
      expectation: "awaiting_answers",
      fallback: true,
      question_ids: ["ep_fb1", "ep_fb2", "ep_fb3", "ep_fb4"],
      questions: [
        { id: "ep_fb1", q: "Simplify an expression (fallback stub)." },
        { id: "ep_fb2", q: "Solve a quadratic (fallback stub)." },
        { id: "ep_fb3", q: "Identify next term (fallback stub)." },
        { id: "ep_fb4", q: "Apply algebra in context (fallback stub)." },
      ],
    };
  }
}

module.exports = {
  generateConceptExplanationAI,
  generateHomeworkScaffoldAI,
  generateExamPrepPackAI,
};

