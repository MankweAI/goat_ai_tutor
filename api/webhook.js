// api/webhook.js
// Grade 11 Mathematics WhatsApp Tutor (CAPS) - Free‑Form, State-Aware, Manager Agent Routing
// CHANGE LOG (this version):
// 1. REMOVED ALL QUICK REPLIES / FIXED OPTION BUTTONS (free-form only)
// 2. Only the FIRST greeting returns the fixed welcome message (with capabilities list).
// 3. Every other user message is routed IMMEDIATELY to the Manager AI Agent (intent + response).
// 4. No topic menus, no forced selection loops. Natural language only.
// 5. Conversation state: { intent, agent, stage, topic, subtopic } persisted in lightweight in-memory session.
// 6. Concise, one follow-up question per answer. No repeated capability list unless user explicitly asks "what can you do" / "help".
// 7. Robust fallback logic always returns a valid message (never null).
//
// NOTE: In a serverless environment, in-memory state will reset on cold start.
//       For persistence, mirror session object to Supabase later.
//
// ENV: Requires OPENAI_API_KEY
//
// MANYCHAT RESPONSE FORMAT: { echo, version:"v2", content:{ messages:[{type:"text", text: "..."}] } }

const { getOpenAIClient } = require("../lib/config/openai");
const {
  getSession,
  updateSession,
  isDuplicate,
  addHistory,
} = require("../lib/session-state");
const { sanitizeName } = require("../lib/sanitize");

const OPENAI_MODEL_MANAGER = "gpt-4"; // Manager agent (you may downgrade to gpt-3.5-turbo for cost)
const OPENAI_MODEL_SOLVER = "gpt-4"; // For deeper solutions (kept same for MVP)
const OPENAI_TIMEOUT_MS = 12000;

// ----------- FIXED WELCOME MESSAGE (ONLY SENT ON FIRST HI/HELLO/HEY) -----------
const FIXED_WELCOME = `Welcome to your Grade 11 Mathematics AI Tutor! 📚

Just tell me what you want me to help you with.

I can assist with:
• 🔢 Algebra & equations
• 📈 Functions & graphs
• 📐 Trigonometry
• 📏 Geometry
• 📊 Statistics`;

// ----------- RESPONSE BUILDER (NO QUICK REPLIES) -----------
function buildResponse(echo, text) {
  if (!text || typeof text !== "string" || !text.trim()) {
    text =
      "Please send your Grade 11 Maths question or describe what you need help with.";
  }
  return {
    echo,
    version: "v2",
    content: {
      messages: [{ type: "text", text }],
    },
    timestamp: new Date().toISOString(),
  };
}

// ----------- MAIN SERVERLESS HANDLER -----------
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
        mode: "free_form",
        description:
          "CAPS-aligned Grade 11 Maths AI tutor (no fixed options, AI Manager routed).",
        note: "Send POST with {subscriber_id, first_name, text}.",
      });
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body || {};
    const student = {
      subscriber_id: body.subscriber_id || "unknown",
      first_name: body.first_name || "",
      message: (body.text || body.last_input_text || "").trim(),
    };
    let echo = body.echo || `auto_${Date.now()}_${student.subscriber_id}`;
    const cleanName = sanitizeName(student.first_name);

    if (!student.message) {
      return res
        .status(200)
        .json(
          buildResponse(
            echo,
            "Please send your Grade 11 Maths question or say what you need help with."
          )
        );
    }

    console.log(`📨 Incoming (${student.subscriber_id}): "${student.message}"`);

    // Detect if user is echoing the welcome
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
            "Just send your question or say what you want to practice (e.g. 'I need help with trig identities')."
          )
        );
    }

    const lower = student.message.toLowerCase();

    // FIRST CONTACT GREETING -> fixed welcome ONLY once (if session fresh or greeting tokens)
    const isGreeting = ["hi", "hello", "hey"].includes(lower);
    const session = getSession(student.subscriber_id);
    const isFirstTurn = session.turns === 0;

    if (isGreeting && isFirstTurn) {
      updateSession(student.subscriber_id, { turns: session.turns + 1 });
      addHistory(student.subscriber_id, "assistant", FIXED_WELCOME);
      return res.status(200).json(buildResponse(echo, FIXED_WELCOME));
    }

    // Duplicate guard
    if (isDuplicate(student.subscriber_id, student.message)) {
      return res
        .status(200)
        .json(
          buildResponse(
            echo,
            "I already received that. Please continue with your Grade 11 Maths question or add more detail."
          )
        );
    }

    // If user asks capabilities again
    if (/what can you do|help|capabilities|options|menu/i.test(lower)) {
      updateSession(student.subscriber_id, { turns: session.turns + 1 });
      const recap =
        "I help with Grade 11 Maths: algebra, functions, trigonometry, geometry, statistics. Just describe your problem, ask to practice, or request an explanation.";
      addHistory(student.subscriber_id, "assistant", recap);
      return res.status(200).json(buildResponse(echo, recap));
    }

    // Route to Manager AI Agent (intent classification + appropriate answer generation)
    const managerResult = await managerPipeline({
      name: cleanName,
      message: student.message,
      session,
    });

    // Update session state from manager
    updateSession(student.subscriber_id, {
      turns: (session.turns || 0) + 1,
      intent: managerResult.intent || session.intent || null,
      agent: managerResult.agent || session.agent || null,
      stage:
        managerResult.stage ||
        managerResult.next_stage ||
        session.stage ||
        "followup",
      topic: managerResult.topic || session.topic || null,
      subtopic: managerResult.subtopic || session.subtopic || null,
    });

    addHistory(student.subscriber_id, "user", student.message);
    addHistory(student.subscriber_id, "assistant", managerResult.output);

    return res.status(200).json(buildResponse(echo, managerResult.output));
  } catch (err) {
    console.error("❌ Webhook fatal error:", err);
    const echo = (req.body && req.body.echo) || `error_${Date.now()}`;
    return res
      .status(200)
      .json(
        buildResponse(
          echo,
          "Temporary issue. Please resend your Grade 11 Maths question or request."
        )
      );
  }
};

