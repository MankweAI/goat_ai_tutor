// api/webhook.js
// ManyChat webhook: now auto-generates echo if not supplied in request.
// Copy this entire file exactly.

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      return res.status(200).json({
        endpoint: "ManyChat Webhook",
        expects:
          "POST with subscriber data. 'echo' optional (auto-generated if missing).",
        response_format: {
          echo: "string",
          version: "v2",
          content: {
            messages: [{ type: "text", text: "..." }],
            quick_replies: [],
          },
        },
        example_request_body: {
          subscriber_id: "123456",
          first_name: "Sarah",
          last_name: "Student",
          text: "Hi I need help with my Grade 10 math homework",
          // echo: "(OPTIONAL) if you want to supply your own correlation id"
        },
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const data = req.body || {};

    // Build / normalize student info
    const student = {
      subscriber_id: data.subscriber_id || "unknown",
      first_name: data.first_name || "Student",
      last_name: data.last_name || "",
      full_name: `${data.first_name || "Student"} ${
        data.last_name || ""
      }`.trim(),
      message: data.text || data.last_input_text || "No message",
    };

    // Auto-generate echo if missing
    // Format: auto_<timestamp>_<subscriber_id>
    let echo = data.echo;
    if (!echo) {
      echo = `auto_${Date.now()}_${student.subscriber_id}`;
    }

    // Intent + agent selection (simple)
    const intent = detectIntent(student.message);
    const agentResponse = buildAgentResponse(intent, student.first_name);

    const response = {
      echo,
      version: "v2",
      content: {
        messages: [
          {
            type: "text",
            text: agentResponse.message_text,
          },
        ],
        quick_replies: agentResponse.quick_replies || [],
      },
      debug_info: {
        intent: intent.category,
        agent: agentResponse.agent,
        generated_echo: !data.echo,
        timestamp: new Date().toISOString(),
      },
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(200).json({
      echo: req.body?.echo || `error_${Date.now()}`,
      version: "v2",
      content: {
        messages: [
          {
            type: "text",
            text: "Sorry, something went wrong. Please try again.",
          },
        ],
      },
      error: true,
    });
  }
};

// -------- Helper functions --------
function detectIntent(message = "") {
  const m = message.toLowerCase();
  if (m.includes("homework") || m.includes("help"))
    return { category: "homework_help", agent: "homework" };
  if (m.includes("practice") || m.includes("questions"))
    return { category: "practice_questions", agent: "practice" };
  if (m.includes("past") || m.includes("paper") || m.includes("exam"))
    return { category: "past_papers", agent: "papers" };
  if (m.includes("hi") || m.includes("hello") || m.includes("hey"))
    return { category: "greeting", agent: "conversation" };
  return { category: "general_query", agent: "conversation" };
}

function buildAgentResponse(intent, firstName) {
  switch (intent.agent) {
    case "homework":
      return {
        agent: "homework",
        message_text: `Great! I can help with your homework, ${firstName}! 📚\nSend your specific question (subject + grade + problem).`,
        quick_replies: [
          { title: "📐 Mathematics", payload: "subject_mathematics" },
          { title: "🔬 Physical Science", payload: "subject_science" },
          { title: "📖 English", payload: "subject_english" },
        ],
      };
    case "practice":
      return {
        agent: "practice",
        message_text: `I'll generate practice questions, ${firstName}! 📝\nReply with subject + grade (e.g. "Grade 11 Physical Sciences Mechanics").`,
      };
    case "papers":
      return {
        agent: "papers",
        message_text: `Past papers time, ${firstName}! 📄\nTell me: "Grade 12 Mathematics" or similar to get papers + tips.`,
      };
    case "conversation":
    default:
      return {
        agent: "conversation",
        message_text: `Hi ${firstName}! I can help with:\n📚 Homework\n📝 Practice Questions\n📄 Past Papers\nWhat do you need?`,
        quick_replies: [
          { title: "📚 Homework Help", payload: "homework_help" },
          { title: "📝 Practice", payload: "practice_questions" },
          { title: "📄 Past Papers", payload: "past_papers" },
        ],
      };
  }
}

// Export for Vercel
module.exports.default = module.exports;
