// api/webhook.js
// Enhanced free-form webhook with:
// - Difficulty progression for practice
// - Unique question rotation
// - Topic switching at ANY time
// - First-time vs Returning-user welcome variants
// - No quick replies
// - NO inactivity nudge (per instruction)

const {
  buildPracticePack,
  buildConceptPack,
  buildHomeworkScaffold,
  buildExamPrepPack,
  nextDifficulty,
  normalizeTopic,
  initialDifficultyForGrade,
  gradeAwareNextDifficulty,
  buildDiagnosticQuestion,
} = require("../lib/assist-packs");

// In-memory sessions (simple – NOT persistent across cold starts)
const sessions = new Map();
function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      turns: 0,
      welcome_sent: false,
      returning_welcome_sent: false,
      help_sent: false,
      last_help_type: null,
      expectation: null,
      first_seen_at: Date.now(),
      last_interaction_at: Date.now(),

      // Practice tracking
      practice: {
        topic: null,
        difficulty: "easy",
        used_question_ids: [],
      },
      support: { confusion_stage: 0, last_hint_for_topic: null },
      grade_detected: null,
      grade_nudge_sent: false,
      last_intent_confidence: 0,
      pending_topic: null,
      diagnostic: { active: false, completed: false },
    });
  }
  return sessions.get(id);
}

// NEW: First-time & returning welcome variants
const FIRST_TIME_WELCOME =
  "Hey 👋 Welcome to The GOAT!\nYour expert tutor for Grades 8-12 CAPS curriculum subjects. Whether it's:\n✓ Homework help\n✓ Exam practice\n✓ Past paper questions\n✓ Understanding a tricky concept\nType your question—I got you! 📚";