// ----------- MANAGER PIPELINE -----------
async function managerPipeline(ctx) {
  // 1. Lightweight local intent detection
  const localIntent = classifyIntentLocally(ctx.message);

  // 2. If trivial (good enough), proceed without OpenAI classification (cost save)
  const needLLMIntent = localIntent.confidence < 0.8;

  let refinedIntent = localIntent;
  if (needLLMIntent) {
    try {
      refinedIntent = await classifyIntentLLM(ctx.message);
    } catch (e) {
      console.warn("⚠️ Intent LLM fallback:", e.message);
    }
  }

  // 3. Decide agent + stage
  const agentMapping = {
    homework_help: "homework",
    practice: "practice",
    concept: "concept",
    exam_prep: "exam_prep",
    general_query: "conversation",
  };
  const agent = agentMapping[refinedIntent.category] || "conversation";

  // Determine stage
  let stage = "followup";
  if (agent === "homework") stage = "collecting_details";
  if (agent === "practice") stage = "practice_setup";
  if (agent === "concept") stage = "concept_explain";
  if (agent === "exam_prep") stage = "exam_support";

  // 4. Generate actual response (choose specialized or generic)
  const response = await generateManagerResponse({
    ...ctx,
    intent: refinedIntent,
    agent,
    stage,
  });

  return {
    intent: refinedIntent.category,
    agent,
    stage,
    topic: response.topic || null,
    subtopic: response.subtopic || null,
    output: response.text,
  };
}

// ----------- LOCAL INTENT CLASSIFIER -----------
function classifyIntentLocally(message) {
  const m = message.toLowerCase();
  if (/(homework|solve|help me solve|equation|question|working)/.test(m))
    return { category: "homework_help", confidence: 0.85 };
  if (/(practice|drill|exercises|give me questions|more questions)/.test(m))
    return { category: "practice", confidence: 0.85 };
  if (/(explain|what is|definition|meaning of|concept)/.test(m))
    return { category: "concept", confidence: 0.8 };
  if (/(exam|test|past paper|revision|revise|prepare)/.test(m))
    return { category: "exam_prep", confidence: 0.8 };
  return { category: "general_query", confidence: 0.5 };
}

// ----------- LLM INTENT CLASSIFIER (FALLBACK) -----------
async function classifyIntentLLM(message) {
  const openai = getOpenAIClient();
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  const system = `You classify a Grade 11 Maths help message into one category:
homework_help | practice | concept | exam_prep | general_query
Respond JSON: {"category":"...","confidence":0.0-1.0,"reason":"brief"}`;

  try {
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-3.5-turbo",
        temperature: 0,
        max_tokens: 80,
        messages: [
          { role: "system", content: system },
          { role: "user", content: message },
        ],
      },
      { signal: controller.signal }
    );

    clearTimeout(to);
    const raw = completion.choices[0].message.content;
    return JSON.parse(raw);
  } catch (e) {
    clearTimeout(to);
    console.warn("LLM intent classification failed:", e.message);
    return { category: "general_query", confidence: 0.4, reason: "fallback" };
  }
}

