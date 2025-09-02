// api/webhook.js
// FIXED ManyChat webhook handler with proper echo support
// Copy this entire file exactly as shown

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      // Webhook verification for WhatsApp Business API
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

      console.log("🔍 Webhook verification attempt:", {
        mode,
        token: token ? "provided" : "missing",
        challenge: challenge ? "provided" : "missing",
      });

      if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
          console.log("✅ Webhook verified successfully");
          return res.status(200).send(challenge);
        } else {
          console.log("❌ Webhook verification failed - invalid token");
          return res.status(403).json({
            error: "Forbidden - Invalid verify token",
          });
        }
      }

      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required parameters for verification",
      });
    }

    if (req.method === "POST") {
      // Handle ManyChat webhook data
      const webhookData = req.body;

      console.log(
        "📨 Received ManyChat webhook:",
        JSON.stringify(webhookData, null, 2)
      );

      // CRITICAL: Extract echo from ManyChat request
      const echo = webhookData.echo || null;

      if (!echo) {
        console.warn("⚠️ No echo field found in ManyChat webhook");
      }

      // Process the student message
      const processedMessage = await processManyMessageChat(webhookData);

      // Generate AI agent response
      const aiResponse = await generateAIResponse(processedMessage);

      // CRITICAL: Return response with echo for ManyChat
      const manyChatResponse = {
        // Echo back the original echo value - REQUIRED for ManyChat
        echo: echo,

        // Student response data
        version: "v2",
        content: {
          messages: [
            {
              type: "text",
              text: aiResponse.message_text,
            },
          ],
          actions: aiResponse.actions || [],
          quick_replies: aiResponse.quick_replies || [],
        },

        // Debug info (will be ignored by ManyChat)
        debug_info: {
          timestamp: new Date().toISOString(),
          student_info: processedMessage.student_info,
          ai_agent_used: aiResponse.agent,
          caps_aligned: true,
        },
      };

      console.log(
        "📤 Sending ManyChat response:",
        JSON.stringify(manyChatResponse, null, 2)
      );

      return res.status(200).json(manyChatResponse);
    }

    return res.status(405).json({
      error: "Method not allowed",
      message: "Only GET and POST methods are supported",
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);

    // Even on error, return echo if available
    const echo = req.body?.echo || null;

    return res.status(200).json({
      echo: echo,
      version: "v2",
      content: {
        messages: [
          {
            type: "text",
            text: "I'm sorry, I'm having trouble right now. Please try again in a moment. 🤖",
          },
        ],
      },
      error_logged: true,
      timestamp: new Date().toISOString(),
    });
  }
};

// Process ManyChat incoming message
async function processManyMessageChat(webhookData) {
  try {
    console.log("🔄 Processing ManyChat message...");

    // Extract student information from ManyChat webhook
    const studentInfo = {
      subscriber_id: webhookData.subscriber_id || "unknown",
      first_name: webhookData.first_name || "Student",
      last_name: webhookData.last_name || "",
      full_name: `${webhookData.first_name || "Student"} ${
        webhookData.last_name || ""
      }`.trim(),
      phone: webhookData.phone || null,
      user_message:
        webhookData.text || webhookData.last_input_text || "No message",
      user_id: webhookData.subscriber_id || `temp_${Date.now()}`,
    };

    console.log("👤 Student info extracted:", studentInfo);

    return {
      platform: "manychat",
      student_info: studentInfo,
      message_text: studentInfo.user_message,
      timestamp: new Date().toISOString(),
      echo: webhookData.echo,
    };
  } catch (error) {
    console.error("❌ Error processing ManyChat message:", error);
    return {
      platform: "manychat",
      student_info: {
        full_name: "Student",
        user_message: "Error processing message",
      },
      message_text: "Error processing message",
      timestamp: new Date().toISOString(),
      echo: webhookData?.echo || null,
      error: error.message,
    };
  }
}

// Generate AI agent response
async function generateAIResponse(processedMessage) {
  try {
    const { student_info, message_text } = processedMessage;
    const studentName = student_info.first_name || "Student";

    console.log(`🧠 Generating AI response for: "${message_text}"`);

    // Analyze student intent using your AI Brain
    const intent = analyzeStudentIntent(message_text);

    // Route to appropriate agent
    const agentResponse = routeToAgent(intent, studentName, message_text);

    console.log(`🎓 Agent response generated:`, agentResponse);

    return agentResponse;
  } catch (error) {
    console.error("❌ Error generating AI response:", error);
    return {
      agent: "error_handler",
      message_text: `Hi! I'm your CAPS curriculum AI tutor. I can help with homework, practice questions, and exam prep. What would you like help with? 📚`,
      actions: [],
      quick_replies: [
        { title: "📚 Homework Help", payload: "homework_help" },
        { title: "📝 Practice Questions", payload: "practice_questions" },
        { title: "📄 Past Papers", payload: "past_papers" },
      ],
    };
  }
}

