// api/webhook.js - ManyChat Webhook Handler for Grade 11 Maths
// Copy this entire file to replace your current version

const { getOpenAIClient } = require("../lib/config/openai");
const { CAPS_SUBJECTS } = require("../lib/caps-knowledge");

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
        description: "Specialized in South African CAPS Grade 11 Mathematics",
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
    let echo = data.echo;
    if (!echo) {
      echo = `auto_${Date.now()}_${student.subscriber_id}`;
    }

    console.log(`📨 Processing for student: ${student.full_name}`);
    console.log(`💬 Message: "${student.message}"`);

    // Update the welcome message portion only (lines 58-75)

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
      echo,
      version: "v2",
      content: {
        messages: [{ type: "text", text: tutorResponse.message }],
        quick_replies: tutorResponse.quick_replies || [],
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`📤 Grade 11 Maths AI Tutor Response Sent`);
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
            text: "Sorry, I'm having trouble processing your request right now. Please try again.",
          },
        ],
      },
      error: true,
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

    // Update the AI prompt in getGrade11MathsTutorResponse (same as above)

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
    { title: "📈 Quadratic Functions", payload: "g11_math_quadratic" },
    { title: "📈 Exponential Functions", payload: "g11_math_exponential" },
    { title: "📈 Function Examples", payload: "g11_math_function_examples" },
  ];
} else if (lowerMessage.includes("trig")) {
  quickReplies = [
    { title: "📐 Trig Identities", payload: "g11_math_trig_identities" },
    { title: "📐 Sine & Cosine Rules", payload: "g11_math_sine_cosine" },
    { title: "📐 Trig Examples", payload: "g11_math_trig_examples" },
  ];
} else if (
  lowerMessage.includes("algebra") ||
  lowerMessage.includes("equation")
) {
  quickReplies = [
    { title: "🔢 Exponents", payload: "g11_math_exponents" },
    { title: "🔢 Solve Equations", payload: "g11_math_equations" },
    { title: "🔢 Practice Problems", payload: "g11_math_algebra_practice" },
  ];
} else if (lowerMessage.includes("exam") || lowerMessage.includes("test")) {
  quickReplies = [
    { title: "📝 Practice Test", payload: "g11_math_practice_test" },
    { title: "📝 Exam Tips", payload: "g11_math_exam_tips" },
    { title: "📝 Common Mistakes", payload: "g11_math_common_mistakes" },
  ];
} else {
  quickReplies = [
    { title: "📈 Functions", payload: "g11_math_functions" },
    { title: "📐 Trigonometry", payload: "g11_math_trigonometry" },
    { title: "🔢 Algebra", payload: "g11_math_algebra" },
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

// Export for Vercel
module.exports.default = module.exports;