// ----------- MANAGER RESPONSE GENERATOR -----------
async function generateManagerResponse(params) {
  const { name, message, intent, agent, stage, history } = params;

  // Heuristic fast responses for simple concept queries w/out need for full LLM
  if (
    agent === "practice" &&
    /practice|drill|question/i.test(message.toLowerCase())
  ) {
    return {
      text: "Sure. Which topic do you want practice in (e.g. factoring, quadratic functions, trig identities, analytical geometry, statistics)?",
    };
  }

  if (
    agent === "exam_prep" &&
    /exam|past paper|revision|revise/i.test(message.toLowerCase())
  ) {
    return {
      text: "Exam prep: specify focus—algebra procedures, functions graphs, trig identities, geometry proofs, or statistics interpretation? Pick one so I tailor support.",
    };
  }

  // Otherwise use OpenAI for natural, context-aware reply
  const openai = getOpenAIClient();
  const historyCondensed = (history || [])
    .slice(-6)
    .map(
      (h) =>
        `${h.role === "user" ? "U" : "A"}: ${h.content
          .replace(/\n+/g, " ")
          .slice(0, 140)}`
    )
    .join("\n");

  const systemPrompt = `
You are the MANAGER AI AGENT for a Grade 11 *Mathematics (CAPS curriculum)* WhatsApp tutor.
GOALS:
1. Interpret the student's free-form request.
2. If it's homework_help: extract any equation/problem; if missing details ask for the exact question (variables, numbers, expression).
3. If practice: ask for a clear topic inside Grade 11 Maths (only ONE focused follow-up question).
4. If concept: give a concise definition/explanation (≤70 words) plus ONE clarifying or next-step question.
5. If exam_prep: ask for specific area (e.g. algebra procedures, trig identities, functions, geometry, statistics).
6. If general_query: politely guide them to phrase what they need (homework question, concept, or practice).
7. NEVER list the whole capability catalogue again unless user explicitly asks what you can do. (User already saw welcome.)
8. ONE question at the end; minimal emojis (0–1). Only use relevant emoji (e.g. ✅, 💡, 🔢, 📈, 📐, 📏, 📊).
9. Keep tone supportive, concise, and professional. No greeting repetition.

CONTEXT:
Intent Category: ${intent.category}
Agent: ${agent}
Stage: ${stage}
Student Name: ${name || "Student"}

RECENT HISTORY:
${historyCondensed || "(none)"}

USER MESSAGE:
"${message}"

OUTPUT REQUIREMENTS:
- Plain text only.
- 1 concise explanatory / guiding block (no more than ~90 words).
- End with exactly ONE targeted question (unless user clearly ended).
- No bullet list unless absolutely needed; prefer a compact sentence.
- Do not repeat 'I can assist with algebra, functions...' unless explicitly asked for capabilities.
`;

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const completion = await openai.chat.completions.create(
      {
        model: OPENAI_MODEL_MANAGER,
        temperature: 0.55,
        max_tokens: 260,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      },
      { signal: controller.signal }
    );

    clearTimeout(to);
    const text = (completion.choices[0].message.content || "").trim();
    return { text };
  } catch (e) {
    clearTimeout(to);
    console.error("⚠️ Manager LLM failure:", e.message);
    // Fallback heuristic
    switch (intent.category) {
      case "homework_help":
        return {
          text: "Please send the full homework question (include the equation or expression) so I can guide you step-by-step.",
        };
      case "practice":
        return {
          text: "Which Grade 11 Maths topic do you want practice in: algebra, functions, trigonometry, geometry or statistics?",
        };
      case "concept":
        return {
          text: "Name the exact concept you want explained (e.g. 'hyperbolic function basics' or 'sine rule').",
        };
      case "exam_prep":
        return {
          text: "Specify exam focus: algebra techniques, trig identities, functions analysis, geometry proofs or statistics interpretation?",
        };
      default:
        return {
          text: "Tell me if you need homework help, practice, a concept explanation, or exam prep—and include the topic.",
        };
    }
  }
}

// ----------- EXPORT (Vercel) -----------
module.exports.default = module.exports;
