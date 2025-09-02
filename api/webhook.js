// api/webhook.js - Fixed to handle message loops and prevent null responses
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

    // NEW: Detect if the message is our own welcome message or very long message
    // This prevents message loops when users click on the bot's messages
    const welcomeMessageStart = "Welcome to your Grade 11 Mathematics AI Tutor";
    if (
      student.message.includes(welcomeMessageStart) ||
      student.message.length > 200
    ) {
      console.log(
        "⚠️ Detected potential message loop - user sent our welcome message back"
      );

      return res.status(200).json({
        echo: echo,
        version: "v2",
        content: {
          messages: [
            {
              type: "text",
              text: "I notice you may have clicked on my message. To get help with a specific topic, just type the topic name like 'Functions' or 'Trigonometry', or ask me a question!",
            },
          ],
          quick_replies: [
            { title: "📈 Functions", payload: "g11_math_functions" },
            { title: "📐 Trigonometry", payload: "g11_math_trig" },
            { title: "🔢 Algebra", payload: "g11_math_algebra" },
          ],
        },
        timestamp: new Date().toISOString(),
      });
    }

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

    // IMPROVED: Simple keyword detection for direct topics (fast response)
    // This handles single-word queries like "Algebra" directly without OpenAI call
    const lowerMessage = student.message.toLowerCase().trim();
    if (lowerMessage === "algebra") {
      return res.status(200).json({
        echo: echo,
        version: "v2",
        content: {
          messages: [
            {
              type: "text",
              text: `*Grade 11 Algebra* 🔢

In Grade 11 CAPS curriculum, Algebra includes:

• Exponents and surds
• Equations and inequalities
• Algebraic functions
• Linear programming
• Factorization of expressions
• Algebraic fractions

What specific algebra topic would you like help with?`,
            },
          ],
          quick_replies: [
            { title: "🔢 Exponents", payload: "g11_math_exponents" },
            { title: "🔢 Equations", payload: "g11_math_equations" },
            { title: "🔢 Inequalities", payload: "g11_math_inequalities" },
          ],
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Add similar direct handlers for other common topics
    if (lowerMessage === "functions") {
      return res.status(200).json({
        echo: echo,
        version: "v2",
        content: {
          messages: [
            {
              type: "text",
              text: `*Grade 11 Functions* 📈

In Grade 11 CAPS curriculum, Functions includes:

• Quadratic functions
• Exponential functions
• Logarithmic functions
• Hyperbolic functions
• Function interpretation
• Average gradient

What specific function type would you like to explore?`,
            },
          ],
          quick_replies: [
            { title: "📈 Quadratic", payload: "g11_math_quadratic" },
            { title: "📈 Exponential", payload: "g11_math_exponential" },
            { title: "📈 Logarithmic", payload: "g11_math_logarithmic" },
          ],
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (lowerMessage === "trigonometry") {
      return res.status(200).json({
        echo: echo,
        version: "v2",
        content: {
          messages: [
            {
              type: "text",
              text: `*Grade 11 Trigonometry* 📐

In Grade 11 CAPS curriculum, Trigonometry includes:

• Trigonometric functions
• Trigonometric identities
• Trigonometric equations
• Sine rule
• Cosine rule
• Area rule
• 2D problems

What specific trigonometry topic would you like help with?`,
            },
          ],
          quick_replies: [
            { title: "📐 Identities", payload: "g11_math_trig_identities" },
            {
              title: "📐 Sine & Cosine Rules",
              payload: "g11_math_sine_cosine",
            },
            { title: "📐 Equations", payload: "g11_math_trig_equations" },
          ],
        },
        timestamp: new Date().toISOString(),
      });
    }

    // For all other messages, use the Grade 11 Maths AI Tutor
    let tutorResponse;
    try {
      tutorResponse = await getGrade11MathsTutorResponse(student);
    } catch (error) {
      console.error("AI Tutor error:", error);
      // Provide a fallback response in case of AI service errors
      tutorResponse = {
        message:
          "I'm having trouble processing that right now. Could you rephrase your question about Grade 11 Mathematics?",
        quick_replies: [
          { title: "📈 Functions", payload: "g11_math_functions" },
          { title: "📐 Trigonometry", payload: "g11_math_trigonometry" },
          { title: "🔢 Algebra", payload: "g11_math_algebra" },
        ],
      };
    }

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
    // IMPROVED: Always return a valid response even in case of errors
    return res.status(200).json({
      echo: req.body?.echo || `error_${Date.now()}`,
      version: "v2",
      content: {
        messages: [
          {
            type: "text",
            text: "I'm having a momentary technical issue. Please try asking about a specific Grade 11 Mathematics topic like 'Functions' or 'Algebra'.",
          },
        ],
        quick_replies: [
          { title: "📈 Functions", payload: "g11_math_functions" },
          { title: "📐 Trigonometry", payload: "g11_math_trig" },
          { title: "🔢 Algebra", payload: "g11_math_algebra" },
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

    // Truncate very long messages to prevent issues
    const truncatedMessage =
      student.message.length > 500
        ? student.message.substring(0, 500) + "..."
        : student.message;

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
- Message: "${truncatedMessage}"

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
          content: truncatedMessage,
        },
      ],
      // Add timeout to prevent hanging
      timeout: 15000,
    });

    const aiResponse = completion.choices[0].message.content;

    // Determine appropriate quick replies based on message context
    let quickReplies = [];
    const lowerMessage = student.message.toLowerCase();

    if (lowerMessage.includes("function")) {
      quickReplies = [
        { title: "📈 Quadratic Functions", payload: "g11_math_quadratic" },
        { title: "📈 Exponential Functions", payload: "g11_math_exponential" },
        {
          title: "📈 Function Examples",
          payload: "g11_math_function_examples",
        },
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
    // Improved error response with more helpful message
    return {
      message: `I'm having a brief technical issue. Let's try again with a specific Grade 11 Mathematics question or topic you'd like to learn about.`,
      quick_replies: [
        { title: "📈 Functions", payload: "g11_math_functions" },
        { title: "📐 Trigonometry", payload: "g11_math_trigonometry" },
        { title: "🔢 Algebra", payload: "g11_math_algebra" },
      ],
    };
  }
}

// Export for Vercel
module.exports.default = module.exports;
