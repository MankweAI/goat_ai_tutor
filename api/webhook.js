// api/webhook.js
// ManyChat webhook: now fully AI-powered with proper echo handling
// Copy this entire file exactly.

const { getOpenAIClient } = require("../lib/config/openai");

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

    console.log(`📨 Processing for student: ${student.full_name}`);
    console.log(`💬 Message: "${student.message}"`);

    // Use real AI for intent detection
    const intent = await detectIntentWithAI(student.message);

    // Get AI-generated response instead of template
    const agentResponse = await getAIAgentResponse(intent, student);

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

    console.log(`📤 AI ${agentResponse.agent} agent response sent`);
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

// -------- AI Agent Functions --------

// Real AI intent detection
async function detectIntentWithAI(message = "") {
  try {
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      max_tokens: 100,
      messages: [
        {
          role: "system",
          content: `You are an AI education specialist analyzing a student message for intent.
          
Response format (JSON):
{
  "category": "homework_help|practice_questions|past_papers|greeting|general_query",
  "agent": "homework|practice|papers|conversation",
  "confidence": 0.1-1.0
}

Analyze this WhatsApp message for educational needs.`,
        },
        {
          role: "user",
          content: `Student message: "${message}"`,
        },
      ],
    });

    // Parse AI response
    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("AI intent detection error:", error);

    // Fallback to basic detection if AI fails
    const m = message.toLowerCase();
    if (m.includes("homework") || m.includes("help"))
      return { category: "homework_help", agent: "homework", confidence: 0.8 };
    if (m.includes("practice") || m.includes("questions"))
      return {
        category: "practice_questions",
        agent: "practice",
        confidence: 0.8,
      };
    if (m.includes("past") || m.includes("paper") || m.includes("exam"))
      return { category: "past_papers", agent: "papers", confidence: 0.8 };
    if (m.includes("hi") || m.includes("hello") || m.includes("hey"))
      return { category: "greeting", agent: "conversation", confidence: 0.8 };
    return {
      category: "general_query",
      agent: "conversation",
      confidence: 0.6,
    };
  }
}

// Real AI agent response generation
async function getAIAgentResponse(intent, student) {
  try {
    const openai = getOpenAIClient();

    // Determine which AI agent to use
    let systemPrompt;
    const agentType = intent.agent;

    // Different specialized agent prompts
    switch (agentType) {
      case "homework":
        systemPrompt = `You are a Homework Help AI Agent for a WhatsApp CAPS curriculum tutor. 
You specialize in helping South African students solve homework problems step-by-step.

Student info:
- Name: ${student.first_name}
- Message: "${student.message}"

Your response should:
- Be friendly and encouraging
- Use natural WhatsApp style (brief, with appropriate emojis)
- Ask for specific details about their homework problem if needed
- Focus on educational guidance rather than just giving answers
- Be appropriate for WhatsApp chat format`;
        break;

      case "practice":
        systemPrompt = `You are a Practice Questions AI Agent for a WhatsApp CAPS curriculum tutor.
You specialize in generating practice questions aligned with South African curriculum.

Student info:
- Name: ${student.first_name}
- Message: "${student.message}"

Your response should:
- Be friendly and encouraging
- Use natural WhatsApp style (brief, with appropriate emojis)
- Ask what subject and grade level they want to practice
- Focus on educational value and curriculum alignment
- Be appropriate for WhatsApp chat format`;
        break;

      case "papers":
        systemPrompt = `You are a Past Papers AI Agent for a WhatsApp CAPS curriculum tutor.
You specialize in helping South African students with exam preparation and past papers.

Student info:
- Name: ${student.first_name}
- Message: "${student.message}"

Your response should:
- Be friendly and encouraging
- Use natural WhatsApp style (brief, with appropriate emojis)
- Ask which subject and grade they need papers for
- Focus on exam preparation strategies
- Be appropriate for WhatsApp chat format`;
        break;

      case "conversation":
      default:
        systemPrompt = `You are a Conversation Manager AI Agent for a WhatsApp CAPS curriculum tutor.
You specialize in guiding conversations and routing students to specialized educational agents.

Student info:
- Name: ${student.first_name}
- Message: "${student.message}"

Your response should:
- Be warm, friendly and welcoming
- Use natural WhatsApp style (brief, with appropriate emojis)
- Explain your capabilities (homework help, practice questions, past papers)
- Ask what specific help they need
- Be appropriate for WhatsApp chat format`;
        break;
    }

    // Generate AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: student.message },
      ],
    });

    const aiResponseText = completion.choices[0].message.content;

    // Generate appropriate quick replies based on agent type
    let quickReplies = [];

    if (agentType === "homework") {
      quickReplies = [
        { title: "📐 Mathematics", payload: "subject_mathematics" },
        { title: "🔬 Physical Science", payload: "subject_science" },
        { title: "📖 English", payload: "subject_english" },
      ];
    } else if (agentType === "practice") {
      quickReplies = [
        { title: "Grade 8-9", payload: "grade_junior" },
        { title: "Grade 10-11", payload: "grade_senior" },
        { title: "Grade 12", payload: "grade_matric" },
      ];
    } else if (agentType === "papers") {
      quickReplies = [
        { title: "📐 Math Papers", payload: "papers_math" },
        { title: "🔬 Science Papers", payload: "papers_science" },
        { title: "📖 English Papers", payload: "papers_english" },
      ];
    } else {
      quickReplies = [
        { title: "📚 Homework Help", payload: "homework_help" },
        { title: "📝 Practice", payload: "practice_questions" },
        { title: "📄 Past Papers", payload: "past_papers" },
      ];
    }

    return {
      agent: agentType,
      message_text: aiResponseText,
      quick_replies: quickReplies,
    };
  } catch (error) {
    console.error("AI agent response error:", error);

    // Fallback response if AI fails
    return {
      agent: intent.agent || "conversation",
      message_text: `Hi ${student.first_name}! I can help with your studies. What subject are you working on?`,
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
