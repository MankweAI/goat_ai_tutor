// api/webhook.js
// Enhanced free-form webhook with:
// - Difficulty progression for practice
// - Unique question rotation
// - Topic switching at ANY time
// - No quick replies
// KEEP IT SIMPLE FOR NOW (in-memory)

const {
  buildPracticePack,
  buildConceptPack,
  buildHomeworkScaffold,
  buildExamPrepPack,
  nextDifficulty,
  normalizeTopic,
} = require("../lib/assist-packs");
const { getOpenAIClient } = require("../lib/config/openai");

// In-memory sessions (simple)
const sessions = new Map();
function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      turns: 0,
      welcome_sent: false,
      help_sent: false,
      last_help_type: null,
      expectation: null,

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

const WELCOME = `Welcome to your Grade 11 Mathematics AI Tutor! 📚

Just tell me what you want me to help you with.

I can assist with:
• 🔢 Algebra & equations
• 📈 Functions & graphs
• 📐 Trigonometry
• 📏 Geometry
• 📊 Statistics`;

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

    // First greeting
    if (!session.welcome_sent && /^hi$|^hello$|^hey$/i.test(message)) {
      session.welcome_sent = true;
      return send(res, echo, WELCOME);
    }

    // Avoid welcome echo loops
    if (message.startsWith("Welcome to your Grade 11 Mathematics AI Tutor")) {
      return send(
        res,
        echo,
        "Just say what you need: homework help, practice, concept, exam prep."
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

    // If user wants to switch topic mid 'awaiting_answers' expectation
    if (topicSwitch) {
      const newTopic = topicSwitch;
      // If they ask explicitly for concept
      if (wantsExplanation && session.last_help_type !== "concept_pack") {
        const conceptPack = buildConceptPack(newTopic);
        applyPackToSession(session, conceptPack, newTopic);
        return send(res, echo, conceptPack.text);
      }
      // If they were in practice or ask for practice/ more
      if (
        session.last_help_type === "practice_pack" ||
        wantsPractice ||
        asksMore
      ) {
        // Reset practice state for new topic
        session.practice.topic = newTopic;
        session.practice.difficulty = "easy";
        session.practice.used_question_ids = [];
        const practicePack = buildPracticePack(newTopic, "easy", []);
        applyPracticePack(session, practicePack);
        return send(res, echo, practicePack.text);
      }
      // If they say 'homework' with topic
      if (wantsHomework) {
        const hw = buildHomeworkScaffold(message, newTopic);
        applyPackToSession(session, hw, newTopic);
        return send(res, echo, hw.text);
      }
      // Default: give concept pack for new topic
      const concept = buildConceptPack(newTopic);
      applyPackToSession(session, concept, newTopic);
      return send(res, echo, concept.text);
    }

    // If currently awaiting answers and user says 'more'
    if (
      session.last_help_type === "practice_pack" &&
      session.expectation === "awaiting_answers" &&
      asksMore
    ) {
      // Escalate difficulty
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

    // If awaiting answers and they try to change mode implicitly (e.g. "help me with stats"), we already covered topicSwitch. If they ask for explanation on current topic:
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

    // If user attempts to send answers (numbers or = or factoring words) while awaiting answers
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

    // If they explicitly request solutions
    if (
      /solution|answer/.test(lower) &&
      session.last_help_type === "practice_pack"
    ) {
      return send(
        res,
        echo,
        "Provide your attempt first (e.g. 1)=..., 2)=...). Then I’ll confirm or guide. Or say 'more' for the next level."
      );
    }

    // User asks for practice (initial or after concept)
    if (wantsPractice) {
      if (!session.practice.topic) {
        session.practice.topic = guessTopic(lower) || "algebra";
      }
      // Reset if switching from concept to practice
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

    // If user just says a topic (algebra / geometry / stats etc.) with no explicit intent
    if (!session.help_sent && pureTopicOnly(lower)) {
      const topic = guessTopic(lower) || "algebra";
      // Provide immediate practice starter (fast value)
      session.practice.topic = topic;
      session.practice.difficulty = "easy";
      session.practice.used_question_ids = [];
      const pack = buildPracticePack(topic, "easy", []);
      applyPracticePack(session, pack);
      return send(res, echo, pack.text);
    }

    // Fallback: encourage specification but keep momentum
    if (!session.help_sent) {
      return send(
        res,
        echo,
        "Tell me: practice, homework, concept, or exam prep—and include topic if you can (e.g. 'practice trig')."
      );
    }

    // Generic continuation
    return send(
      res,
      echo,
      "Continue—say 'more' for harder, name new topic (e.g. 'geometry'), or send an equation/data."
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
  // message contains a topic word but not other intent keywords
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
  // update practice state
  session.practice.topic = practicePack.topic;
  session.practice.difficulty = practicePack.difficulty;
  // add used ids
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
  if (topic) {
    session.practice.topic = normalizeTopic(topic);
  }
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
  // Fallback to AI (concise)
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