const RETURNING_WELCOME =
  "Back again 👋 Ready for more? Drop a homework question, ask for tougher practice, or name a concept to unpack—I’ve got you. 🔁📚";

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({
      endpoint: "webhook",
      status: "ok",
      note: "POST with { subscriber_id, first_name, text }",
    });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const userId = body.subscriber_id || "unknown";
    const message = (body.text || "").trim();
    const echo = body.echo || `echo_${Date.now()}_${userId}`;

    if (!message) {
      return send(
        res,
        echo,
        "Send your question—homework, practice, past paper, or concept (Grades 8–12 CAPS)."
      );
    }

    const session = getSession(userId);
    session.turns += 1;
    session.last_interaction_at = Date.now();

    const isGreeting = /^hi$|^hello$|^hey$/i.test(message);
    // Try detect grade from current message
    const detectedGradeNow = detectGradeFromMessage(message);
    if (detectedGradeNow && !session.grade_detected) {
      session.grade_detected = detectedGradeNow;
    }

    if (
      session.grade_detected &&
      session.practice.used_question_ids.length === 0
    ) {
      // Set initial difficulty aligned to grade only if we haven't started practice
      session.practice.difficulty = initialDifficultyForGrade(
        session.grade_detected
      );
    }

    // FIRST-TIME WELCOME
    if (!session.welcome_sent && isGreeting) {
      session.welcome_sent = true;
      return send(res, echo, FIRST_TIME_WELCOME);
    }

    // RETURNING USER WELCOME:
    // Conditions:
    // - Already had first-time welcome (welcome_sent true)
    // - Has previously received help (help_sent true) OR turns > 3
    // - Greeting again
    // - Haven't already shown returning variant this session
    if (
      isGreeting &&
      session.welcome_sent &&
      !session.returning_welcome_sent &&
      (session.help_sent || session.turns > 3)
    ) {
      session.returning_welcome_sent = true;
      return send(res, echo, RETURNING_WELCOME);
    }

    // Prevent echo loops of old/other welcome text
    if (
      message.startsWith("Welcome to your Grade 11 Mathematics AI Tutor") ||
      message === FIRST_TIME_WELCOME ||
      message === RETURNING_WELCOME
    ) {
      return send(
        res,
        echo,
        "Just say what you need: homework help, practice, concept, or exam prep."
      );
    }

    const lower = message.toLowerCase();
    const intentConfidence = computeIntentConfidence(lower);
    session.last_intent_confidence = intentConfidence;

    // Detect topic switch ANY time (stats, geometry, trig, algebra, functions)
    const topicSwitch = detectTopicSwitch(lower);
    const wantsExplanation = /(explain|concept|what is|definition)/.test(lower);
    const wantsPractice =
      /(practice|questions|drill|test me|more practice)/.test(lower);
    const wantsHomework = /(homework|solve|assignment|steps|help me with)/.test(
      lower
    );
    const wantsExam = /(exam|revision|past paper|revise|prepare)/.test(lower);
    const asksMore = /\bmore\b|another|harder/.test(lower);
    const expressesConfusion =
      /\bi (don['’]?t|do not) know (where|how) (to )?start\b|(^|\s)stuck\b|no idea|^hint$|help me start/i.test(
        lower
      );
    const wantsSimpler = /\bsimpler|easier|too hard\b/.test(lower);
    const stillStuck = /\bstill stuck\b/.test(lower);
    const wantsSkip = /\bskip\b/.test(lower);

    // Equation-like direct solving
    if (/[=]/.test(message) || /\bsolve\b/i.test(message)) {
      const solved = await quickSolve(message);
      session.help_sent = true;
      session.last_help_type = "solution";
      session.expectation = null;
      return send(res, echo, appendGradeNudge(session, solved));
    }

    // Dataset-like (statistics)
    if (
      /,/.test(message) &&
      /\d/.test(message) &&
      /stat|mean|median|deviation|range/.test(lower)
    ) {
      const statsSummary = summarizeData(message);
      session.help_sent = true;
      session.last_help_type = "stats_snapshot";
      return send(
        res,
        echo,
        appendGradeNudge(
          session,
          statsSummary + " Need practice or explanation next?"
        )
      );
    }

    // Topic switch mid flow
    if (topicSwitch) {
      const newTopic = topicSwitch;
      if (wantsExplanation && session.last_help_type !== "concept_pack") {
        const conceptPack = buildConceptPack(newTopic);
        applyPackToSession(session, conceptPack, newTopic);
        return send(res, echo, appendGradeNudge(session, conceptPack.text));
      }
      if (
        session.last_help_type === "practice_pack" ||
        wantsPractice ||
        asksMore
      ) {
        session.practice.topic = newTopic;
        session.practice.difficulty = "easy";
        session.practice.used_question_ids = [];
        const practicePack = buildPracticePack(
          newTopic,
          null,
          [],
          session.grade_detected
        );
        applyPracticePack(session, practicePack);
        return send(res, echo, appendGradeNudge(session, practicePack.text));
      }
      if (wantsHomework) {
        const hw = buildHomeworkScaffold(message, newTopic);
        applyPackToSession(session, hw, newTopic);
        return send(res, echo, appendGradeNudge(session, hw.text));
      }
      const concept = buildConceptPack(newTopic);
      applyPackToSession(session, concept, newTopic);
      return send(res, echo, appendGradeNudge(session, concept.text));
    }

    // More (next difficulty)
    if (
      session.last_help_type === "practice_pack" &&
      session.expectation === "awaiting_answers" &&
      asksMore
    ) {
      const currentDiff = session.practice.difficulty;
      const nextDiff = gradeAwareNextDifficulty(
        session.grade_detected,
        currentDiff
      );
      session.practice.difficulty = nextDiff;
      const practicePack = buildPracticePack(
        session.practice.topic || "algebra",
        session.practice.difficulty,
        session.practice.used_question_ids,
        session.grade_detected
      );
      applyPracticePack(session, practicePack);
      return send(res, echo, appendGradeNudge(session, practicePack.text));
    }

    // Convert practice → concept explanation (same topic)
    if (
      session.last_help_type === "practice_pack" &&
      session.expectation === "awaiting_answers" &&
      wantsExplanation &&
      !topicSwitch
    ) {
      const concept = buildConceptPack(session.practice.topic || "algebra");
      applyPackToSession(session, concept, session.practice.topic || "algebra");
      return send(res, echo, appendGradeNudge(session, concept.text));
    }

    // Confusion / hint ladder during practice
    if (
      (session.last_help_type === "practice_pack" ||
        session.last_help_type === "diagnostic_question") &&
      session.expectation === "awaiting_answers" &&
      (expressesConfusion || stillStuck || wantsSimpler || lower === "hint")
    ) {
      const hintText = buildProgressiveHint(session);
      return send(res, echo, hintText);
    }
    // User attempts answers
    if (
      session.last_help_type === "practice_pack" &&
      session.expectation === "awaiting_answers" &&
      /(\d|=|factor|mean|median|vertex|gradient|range)/.test(lower) &&
      !wantsPractice &&
      !asksMore
    ) {
      return send(
        res,
        echo,
        "Nice attempt. I don’t mark answers yet. If unsure say 'hint', or 'more' for harder, or name a new topic."
      );
    }

    // Asking for solutions
    if (
      /solution|answer/.test(lower) &&
      session.last_help_type === "practice_pack"
    ) {
      return send(
        res,
        echo,
        "Give your attempt first (e.g. 1)=..., 2)=...). Then I’ll confirm or guide. Or say 'more' for the next level."
      );
    }

    // Skip diagnostic -> move straight to full pack
    if (
      wantsSkip &&
      session.diagnostic &&
      session.diagnostic.active &&
      !session.diagnostic.completed
    ) {
      session.diagnostic.active = false;
      session.diagnostic.completed = true;
      // Trigger full pack flow by simulating a practice request
      if (!session.practice.topic) {
        session.practice.topic = session.pending_topic || "algebra";
      }
      session.pending_topic = null;
      const practicePack = buildPracticePack(
        session.practice.topic,
        session.practice.difficulty || null,
        session.practice.used_question_ids,
        session.grade_detected
      );
      applyPracticePack(session, practicePack);
      return send(
        res,
        echo,
        appendGradeNudge(session, "Skipping warm-up.\n" + practicePack.text)
      );
    }

    // Practice request
    if (wantsPractice) {
      // If user previously gave a bare topic and we have not run a diagnostic yet:
      if (
        session.pending_topic &&
        !session.diagnostic.active &&
        !session.diagnostic.completed &&
        !session.help_sent
      ) {
        const diag = buildDiagnosticQuestion(
          session.pending_topic,
          session.grade_detected
        );
        applyDiagnostic(session, diag);
        session.diagnostic.active = true;
        return send(res, echo, appendGradeNudge(session, diag.text));
      }

      // If diagnostic was active and user asks again for practice -> escalate to full pack
      if (
        session.diagnostic.active &&
        !session.diagnostic.completed &&
        session.pending_topic
      ) {
        session.diagnostic.active = false;
        session.diagnostic.completed = true;
        // Move pending topic into practice.topic if not already
        session.practice.topic =
          session.practice.topic || session.pending_topic;
        session.pending_topic = null;
      }

      if (!session.practice.topic) {
        // If still no topic (user said "practice" without earlier topic), guess or default
        session.practice.topic = guessTopic(lower) || "algebra";
      }

      if (session.last_help_type !== "practice_pack") {
        // Reset rotation only when entering a new full practice phase
        session.practice.difficulty =
          session.practice.difficulty ||
          initialDifficultyForGrade(session.grade_detected);
        session.practice.used_question_ids = [];
      }

      const practicePack = buildPracticePack(
        session.practice.topic,
        session.practice.difficulty || null,
        session.practice.used_question_ids,
        session.grade_detected
      );
      applyPracticePack(session, practicePack);
      return send(res, echo, appendGradeNudge(session, practicePack.text));
    }

    // High confidence fast-path: go straight to diagnostic if not done and no help yet
    if (
      intentConfidence >= 0.8 &&
      !session.help_sent &&
      !session.diagnostic.active &&
      !session.diagnostic.completed
    ) {
      // Ensure topic
      if (!session.pending_topic && !session.practice.topic) {
        session.pending_topic = guessTopic(lower) || "algebra";
      }
      const diagTopic =
        session.practice.topic ||
        session.pending_topic ||
        guessTopic(lower) ||
        "algebra";
      const diag = buildDiagnosticQuestion(diagTopic, session.grade_detected);
      applyDiagnostic(session, diag);
      session.diagnostic.active = true;
      return send(res, echo, appendGradeNudge(session, diag.text));
    }

    // Medium confidence (asked for practice but no topic)
    if (
      intentConfidence >= 0.6 &&
      intentConfidence < 0.8 &&
      !session.help_sent &&
      !session.practice.topic &&
      !session.pending_topic
    ) {
      return send(
        res,
        echo,
        "Great—practice it is. Which topic? (e.g. algebra, trig, functions, geometry, statistics)."
      );
    }

    // Homework request
    if (wantsHomework) {
      const topicGuess =
        guessTopic(lower) || session.practice.topic || "algebra";
      const hw = buildHomeworkScaffold(message, topicGuess);
      applyPackToSession(session, hw, topicGuess);
      return send(res, echo, appendGradeNudge(session, hw.text));
    }

      if (intentConfidence >= 0.8 && !session.help_sent) {
        // If no specific question yet, prompt sharper
        if (
          !/[=]/.test(message) &&
          !/\d/.test(message) &&
          message.split(/\s+/).length < 6
        ) {
          return send(
            res,
            echo,
            "Send or paste the homework question (or describe it). I’ll guide step-by-step."
          );
        }
      }

    // Exam prep
    if (wantsExam) {
      const topicGuess = guessTopic(lower) || "algebra";
      const exam = buildExamPrepPack(topicGuess);
      applyPackToSession(session, exam, topicGuess);
      return send(res, echo, appendGradeNudge(session, exam.text));
    }

      if (intentConfidence >= 0.8 && !session.help_sent) {
        // High confidence exam ask: add immediate quick orientation
        // (No extra state needed here)
      }

    // Concept request
    if (wantsExplanation) {
      const topicGuess =
        guessTopic(lower) || session.practice.topic || "algebra";
      const concept = buildConceptPack(topicGuess);
      applyPackToSession(session, concept, topicGuess);
      return send(res, echo, appendGradeNudge(session, concept.text));
    }

    // Bare topic mention (now: clarify goal first, do NOT drop full pack)
    if (!session.help_sent && pureTopicOnly(lower)) {
      const topic = guessTopic(lower) || "algebra";
      session.pending_topic = topic;

      if (intentConfidence >= 0.8) {
        // High confidence but user still only sent the topic (rare if pureTopicOnly is true) – gently nudge concise goal
        return send(
          res,
          echo,
          `You’re on ${topic}. Quick: say 'practice', 'homework', 'explain', or 'exam' to begin.`
        );
      } else if (intentConfidence >= 0.6) {
        return send(
          res,
          echo,
          `${topic} noted. Want practice, homework help, an explanation, or exam prep?`
        );
      }

      return send(
        res,
        echo,
        `Got ${topic}. Do you want practice, homework help, an explanation, or exam prep? You can also paste a specific question.`
      );
    }

    // Fallback before any help
    if (!session.help_sent) {
      return send(
        res,
        echo,
        "Tell me: practice, homework, concept, or exam prep—with topic if possible (e.g. 'practice trig')."
      );
    }

    // Generic continuation
    return send(
      res,
      echo,
      "Continue—say 'more' for harder, name a new topic (e.g. 'geometry'), or send an equation/data."
    );
  } catch (e) {
    console.error("Webhook error:", e);
    return res.status(200).json({
      echo: req.body?.echo || "error_echo",
      version: "v2",
      content: {
        messages: [
          {
            type: "text",
            text: "Temporary issue. Re-send your maths request.",
          },
        ],
      },
      error: true,
    });
  }
};

