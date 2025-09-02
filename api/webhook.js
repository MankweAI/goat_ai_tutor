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
} = require("../lib/assist-packs");
const { getOpenAIClient } = require("../lib/config/openai");

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
    });
  }
  return sessions.get(id);
}

// NEW: First-time & returning welcome variants
const FIRST_TIME_WELCOME =
  "Hey 👋 Welcome to The GOAT. Need homework help, tougher practice, or a concept explained? Type it—I got you! 📚🔢";
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
      return send(res, echo, "Send your Grade 11 Maths question or request.");
    }

    const session = getSession(userId);
    session.turns += 1;
    session.last_interaction_at = Date.now();

    const isGreeting = /^hi$|^hello$|^hey$/i.test(message);

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

    // Equation-like direct solving
    if (/[=]/.test(message) || /\bsolve\b/i.test(message)) {
      const solved = await quickSolve(message);
      session.help_sent = true;
      session.last_help_type = "solution";
      session.expectation = null;
      return send(res, echo, solved);
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
        statsSummary + " Need practice or explanation next?"
      );
    }

    // Topic switch mid flow
    if (topicSwitch) {
      const newTopic = topicSwitch;
      if (wantsExplanation && session.last_help_type !== "concept_pack") {
        const conceptPack = buildConceptPack(newTopic);
        applyPackToSession(session, conceptPack, newTopic);
        return send(res, echo, conceptPack.text);
      }
      if (
        session.last_help_type === "practice_pack" ||
        wantsPractice ||
        asksMore
      ) {
        session.practice.topic = newTopic;
        session.practice.difficulty = "easy";
        session.practice.used_question_ids = [];
        const practicePack = buildPracticePack(newTopic, "easy", []);
        applyPracticePack(session, practicePack);
        return send(res, echo, practicePack.text);
      }
      if (wantsHomework) {
        const hw = buildHomeworkScaffold(message, newTopic);
        applyPackToSession(session, hw, newTopic);
        return send(res, echo, hw.text);
      }
      const concept = buildConceptPack(newTopic);
      applyPackToSession(session, concept, newTopic);
      return send(res, echo, concept.text);
    }

    // More (next difficulty)
    if (
      session.last_help_type === "practice_pack" &&
      session.expectation === "awaiting_answers" &&
      asksMore
    ) {
      const currentDiff = session.practice.difficulty;
      const nextDiff = nextDifficulty(currentDiff);
      session.practice.difficulty = nextDiff;
      const practicePack = buildPracticePack(
        session.practice.topic || "algebra",
        session.practice.difficulty,
        session.practice.used_question_ids
      );
      applyPracticePack(session, practicePack);
      return send(res, echo, practicePack.text);
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
      return send(res, echo, concept.text);
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
        "Noted. If you want solutions, say 'solutions', or say 'more' for a harder set, or name a new topic (e.g. 'geometry')."
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

    // Practice request
    if (wantsPractice) {
      if (!session.practice.topic) {
        session.practice.topic = guessTopic(lower) || "algebra";
      }
      if (session.last_help_type !== "practice_pack") {
        session.practice.difficulty = "easy";
        session.practice.used_question_ids = [];
      }
      const practicePack = buildPracticePack(
        session.practice.topic,
        session.practice.difficulty,
        session.practice.used_question_ids
      );
      applyPracticePack(session, practicePack);
      return send(res, echo, practicePack.text);
    }

    // Homework request
    if (wantsHomework) {
      const topicGuess =
        guessTopic(lower) || session.practice.topic || "algebra";
      const hw = buildHomeworkScaffold(message, topicGuess);
      applyPackToSession(session, hw, topicGuess);
      return send(res, echo, hw.text);
    }

    // Exam prep
    if (wantsExam) {
      const topicGuess = guessTopic(lower) || "algebra";
      const exam = buildExamPrepPack(topicGuess);
      applyPackToSession(session, exam, topicGuess);
      return send(res, echo, exam.text);
    }

    // Concept request
    if (wantsExplanation) {
      const topicGuess =
        guessTopic(lower) || session.practice.topic || "algebra";
      const concept = buildConceptPack(topicGuess);
      applyPackToSession(session, concept, topicGuess);
      return send(res, echo, concept.text);
    }

    // Bare topic mention
    if (!session.help_sent && pureTopicOnly(lower)) {
      const topic = guessTopic(lower) || "algebra";
      session.practice.topic = topic;
      session.practice.difficulty = "easy";
      session.practice.used_question_ids = [];
      const pack = buildPracticePack(topic, "easy", []);
      applyPracticePack(session, pack);
      return send(res, echo, pack.text);
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

module.exports.default = module.exports;
