// api/brain.js
// AI Agent Manager - The Brain of the System
// COPY THIS ENTIRE FILE

const handler = async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      endpoint: "AI Brain - Agent Manager",
      status: "✅ Working perfectly!",
      description: "AI Agent Manager for CAPS curriculum WhatsApp tutoring",
      developer: "tasimaditheto",
      actions: ["test", "analyze", "conversation", "experience"],
      example:
        'POST { "action": "analyze", "user_id": "student123", "message": "I need help with homework" }',
    });
  }

  if (req.method === "POST") {
    try {
      const {
        action = "test",
        message = "Hello",
        user_name = "Student",
        user_id = "user123",
      } = req.body;

      console.log(`🧠 Brain processing: ${action} from ${user_name}`);

      let response;

      if (action === "test") {
        response = {
          brain_test: "SUCCESS",
          message_received: message,
          user_name: user_name,
          brain_response: `Hello ${user_name}! 🧠 AI Brain is working perfectly! Ready to route you to the best educational agent.`,
        };
      } else if (action === "analyze") {
        // Simple message analysis
        const intent = analyzeMessage(message);
        const recommendedAgent = determineAgent(intent);

        response = {
          user_info: { user_id, user_name, message },
          ai_analysis: {
            intent_detected: intent.category,
            subject_detected: intent.subject,
            grade_detected: intent.grade,
            urgency_level: intent.urgency,
            confidence: intent.confidence,
          },
          agent_decision: {
            recommended_agent: recommendedAgent.agent,
            agent_specialties: recommendedAgent.specialties,
            handoff_ready: true,
            reasoning: `Based on "${message}", detected ${intent.category} intent`,
          },
          brain_response: `Excellent! I've analyzed your request about "${message}". I'm routing you to our ${recommendedAgent.agent} specialist who will provide step-by-step help. 🎓`,
        };
      } else if (action === "conversation") {
        response = {
          conversation_flow: "active",
          user_info: { user_id, user_name },
          conversation_stage: determineConversationStage(message),
          whatsapp_response: {
            message_text: generateConversationResponse(message, user_name),
            message_type: "text",
            follow_up_expected: true,
          },
        };
      } else if (action === "experience") {
        response = {
          whatsapp_experience: "simulation_active",
          student_name: user_name,
          simulated_conversation: simulateWhatsAppConversation(
            user_name,
            message
          ),
          ai_coordination: {
            agents_working: [
              "conversation_manager",
              "agent_router",
              "context_memory",
            ],
            natural_flow: true,
            caps_aligned: true,
          },
        };
      } else {
        response = {
          unknown_action: action,
          default_response: `Hi ${user_name}! I received your message: "${message}". Please use a valid action.`,
        };
      }

      return res.status(200).json({
        timestamp: new Date().toISOString(),
        action_processed: action,
        brain_status: "working",
        developer: "tasimaditheto",
        ...response,
      });
    } catch (error) {
      console.error("❌ Brain error:", error);
      return res.status(500).json({
        error: "Brain processing failed",
        details: error.message,
        note: "AI Brain system encountered an error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};

// Helper functions for AI analysis
function analyzeMessage(message) {
  const lowerMessage = message.toLowerCase();

  let category = "general_query";
  let subject = "unknown";
  let grade = "unknown";
  let urgency = "medium";
  let confidence = 0.7;

  // Intent detection
  if (lowerMessage.includes("homework") || lowerMessage.includes("help")) {
    category = "homework_help";
    confidence = 0.9;
  } else if (
    lowerMessage.includes("practice") ||
    lowerMessage.includes("questions")
  ) {
    category = "practice_questions";
    confidence = 0.9;
  } else if (lowerMessage.includes("exam") || lowerMessage.includes("paper")) {
    category = "exam_preparation";
    confidence = 0.8;
  } else if (lowerMessage.includes("hi") || lowerMessage.includes("hello")) {
    category = "greeting";
    confidence = 0.9;
  }

  // Subject detection
  if (lowerMessage.includes("math")) subject = "Mathematics";
  if (lowerMessage.includes("science")) subject = "Physical Science";
  if (lowerMessage.includes("english")) subject = "English";
  if (lowerMessage.includes("life science")) subject = "Life Sciences";

  // Grade detection
  const gradeMatch = lowerMessage.match(/grade (\d+)/);
  if (gradeMatch) {
    grade = `Grade ${gradeMatch[1]}`;
    confidence += 0.1;
  }

  return { category, subject, grade, urgency, confidence };
}

function determineAgent(intent) {
  const agents = {
    homework_help: {
      agent: "Homework Agent",
      specialties: [
        "Step-by-step solutions",
        "Problem breakdown",
        "Concept explanation",
      ],
    },
    practice_questions: {
      agent: "Practice Agent",
      specialties: [
        "Question generation",
        "CAPS alignment",
        "Difficulty scaling",
      ],
    },
    exam_preparation: {
      agent: "Past Papers Agent",
      specialties: ["Exam papers", "Memorandums", "Study strategies"],
    },
    greeting: {
      agent: "Conversation Manager",
      specialties: ["Natural greetings", "Need assessment", "Agent routing"],
    },
  };

  return agents[intent.category] || agents.greeting;
}

function determineConversationStage(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("hi") || lowerMessage.includes("hello")) {
    return "greeting";
  } else if (lowerMessage.includes("homework")) {
    return "homework_request";
  } else if (lowerMessage.includes("practice")) {
    return "practice_request";
  } else {
    return "information_gathering";
  }
}

function generateConversationResponse(message, userName) {
  const stage = determineConversationStage(message);

  const responses = {
    greeting: `Hello ${userName}! 👋\n\nWelcome to your CAPS curriculum AI tutor! I can help with:\n📚 Homework Help - Step-by-step solutions\n📝 Practice Questions - Custom CAPS questions\n📄 Past Papers - Exam preparation\n\nWhat would you like help with today?`,

    homework_request: `Great! I can help with your homework, ${userName}! 📚\n\nTo provide the best step-by-step guidance, please share:\n• Your specific homework question\n• Subject (Math, Science, etc.)\n• Grade level\n\nI'll break it down clearly for you!`,

    practice_request: `Excellent! I'll create practice questions for you, ${userName}! 📝\n\nPlease tell me:\n• Subject you want to practice\n• Your grade level\n• Specific topic (optional)\n\nI'll generate CAPS-aligned questions!`,

    information_gathering: `Hi ${userName}! I want to help you with your studies. 🎓\n\nCould you tell me more about what you need? For example:\n• "I need homework help with Grade 10 Math"\n• "I want practice questions for Physical Science"\n• "I need past exam papers"`,
  };

  return responses[stage] || responses.information_gathering;
}

function simulateWhatsAppConversation(studentName, scenario) {
  const conversations = {
    homework_help: [
      {
        sender: "student",
        message: "Hi, I need help with homework",
        time: "14:30",
      },
      {
        sender: "ai_tutor",
        message: `Hello ${studentName}! I can help with your homework. What subject and grade?`,
        time: "14:30",
      },
      {
        sender: "student",
        message: "Grade 10 Mathematics - quadratic equations",
        time: "14:31",
      },
      {
        sender: "ai_tutor",
        message: `Perfect! I'm your homework specialist. Share your specific question and I'll solve it step-by-step! 📚`,
        time: "14:31",
      },
    ],
  };

  return conversations[scenario] || conversations["homework_help"];
}

module.exports = handler;
module.exports.default = handler;
