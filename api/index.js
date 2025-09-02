// api/index.js - Main WhatsApp Webhook Handler
// Copy this entire file to replace your current version

const { getOpenAIClient } = require("../lib/config/openai");
const { CAPS_SUBJECTS } = require("../lib/caps-knowledge");

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Handle GET requests (info page)
    if (req.method === "GET") {
      return res.status(200).json({
        project: "WhatsApp AI Tutor - Grade 11 Mathematics",
        status: "✅ LIVE AND WORKING!",
        developer: "tasimaditheto",
        features: "CAPS-aligned Grade 11 Mathematics tutoring",
      });
    }

    // Handle POST requests (ManyChat webhook)
    if (req.method === "POST") {
      console.log(
        "📨 ManyChat webhook received:",
        JSON.stringify(req.body, null, 2)
      );

      const webhookData = req.body || {};

      // Extract student information
      const student = {
        subscriber_id:
          webhookData.subscriber_id || webhookData.psid || "unknown",
        first_name: webhookData.first_name || "Student",
        message:
          webhookData.message ||
          webhookData.text ||
          webhookData.last_input_text ||
          "Hello",
      };

      // Auto-generate echo if missing
      let echo =
        webhookData.echo || `auto_${Date.now()}_${student.subscriber_id}`;

      console.log(
        `👤 Student: ${student.first_name} (${student.subscriber_id})`
      );
      console.log(`💬 Message: "${student.message}"`);

      // Special handling for "Hi" messages - FIXED RESPONSE
if (
  student.message.trim().toLowerCase() === "hi" ||
  student.message.trim().toLowerCase() === "hello" ||
  student.message.trim().toLowerCase() === "hey"
) {
  const welcomeMessage = `Welcome to your Grade 11 Mathematics AI Tutor! 📚

Just tell me what you want me to help you with.

I can assist with:
• 🔢 Algebra & equations
• 📈 Functions & graphs
• 📐 Trigonometry
• 📏 Geometry
• 📊 Statistics`;

  return res.status(200).json({
    echo: echo,
    message: welcomeMessage,
    version: "v2",
    content: {
      messages: [{ type: "text", text: welcomeMessage }],
      quick_replies: [
        { title: "📈 Functions", payload: "g11_math_functions" },
        { title: "📐 Trigonometry", payload: "g11_math_trig" },
        { title: "🔢 Algebra", payload: "g11_math_algebra" },
      ],
    },
    timestamp: new Date().toISOString(),
  });
}
      // For all other messages, use the Grade 11 Maths AI Tutor
      const tutorResponse = await getGrade11MathsTutorResponse(student);

      const response = {
        echo: echo,
        message: tutorResponse.message,
        version: "v2",
        content: {
          messages: [{ type: "text", text: tutorResponse.message }],
          quick_replies: tutorResponse.quick_replies || [],
        },
        timestamp: new Date().toISOString(),
      };

      console.log("📤 Grade 11 Maths AI Tutor Response Sent");
      return res.status(200).json(response);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("❌ AI Tutor error:", error);

    const echo = req.body?.echo || `error_${Date.now()}`;

    return res.status(200).json({
      echo: echo,
      message:
        "I'm having trouble processing your request right now. Please try again!",
      version: "v2",
      content: {
        messages: [
          {
            type: "text",
            text: "I'm having trouble processing your request right now. Please try again!",
          },
        ],
      },
      error: true,
      timestamp: new Date().toISOString(),
    });
  }
};