// ---------- Helper Functions ----------

function send(res, echo, text) {
  if (!text || !text.trim()) text = "Send a Grade 11 Maths request.";
  return res.status(200).json({
    echo,
    version: "v2",
    content: { messages: [{ type: "text", text }] },
    timestamp: new Date().toISOString(),
  });
}

// ---- Grade Detection & Nudge Helpers ----
function detectGradeFromMessage(msg) {
  const m = msg.toLowerCase();
  // Patterns: grade 10, Grade11, gr 9, g12
  let match = m.match(/\bgrade\s*(8|9|1[0-2])\b/);
  if (match) return match[1];
  match = m.match(/\bgr(?:ade)?\s*(8|9|1[0-2])\b/);
  if (match) return match[1];
  match = m.match(/\bg(8|9|1[0-2])\b/);
  if (match) return match[1];
  return null;
}

function appendGradeNudge(session, text) {
  if (
    session &&
    session.help_sent &&
    !session.grade_detected &&
    !session.grade_nudge_sent
  ) {
    session.grade_nudge_sent = true;
    return (
      text +
      "\n\nQuick one: Which Grade are you in (8–12)? I’ll tailor the level."
    );
  }
  return text;
}


function computeIntentConfidence(lower) {
  let score = 0;

  // Direct goal keywords
  if (
    /\b(homework|practice|exam|past paper|past papers|revision|revise|explain|concept)\b/.test(
      lower
    )
  )
    score += 0.45;

  // Subject / topic indicators
  if (
    /\balgebra|trig|trigonometry|functions?|geometry|statistics?|stats|probability|patterns?|finance|calculus|series\b/.test(
      lower
    )
  )
    score += 0.25;

  // Grade signal
  if (
    /\bgrade\s*(8|9|1[0-2])\b|\bgr\s*(8|9|1[0-2])\b|\bg(8|9|1[0-2])\b/.test(
      lower
    )
  )
    score += 0.15;

  // Difficulty / intent refiners
  if (
    /\bharder|easy|medium|challenge|tough|difficult|revision pack|set\b/.test(
      lower
    )
  )
    score += 0.1;

  // Multi-token structure (presence of at least 2 “signal” clusters)
  const clusters = [
    /\bpractice|homework|exam|revise|explain|concept\b/,
    /\balgebra|trig|functions?|geometry|statistics?|probability|finance|calculus\b/,
    /\bgrade\s*(8|9|1[0-2])\b|\bgr\s*(8|9|1[0-2])\b|\bg(8|9|1[0-2])\b/,
  ];
  const hits = clusters.reduce((acc, r) => (r.test(lower) ? acc + 1 : acc), 0);
  if (hits >= 2) score += 0.05;

  if (score > 1) score = 1;
  return score;
}


