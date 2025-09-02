// api/webhook.js
// Serverless Webhook Handler (MANYCHAT / WhatsApp)
// FIX: This file must export a FUNCTION (handler), not just helper objects.
// Free-form manager-first flow (simplified minimal version)

const { getOpenAIClient } = require("../lib/config/openai");
const {
  buildConceptPack,
  buildPracticePack,
  buildHomeworkScaffold,
  buildExamPrepPack,
} = require("../lib/assist-packs");

// In-memory minimal session store (replace later with Supabase)
const sessions = new Map();
function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      turns: 0,
      help_sent: false,
      last_help_type: null,
      expectation: null,
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
      note: "POST with ManyChat style payload { subscriber_id, first_name, text }",
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
    const name = (body.first_name || "").trim();

    if (!message) {
      return send(
        res,
        echo,
        "Send your Grade 11 Maths question or what you need help with."
      );
    }

    const session = getSession(userId);
    session.turns += 1;

    // First greeting
    if (session.turns === 1 && /^hi$|^hello$|^hey$/i.test(message)) {
      return send(res, echo, WELCOME);
    }

    // If user echoes welcome
    if (message.startsWith("Welcome to your Grade 11 Mathematics AI Tutor")) {
      return send(
        res,
        echo,
        "Just describe what you need: homework help, practice, or a concept."
      );
    }

    // Intent detection (simple)
    const lower = message.toLowerCase();
    let intent = "general";
    if (/homework|solve|assignment|steps/.test(lower)) intent = "homework";
    else if (/practice|questions|drill|exercise/.test(lower))
      intent = "practice";
    else if (/explain|what is|concept|definition|difference/.test(lower))
      intent = "concept";
    else if (/exam|past paper|revision|revise|prepare/.test(lower))
      intent = "exam";

    // If equation-like -> attempt quick solve
    if (/[=]/.test(message) || /\bsolve\b/i.test(message)) {
      const solved = await quickSolve(message);
      session.help_sent = true;
      session.last_help_type = "solution";
      return send(res, echo, solved);
    }

    // 3-turn activation: deliver help by turn 3 if not yet
    const mustDeliver = !session.help_sent && session.turns >= 3;

    if (!session.help_sent && (mustDeliver || intent !== "general")) {
      let topicGuess = guessTopic(message) || defaultTopic(intent);
      let pack;

      if (intent === "practice") pack = buildPracticePack(topicGuess);
      else if (intent === "homework")
        pack = buildHomeworkScaffold(message, topicGuess);
      else if (intent === "concept") pack = buildConceptPack(topicGuess);
      else if (intent === "exam") pack = buildExamPrepPack();
      else pack = buildConceptPack(topicGuess);

      session.help_sent = true;
      session.last_help_type = pack.help_type;
      session.expectation = pack.expectation;

      return send(res, echo, pack.text);
    }

    // Post-help handling (very lightweight)
    if (session.help_sent) {
      const follow = postHelpFollowUp(message, session);
      return send(res, echo, follow);
    }

    // Pre-help micro nudge (only once)
    return send(res, echo, microNudge(intent));
  } catch (e) {
    console.error("Webhook error:", e);
    return res.status(200).json({
      echo: req.body?.echo || "error_echo",
      version: "v2",
      content: {
        messages: [
          {
            type: "text",
            text: "Temporary issue. Re-send your maths question.",
          },
        ],
      },
      error: true,
    });
  }
};

// ----- Helpers -----
function send(res, echo, text) {
  return res.status(200).json({
    echo,
    version: "v2",
    content: { messages: [{ type: "text", text }] },
    timestamp: new Date().toISOString(),
  });
}

function microNudge(intent) {
  switch (intent) {
    case "homework":
      return "Send the exact homework question or equation so I can help.";
    case "practice":
      return "Which topic do you want practice on (e.g. factoring, functions, trig identities, stats)?";
    case "concept":
      return "Name the concept you want explained (e.g. standard deviation, sine rule, exponential).";
    case "exam":
      return "Which exam area first: algebra, functions, trig, geometry or statistics?";
    default:
      return "Tell me if you need homework help, practice, a concept explanation, or exam prep.";
  }
}

function guessTopic(msg) {
  const m = msg.toLowerCase();
  if (/stat|mean|median|deviation/.test(m)) return "statistics";
  if (/function|parabola|exponential|log|inverse/.test(m)) return "functions";
  if (/trig|sin|cos|tan|identity/.test(m)) return "trigonometry";
  if (/factor|equation|algebra|simplify|exponent|inequal|quadratic/.test(m))
    return "algebra";
  if (/geometry|midpoint|gradient|distance|circle|coordinate/.test(m))
    return "geometry";
  return null;
}
function defaultTopic(intent) {
  if (intent === "concept") return "functions";
  return "algebra";
}

function postHelpFollowUp(message, session) {
  const lower = message.toLowerCase();

  if (session.expectation === "awaiting_answers") {
    if (/more|another|harder/.test(lower)) {
      const pack = buildPracticePack("algebra");
      return pack.text;
    }
    if (/\d/.test(lower) || /mean|median|vertex|factor/.test(lower)) {
      return "Got your attempt. Want solutions, another set, or a new topic?";
    }
    return "Send your answers, say 'more', or switch topic by naming it.";
  }

  if (session.expectation === "awaiting_full_problem") {
    if (/[=]/.test(message) || /\bsolve\b/i.test(message)) {
      return "Great—processing. (If complex, break it into parts.)";
    }
    return "Please send the full problem (e.g. 2x^2 - 5x + 3 = 0) so I can solve it.";
  }

  if (session.expectation === "awaiting_dataset_or_choice") {
    if (/,/.test(message) && /\d/.test(message)) {
      const summary = summarizeData(message);
      return summary + " Want standard deviation next or more practice?";
    }
    return "Send the dataset (comma-separated) or state 'std dev' / 'practice'.";
  }

  if (session.expectation === "awaiting_exam_focus") {
    if (/algebra|function|trig|stat|geometry/.test(lower)) {
      return "Exam plan: short timed sets + quick review. Want a 3-question mini drill?";
    }
    return "Name first focus: algebra, functions, trig, geometry, or statistics.";
  }

  return "Continue—I can solve something, generate practice, or explain a concept. Just say what you want next.";
}

async function quickSolve(raw) {
  // Simple linear pattern: ax + b = c
  const line = raw.replace(/\s+/g, "");
  const linear = line.match(/^(-?\d*)x([+\-]\d+)?=(-?\d+)$/i);
  if (linear) {
    let a = linear[1];
    if (a === "" || a === "+") a = 1;
    if (a === "-") a = -1;
    a = Number(a);
    const b = Number(linear[2] || 0);
    const c = Number(linear[3]);
    const x = (c - b) / a;
    return `Solving ${raw}\n=> x = ${c - b}/${a} = ${x}. Need a harder one?`;
  }
  // Fallback to AI (concise)
  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4",
      temperature: 0.4,
      max_tokens: 180,
      messages: [
        {
          role: "system",
          content:
            "Solve or outline succinct Grade 11 solution (≤80 words). End with one question.",
        },
        { role: "user", content: raw },
      ],
    });
    return (completion.choices[0].message.content || "").trim();
  } catch {
    return "Send a clearer equation or dataset; if it's complex I'll break it down.";
  }
}

function summarizeData(message) {
  const nums = message
    .split(/[,;\s]+/)
    .map((n) => Number(n))
    .filter((n) => !isNaN(n));
  if (!nums.length) return "No numbers detected.";
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