// GRADE 11 MATHS TUTOR RESPONSE
async function getGrade11MathsTutorResponse(student) {
  try {
    const openai = getOpenAIClient();

    // Get Grade 11 Mathematics topics from CAPS curriculum
    const mathsTopics = CAPS_SUBJECTS.core.Mathematics.topics[11] || [
      "Functions",
      "Number Patterns",
      "Algebra",
      "Geometry",
      "Trigonometry",
      "Statistics",
      "Probability",
    ];

    // Build context for the AI with CAPS curriculum knowledge
    const topicsContext = mathsTopics.join(", ");

const completion = await openai.chat.completions.create({
  model: "gpt-4",
  temperature: 0.7,
  max_tokens: 500,
  messages: [
    {
      role: "system",
      content: `You are a specialized Grade 11 Mathematics tutor for South African students following the CAPS curriculum.

YOUR EXPERTISE:
- Deep knowledge of Grade 11 CAPS Mathematics: ${topicsContext}
- Step-by-step problem solving
- Clear explanations of mathematical concepts
- Exam preparation and practice questions

STUDENT INFO:
- Name: ${student.first_name}
- Message: "${student.message}"

FORMATTING GUIDELINES:
- Use WhatsApp-friendly formatting with line breaks for readability
- Bold important concepts by placing *asterisks* around them
- For steps in a solution, use clear numbering (1., 2., 3.) with line breaks
- Use emojis strategically to highlight key points:
  • 📈 For functions
  • 🔢 For algebra
  • 📐 For trigonometry
  • 📏 For geometry
  • 📊 For statistics
  • ✏️ For examples
  • 💡 For tips
  • ⚠️ For common mistakes
  • ✅ For correct answers
- Use bulleted lists (•) for multiple points or steps
- For equations, use clear spacing and formatting

RESPONSE GUIDELINES:
- Be conversational and natural like a real tutor
- Don't use greetings at the start of every message
- If the student asks about a Grade 11 Maths topic, provide specific, accurate information
- If they ask about a different subject or grade, politely explain you specialize in Grade 11 Maths only
- When explaining mathematics, use clear, step-by-step approaches
- If they ask which topics you can help with, list specific Grade 11 CAPS Mathematics topics
- Remember previous context in the conversation
- Make students feel supported and encouraged

Respond as a knowledgeable, helpful Grade 11 Mathematics tutor would.`,
    },
    {
      role: "user",
      content: student.message,
    },
  ],
});

    const aiResponse = completion.choices[0].message.content;

    // Determine appropriate quick replies based on message context
    let quickReplies = [];

    // Check for topic mentions to provide relevant quick replies
    const lowerMessage = student.message.toLowerCase();

    if (lowerMessage.includes("function")) {
      quickReplies = [
        { title: "Quadratic Functions", payload: "g11_math_quadratic" },
        { title: "Exponential Functions", payload: "g11_math_exponential" },
        { title: "Hyperbolic Functions", payload: "g11_math_hyperbolic" },
      ];
    } else if (lowerMessage.includes("trig")) {
      quickReplies = [
        { title: "Trig Identities", payload: "g11_math_trig_identities" },
        { title: "Sine Rule", payload: "g11_math_sine_rule" },
        { title: "Cosine Rule", payload: "g11_math_cosine_rule" },
      ];
    } else if (lowerMessage.includes("algebra")) {
      quickReplies = [
        { title: "Exponents", payload: "g11_math_exponents" },
        { title: "Equations", payload: "g11_math_equations" },
        { title: "Inequalities", payload: "g11_math_inequalities" },
      ];
    } else {
      quickReplies = [
        { title: "Functions", payload: "g11_math_functions" },
        { title: "Trigonometry", payload: "g11_math_trigonometry" },
        { title: "Need Example", payload: "g11_math_example" },
      ];
    }

    return {
      message: aiResponse,
      quick_replies: quickReplies,
    };
  } catch (error) {
    console.error("❌ Grade 11 Maths Tutor error:", error);
    return {
      message: `I'm having a technical issue right now. Can you please rephrase your Grade 11 Mathematics question?`,
      quick_replies: [
        { title: "Functions Help", payload: "g11_math_functions" },
        { title: "Trigonometry Help", payload: "g11_math_trigonometry" },
        { title: "Show Topics", payload: "g11_math_topics" },
      ],
    };
  }
}
