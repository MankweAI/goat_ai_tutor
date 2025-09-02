// api/webhook.js
// Grade 11 Mathematics WhatsApp Tutor (CAPS) - Concise, State-Aware, Agents-First
// COPY & REPLACE existing /api/webhook.js with this file

const { getOpenAIClient } = require("../lib/config/openai");
const { CAPS_SUBJECTS } = require("../lib/caps-knowledge");
const {
  getSession,
  updateSession,
  isDuplicate,
  addHistory,
} = require("../lib/session-state");
const { sanitizeName } = require("../lib/sanitize");
const {
  classify,
  normalizeSubtopic,
  SUBTOPIC_MAP,
} = require("../lib/topic-classifier");

const OPENAI_MODEL = "gpt-4"; // adjust if needed
const OPENAI_TIMEOUT_MS = 12000;

// --- Utility: build safe ManyChat response ---
function buildResponse(echo, text, quickReplies = []) {
  if (!text || typeof text !== "string" || !text.trim()) {
    text = "Please send a Grade 11 Maths topic or your exact question.";
  }
  return {
    echo,
    version: "v2",
    content: {
      messages: [{ type: "text", text }],
      quick_replies: quickReplies.slice(0, 3),
    },
    timestamp: new Date().toISOString(),
  };
}

// --- Quick reply builders ---
function qrTopics() {
  return [
    { title: "🔢 Algebra", payload: "g11_algebra" },
    { title: "📈 Functions", payload: "g11_functions" },
    { title: "📐 Trig", payload: "g11_trig" },
  ];
}

function qrForTopic(topic) {
  const map = {
    algebra: [
      { title: "Exponents", payload: "g11_alg_exponents" },
      { title: "Factoring", payload: "g11_alg_factoring" },
      { title: "Equations", payload: "g11_alg_equations" },
    ],
    functions: [
      { title: "Quadratic", payload: "g11_fun_quadratic" },
      { title: "Exponential", payload: "g11_fun_exponential" },
      { title: "Logarithmic", payload: "g11_fun_log" },
    ],
    trigonometry: [
      { title: "Identities", payload: "g11_trig_identities" },
      { title: "Sine/Cosine", payload: "g11_trig_rules" },
      { title: "Equations", payload: "g11_trig_equations" },
    ],
    geometry: [
      { title: "Distance", payload: "g11_geo_distance" },
      { title: "Midpoint", payload: "g11_geo_midpoint" },
      { title: "Gradient", payload: "g11_geo_gradient" },
    ],
    statistics: [
      { title: "Mean/Median", payload: "g11_stats_mean_median" },
      { title: "Std Dev", payload: "g11_stats_sd" },
      { title: "Quartiles", payload: "g11_stats_quartiles" },
    ],
    probability: [
      { title: "Counting", payload: "g11_prob_counting" },
      { title: "Venn", payload: "g11_prob_venn" },
      { title: "Tree", payload: "g11_prob_tree" },
    ],
  };
  return map[topic] || qrTopics();
}