function detectTopicSwitch(lower) {
  if (/\bstat|statistics\b/.test(lower)) return "statistics";
  if (/\btrig|sine|cosine|tan\b/.test(lower)) return "trigonometry";
  if (/\bfunction|parabola|exponential|log\b/.test(lower)) return "functions";
  if (/\balgebra|factor|equation|inequal|quadratic\b/.test(lower))
    return "algebra";
  if (/\bgeometry|midpoint|gradient|distance|coordinate|circle\b/.test(lower))
    return "geometry";
  return null;
}

function guessTopic(lower) {
  return detectTopicSwitch(lower);
}

function pureTopicOnly(lower) {
  const topic = detectTopicSwitch(lower);
  if (!topic) return false;
  if (
    /(practice|homework|solve|exam|concept|explain|more|question)/.test(lower)
  )
    return false;
  return true;
}

function applyPracticePack(session, practicePack) {
  session.help_sent = true;
  session.last_help_type = "practice_pack";
  session.expectation = practicePack.expectation;
  session.practice.topic = practicePack.topic;
  session.practice.difficulty = practicePack.difficulty;
  practicePack.question_ids.forEach((id) => {
    if (!session.practice.used_question_ids.includes(id)) {
      session.practice.used_question_ids.push(id);
    }
  });
  session.practice.current_questions = practicePack.questions || [];
  session.support.confusion_stage = 0;
  session.support.last_hint_for_topic = session.practice.topic;
}