// Analyze student intent (simplified version)
function analyzeStudentIntent(message) {
  const lowerMessage = message.toLowerCase();

  // Greeting detection
  if (
    lowerMessage.includes("hi") ||
    lowerMessage.includes("hello") ||
    lowerMessage.includes("hey") ||
    lowerMessage.includes("start")
  ) {
    return {
      category: "greeting",
      confidence: 0.9,
      agent: "conversation_manager",
    };
  }

  // Homework help detection
  if (
    lowerMessage.includes("homework") ||
    lowerMessage.includes("help") ||
    lowerMessage.includes("solve") ||
    lowerMessage.includes("explain")
  ) {
    return {
      category: "homework_help",
      confidence: 0.9,
      agent: "homework",
    };
  }

  // Practice questions detection
  if (
    lowerMessage.includes("practice") ||
    lowerMessage.includes("questions") ||
    lowerMessage.includes("quiz") ||
    lowerMessage.includes("test")
  ) {
    return {
      category: "practice_questions",
      confidence: 0.8,
      agent: "practice",
    };
  }

  // Past papers detection
  if (
    lowerMessage.includes("past") ||
    lowerMessage.includes("papers") ||
    lowerMessage.includes("exam") ||
    lowerMessage.includes("previous")
  ) {
    return {
      category: "past_papers",
      confidence: 0.8,
      agent: "papers",
    };
  }

  // Subject detection
  let subject = "unknown";
  if (lowerMessage.includes("math")) subject = "Mathematics";
  if (lowerMessage.includes("science")) subject = "Physical Science";
  if (lowerMessage.includes("english")) subject = "English";

  // Grade detection
  let grade = "unknown";
  const gradeMatch = lowerMessage.match(/grade (\d+)/);
  if (gradeMatch) grade = gradeMatch[1];

  return {
    category: "general_query",
    confidence: 0.6,
    agent: "conversation_manager",
    subject: subject,
    grade: grade,
  };
}

// Route to appropriate agent
function routeToAgent(intent, studentName, message) {
  console.log(
    `🔀 Routing to agent: ${intent.agent} for intent: ${intent.category}`
  );

  switch (intent.agent) {
    case "homework":
      return {
        agent: "homework",
        message_text: `Great! I can help with your homework, ${studentName}! 📚\n\nTo provide the best step-by-step guidance, please share:\n• Your specific homework question\n• Subject (Math, Science, etc.)\n• Grade level\n\nI'll break it down clearly for you!`,
        actions: [
          {
            action: "set_field",
            field_name: "current_agent",
            value: "homework",
          },
        ],
        quick_replies: [
          { title: "📐 Mathematics", payload: "subject_mathematics" },
          { title: "🔬 Physical Science", payload: "subject_science" },
          { title: "📖 English", payload: "subject_english" },
        ],
      };

    case "practice":
      return {
        agent: "practice",
        message_text: `Excellent! I'll create practice questions for you, ${studentName}! 📝\n\nPlease tell me:\n• Subject you want to practice\n• Your grade level\n• Specific topic (optional)\n\nI'll generate CAPS-aligned questions!`,
        actions: [
          {
            action: "set_field",
            field_name: "current_agent",
            value: "practice",
          },
        ],
        quick_replies: [
          { title: "Grade 8-9", payload: "grade_8_9" },
          { title: "Grade 10-11", payload: "grade_10_11" },
          { title: "Grade 12", payload: "grade_12" },
        ],
      };

    case "papers":
      return {
        agent: "papers",
        message_text: `Perfect! I can help you with past exam papers, ${studentName}! 📄\n\nTell me your grade and subject, for example:\n• "Grade 12 Mathematics"\n• "Grade 11 Physical Science"\n\nI'll provide past papers and memorandums!`,
        actions: [
          {
            action: "set_field",
            field_name: "current_agent",
            value: "papers",
          },
        ],
        quick_replies: [
          { title: "📐 Math Papers", payload: "papers_mathematics" },
          { title: "🔬 Science Papers", payload: "papers_science" },
          { title: "📖 English Papers", payload: "papers_english" },
        ],
      };

    case "conversation_manager":
    default:
      if (intent.category === "greeting") {
        return {
          agent: "conversation_manager",
          message_text: `Hello ${studentName}! 👋\n\nWelcome to your CAPS curriculum AI tutor! I can help with:\n\n📚 Homework Help - Step-by-step solutions\n📝 Practice Questions - Custom CAPS questions\n📄 Past Papers - Exam preparation\n\nWhat would you like help with today?`,
          actions: [
            {
              action: "set_field",
              field_name: "conversation_started",
              value: "true",
            },
          ],
          quick_replies: [
            { title: "📚 Homework Help", payload: "homework_help" },
            { title: "📝 Practice Questions", payload: "practice_questions" },
            { title: "📄 Past Papers", payload: "past_papers" },
          ],
        };
      } else {
        return {
          agent: "conversation_manager",
          message_text: `Hi ${studentName}! I want to help you with your studies. 🎓\n\nCould you tell me more about what you need? For example:\n• "I need homework help with Grade 10 Math"\n• "I want practice questions for Physical Science"\n• "I need past exam papers"`,
          actions: [],
          quick_replies: [
            { title: "📚 Homework Help", payload: "homework_help" },
            { title: "📝 Practice Questions", payload: "practice_questions" },
            { title: "📄 Past Papers", payload: "past_papers" },
          ],
        };
      }
  }
}

// Export for Vercel
module.exports.default = module.exports;