// --- Fixed Welcome Message ---
const FIXED_WELCOME = `Welcome to your Grade 11 Mathematics AI Tutor! 📚

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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      return res.status(200).json({
        endpoint: "Grade 11 Maths AI Tutor",
        description: "State-aware CAPS aligned Grade 11 Maths chatbot",
      });
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const data = req.body || {};
    const student = {
      subscriber_id: data.subscriber_id || "unknown",
      first_name: data.first_name || "",
      message: (data.text || data.last_input_text || "").trim(),
    };
    let echo = data.echo || `auto_${Date.now()}_${student.subscriber_id}`;
    const cleanName = sanitizeName(student.first_name);

    // Guard: empty message
    if (!student.message) {
      return res
        .status(200)
        .json(
          buildResponse(
            echo,
            "Send a Grade 11 Maths topic (e.g. 'Functions', 'Trigonometry') or your specific question.",
            qrTopics()
          )
        );
    }

    console.log(`📨 Incoming (${student.subscriber_id}): "${student.message}"`);

    // LOOP / welcome echo detection
    if (
      student.message.startsWith(
        "Welcome to your Grade 11 Mathematics AI Tutor"
      )
    ) {
      return res
        .status(200)
        .json(
          buildResponse(
            echo,
            "Please type a topic like 'Functions', 'Algebra', 'Trigonometry' or send your full question.",
            qrTopics()
          )
        );
    }

    // Fixed greeting
    const lower = student.message.toLowerCase();
    if (["hi", "hello", "hey"].includes(lower)) {
      return res
        .status(200)
        .json(buildResponse(echo, FIXED_WELCOME, qrTopics()));
    }

    // Session
    const session = getSession(student.subscriber_id);

    // Duplicate detection
    if (isDuplicate(student.subscriber_id, student.message)) {
      return res
        .status(200)
        .json(
          buildResponse(
            echo,
            "Still here. Please refine: choose a topic (Algebra / Functions / Trig) or send your exact problem.",
            qrTopics()
          )
        );
    }

    // Classification
    const { topic: detectedTopic, subtopic: detectedSubtopicRaw } = classify(
      student.message
    );
    let topic = session.topic || detectedTopic;
    let subtopic = session.subtopic;
    if (!session.topic && detectedTopic) topic = detectedTopic;
    if (!subtopic && detectedSubtopicRaw)
      subtopic = normalizeSubtopic(topic, detectedSubtopicRaw);

    // State machine logic
    let awaiting = session.awaiting;

    // Transition rules
    if (awaiting === "topic" && topic) {
      awaiting = "subtopic";
    }
    if (awaiting === "subtopic" && topic && subtopic) {
      awaiting = "problem";
    }

    // If user explicitly supplies a math expression / problem (contains = or x^ or numbers + operations)
    const isProblemLike =
      /[=]/.test(student.message) ||
      /(\d+\s*[+−\-*/^]\s*\d+)/.test(student.message) ||
      /(solve|find|simplify|factor|prove)/i.test(student.message);
    if (awaiting === "problem" && isProblemLike) {
      awaiting = "solving";
    }

    // Update session
    updateSession(student.subscriber_id, {
      topic,
      subtopic,
      awaiting,
    });
    addHistory(student.subscriber_id, "user", student.message);

    // Fast deterministic handlers (no OpenAI)
    if (awaiting === "topic" && !topic) {
      return res
        .status(200)
        .json(
          buildResponse(
            echo,
            "Select a Grade 11 Maths area or type your topic:",
            qrTopics()
          )
        );
    }

    if (awaiting === "subtopic" && topic && !subtopic) {
      const subList = (SUBTOPIC_MAP[topic] || [])
        .slice(0, 5)
        .map((s) => formatBullet(s))
        .join("\n");
      const conciseTopicName = prettyTopic(topic);
      return res
        .status(200)
        .json(
          buildResponse(
            echo,
            `*${conciseTopicName}* – choose a focus:\n${subList}\n\nReply with one (e.g. "${firstWord(
              subList
            )}") or send your exact problem.`,
            qrForTopic(topic)
          )
        );
    }

    if (awaiting === "problem" && topic && subtopic && !isProblemLike) {
      return res
        .status(200)
        .json(
          buildResponse(
            echo,
            `Great. You chose *${prettyTopic(topic)} → ${capitalize(
              subtopic
            )}*.\nSend your specific problem or question now (e.g. numbers, equation, expression).`,
            qrForTopic(topic)
          )
        );
    }

    // If we reach here we either solve or give conceptual explanation => OpenAI
    const aiResult = await generateAIResponse({
      name: cleanName,
      message: student.message,
      topic,
      subtopic,
      mode: awaiting === "solving" || isProblemLike ? "solve" : "concept",
      history: session.history,
    });

    addHistory(student.subscriber_id, "assistant", aiResult.core);

    // After solve/concept, set awaiting followup
    updateSession(student.subscriber_id, { awaiting: "followup" });

    const followQR = topic ? qrForTopic(topic) : qrTopics();

    return res.status(200).json(buildResponse(echo, aiResult.core, followQR));
  } catch (err) {
    console.error("❌ Webhook fatal error:", err);
    const echo = (req.body && req.body.echo) || `error_${Date.now()}`;
    return res
      .status(200)
      .json(
        buildResponse(
          echo,
          "Temporary issue. Send a Grade 11 Maths topic (Algebra / Functions / Trig) or your question.",
          qrTopics()
        )
      );
  }
};