function applyDiagnostic(session, diag) {
  session.help_sent = true;
  session.last_help_type = diag.help_type; // "diagnostic_question"
  session.expectation = diag.expectation;
  session.practice.topic = diag.topic;
  session.practice.difficulty = diag.difficulty;
  session.practice.current_questions = [
    { id: diag.question.id, q: diag.question.text },
  ];
  session.support.confusion_stage = 0;
  session.support.last_hint_for_topic = session.practice.topic;
}

function applyPackToSession(session, pack, topic) {
  session.help_sent = true;
  session.last_help_type = pack.help_type;
  session.expectation = pack.expectation;
  if (topic) session.practice.topic = normalizeTopic(topic);
}

async function quickSolve(raw) {
  const cleaned = raw.replace(/\s+/g, "");
  const linear = cleaned.match(/^(-?\d*)x([+\-]\d+)?=(-?\d+)$/i);
  if (linear) {
    let a = linear[1];
    if (a === "" || a === "+") a = 1;
    if (a === "-") a = -1;
    a = Number(a);
    const b = Number(linear[2] || 0);
    const c = Number(linear[3]);
    const x = (c - b) / a;
    return `Solving ${raw}\n⇒ x = (${
      c - b
    })/${a} = ${x}. Want a harder one or a different topic?`;
  }
  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4",
      temperature: 0.4,
      max_tokens: 160,
      messages: [
        {
          role: "system",
          content:
            "Solve succinctly (≤80 words). End with one short follow-up question.",
        },
        { role: "user", content: raw },
      ],
    });
    return (completion.choices[0].message.content || "").trim();
  } catch {
    return "Send a clear equation or simpler form; I'll try again.";
  }
}