// --- AI Generation (concise) ---
async function generateAIResponse(ctx) {
  const { name, message, topic, subtopic, mode, history } = ctx;

  const openai = getOpenAIClient();

  // Reduce history to short summary lines
  const historyLines = history
    .filter((h) => h.role !== "system")
    .slice(-6)
    .map((h) => `${h.role === "user" ? "U" : "A"}: ${truncate(h.content, 120)}`)
    .join("\n");

  const systemPrompt = `
You are a concise, expert Grade 11 *Mathematics (CAPS)* tutor on WhatsApp.
CONSTRAINTS:
- Max ~80 words unless multi-step solution required.
- If solving steps > 5 lines: show first 3–4 steps then ask "Need full breakdown?".
- ONE focused follow-up question at end (unless user explicitly says "thanks" / ends).
- No greeting at start of every reply.
- Use minimal, relevant emojis (0–2). Use:
  🔢 Algebra, 📈 Functions, 📐 Trig, 📏 Geometry, 📊 Stats, 💡 Tip, ✅ Result, ⚠️ Mistake
- Bold key concepts with *asterisks*.
- Grade 11 CAPS only. If outside scope: politely redirect to Grade 11 Maths focus.

CURRENT CONTEXT:
Topic: ${topic || "unknown"}
Subtopic: ${subtopic || "none"}
Mode: ${mode}
Student Name: ${name || "Student"}

RECENT HISTORY:
${historyLines || "(none)"}

TASK:
Produce a helpful ${
    mode === "solve"
      ? "step-by-step solution/explanation"
      : "concise concept explanation"
  } for:
"${message}"

OUTPUT FORMAT (plain text WhatsApp ready):
- Core explanation / steps
- Follow-up question (exactly one) OR short prompt for next input.
Do NOT add section headings like "Solution:" — be natural.`.trim();

  const userPrompt = message;

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const completion = await openai.chat.completions.create(
      {
        model: OPENAI_MODEL,
        temperature: 0.6,
        max_tokens: 450,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
      { signal: controller.signal }
    );

    clearTimeout(to);

    const core = (completion.choices[0].message.content || "").trim();
    return { core };
  } catch (e) {
    clearTimeout(to);
    console.error("⚠️ OpenAI fallback:", e.message);
    // Fallback minimal response
    return {
      core: fallbackFor(topic, subtopic, mode),
    };
  }
}

// --- Fallback explanation templates ---
function fallbackFor(topic, subtopic, mode) {
  if (mode === "solve") {
    return "Let's solve this step-by-step, but I'm having a brief technical issue. Please restate the exact expression or equation so I can guide you.";
  }
  if (topic === "algebra") {
    return "*Algebra* 🔢 involves manipulating symbols & expressions. Specify: exponents, factoring, equations, inequalities or fractions?";
  }
  return "Please provide a specific Grade 11 Maths topic (Algebra / Functions / Trig / Geometry / Statistics) or your exact question.";
}

// --- Helpers ---
function prettyTopic(t) {
  return (
    {
      algebra: "Algebra",
      functions: "Functions",
      trigonometry: "Trigonometry",
      geometry: "Geometry",
      statistics: "Statistics",
      probability: "Probability",
      number_patterns: "Number Patterns",
    }[t] || capitalize(t || "")
  );
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function firstWord(linesJoined) {
  const firstLine = linesJoined.split("\n")[0];
  return firstLine.replace(/^[•\-\*\s]+/, "").split(/\s+/)[0];
}

function formatBullet(text) {
  return "• " + capitalize(text);
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n - 3) + "..." : str;
}

// Export for Vercel
module.exports.default = module.exports;