function selectHintQuestion(session, userMessageLower = "") {
  if (!session.practice || !Array.isArray(session.practice.current_questions))
    return { index: 0, question: "" };
  // Detect explicit question number: "hint 2", "q2", "question 3", "number 2", "stuck on 2"
  const match = userMessageLower.match(
    /\b(?:q(uestion)?|number|#)?\s*(\d{1,2})\b/
  );
  let idx = 0;
  if (match) {
    const n = parseInt(match[2], 10);
    if (!isNaN(n) && n >= 1 && n <= session.practice.current_questions.length) {
      idx = n - 1;
    }
  }
  const qObj =
    session.practice.current_questions[idx] ||
    session.practice.current_questions[0];
  const questionText = qObj?.q || qObj?.question_text || "";
  return { index: idx, question: questionText };
}

async function generateAIHint({
  question,
  stage,
  topic,
  difficulty,
  grade,
  userMessage,
}) {
  const MAX_WORDS = 45;
  // Stage meaning guidance
  const stageGuides = {
    0: "Identify the problem type and the very first micro-step. Do NOT solve.",
    1: "Give the first operation or transformation ONLY. No final answer.",
    2: "Move one layer deeper. If algebra, isolate further or set up simplified form. No final numeric result.",
    3: "Provide near-complete structure WITHOUT outright final answer unless trivially obvious. Offer a binary micro-prompt.",
    4: "Allow giving full reasoning outline (not just the final number). If simple, you may confirm answer. Offer next action option.",
  };
  const stageGuide = stageGuides[stage] || stageGuides[0];

  const systemPrompt = `
You are a South African CAPS-aligned tutoring assistant on WhatsApp.
You produce one concise, step-focused hint for the student's specific question.
Rules:
- Tailor to Grade ${
    grade || "unknown"
  } (if unknown, assume mid grade 10–11 level).
- Reference the exact question content briefly.
- Do NOT dump full solution before stage 4.
- NEVER give multiple questions in your hint.
- End with ONE short prompt (a question OR an either/or choice).
- Max ${MAX_WORDS} words.
- Avoid phrasing: "You should..." more than once.
- Keep it friendly, motivating, no fluff.
Stage context: ${stageGuide}
Return ONLY the hint text (no JSON, no labels).
`;

  const userPrompt = `
Question: ${question}
Topic Guess: ${topic}
Difficulty: ${difficulty}
Stage: ${stage}
Learner message: "${userMessage || ""}"
Produce the hint now.
`.trim();

  try {
    const { getOpenAIClient } = require("../lib/config/openai");
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4",
      temperature: 0.4,
      max_tokens: 200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    let hint = (completion.choices?.[0]?.message?.content || "").trim();
    // Safety trims
    hint = hint.replace(/\n{2,}/g, "\n").replace(/\s{2,}/g, " ");
    // Hard cap on words
    const words = hint.split(/\s+/);
    if (words.length > MAX_WORDS) {
      hint = words.slice(0, MAX_WORDS).join(" ");
    }
    return hint;
  } catch (err) {
    console.warn("AI hint generation failed, falling back:", err.message);
    return null;
  }
}

async function buildProgressiveHint(session, userMessageLower = "") {
  if (!session.support) session.support = { confusion_stage: 0 };
  const stage = session.support.confusion_stage || 0;
  const topic = session.practice.topic || "algebra";
  const difficulty = session.practice.difficulty;
  const { index: qIndex, question } = selectHintQuestion(
    session,
    userMessageLower
  );
  const grade = session.grade_detected;

  // Try AI
  let aiHint = await generateAIHint({
    question,
    stage,
    topic,
    difficulty,
    grade,
    userMessage: userMessageLower,
  });

  // If AI fails, fallback to existing static topic functions
  if (!aiHint) {
    let fallback;
    if (topic === "algebra") fallback = algebraHint(stage, question);
    else if (topic === "functions") fallback = functionsHint(stage, question);
    else if (topic === "trigonometry") fallback = trigHint(stage, question);
    else if (topic === "statistics") fallback = statsHint(stage, question);
    else fallback = genericHint(stage, question);
    aiHint = fallback;
  }

  // Label (quiet) if multiple questions
  const prefix =
    session.practice.current_questions?.length > 1 ? `(Q${qIndex + 1}) ` : "";

  // Increment stage (cap at 4)
  session.support.confusion_stage = Math.min(stage + 1, 4);

  return prefix + aiHint;
}

function summarizeData(message) {
  const nums = message
    .split(/[,;\s]+/)
    .map((n) => Number(n))
    .filter((n) => !isNaN(n));
  if (!nums.length) return "No numbers detected. Send comma-separated values.";
  nums.sort((a, b) => a - b);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const median =
    nums.length % 2
      ? nums[(nums.length - 1) / 2]
      : (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2;
  const range = nums[nums.length - 1] - nums[0];
  return `Data summary: n=${nums.length}, mean=${round(mean)}, median=${round(
    median
  )}, range=${round(range)}.`;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

function algebraHint(stage, q) {
  switch (stage) {
    case 0:
      return "Identify the type: This is an algebra problem. First: isolate the variable. What term should you remove first? (Say it or 'still stuck').";
    case 1:
      return "Do the inverse operation on both sides. After that step, what simpler form do you get? (Reply or say 'hint').";
    case 2:
      return "Perform that operation now. You should have something like ax = b. What would x be? (Or say 'still stuck').";
    case 3:
      return "Result pattern: if 2x = 12 then x = 12 ÷ 2 = 6. Want a simpler example or proceed to a harder question? (Say 'simpler' or 'harder').";
    default:
      return "Great—ready to push on? Say 'more' for harder set, or name a new topic. If another hint needed just say 'hint'.";
  }
}

function functionsHint(stage, q) {
  switch (stage) {
    case 0:
      return "Focus: substitute x carefully. Write the expression clearly. What’s the first substitution you’d do? (Reply or 'still stuck').";
    case 1:
      return "Combine like terms after substitution. What intermediate value do you get? ('hint' if stuck).";
    case 2:
      return "Check if you can rewrite into vertex/intercepts form. Which form are you aiming for? (Say it or 'still stuck').";
    case 3:
      return "Typical flow: expand → simplify → identify pattern. Want a worked outline or a simpler one? (Say 'outline' or 'simpler').";
    default:
      return "Ready for more? Say 'more' or switch topic.";
  }
}

function trigHint(stage, q) {
  switch (stage) {
    case 0:
      return "Spot identity or isolate the trig ratio first. Which ratio/identity appears? (Reply or 'still stuck').";
    case 1:
      return "After isolating, write θ = inverse trig of value (respect domain). Need that inverse step? ('hint').";
    case 2:
      return "List all solutions in the interval. Which quadrants give valid signs? (Answer or 'still stuck').";
    case 3:
      return "General pattern: isolate -> inverse -> quadrant check. Want a simpler trig example or push harder? (Say 'simpler' or 'harder').";
    default:
      return "Say 'more' for harder or switch topic.";
  }
}

function statsHint(stage, q) {
  switch (stage) {
    case 0:
      return "Step 1: Order the data. Can you list it sorted? (Reply or 'still stuck').";
    case 1:
      return "Mean: sum ÷ count. Have you summed yet? (Say value or 'hint').";
    case 2:
      return "Median: middle value (or average of two middles). Do you know how many items there are? (Reply or 'still stuck').";
    case 3:
      return "Range: max − min. Want a formula recap or a new dataset? (Say 'recap' or 'new').";
    default:
      return "Ready for a harder set? Say 'more' or switch topic.";
  }
}

function genericHint(stage, q) {
  switch (stage) {
    case 0:
      return "Identify category: What type of operation or concept is central here? (Reply or 'still stuck').";
    case 1:
      return "Break it into smallest steps: what’s the very first transform? (Answer or 'hint').";
    case 2:
      return "Carry out that transform and rewrite the result. (Or say 'still stuck').";
    case 3:
      return "Pattern: classify → first transform → simplify → next step. Want simpler or harder? (Say 'simpler' or 'harder').";
    default:
      return "Continue? 'more' for harder or new topic name.";
  }
}
module.exports.default = module.exports;
