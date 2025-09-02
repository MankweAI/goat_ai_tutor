// api/brain.js
// Consolidated AI Brain - Agent Manager + Conversation Flow + WhatsApp Experience
// Single endpoint that handles all AI routing and conversation management

const handler = async (req, res) => {
  // Set CORS headers for all requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      endpoint: "AI Brain - Master Controller",
      description:
        "Consolidated AI Agent Manager + Conversation Flow + WhatsApp Experience",
      developer: "tasimaditheto",
      date: "2025-09-02",
      available_actions: {
        analyze_message: "POST with action=analyze - AI Agent Manager analysis",
        conversation_flow:
          "POST with action=conversation - Natural WhatsApp conversation",
        whatsapp_experience:
          "POST with action=experience - Complete WhatsApp simulation",
        agent_routing: "POST with action=route - Intelligent agent routing",
      },
      example_usage: {
        agent_manager:
          'POST { action: "analyze", user_id: "student123", message: "I need help with homework" }',
        conversation:
          'POST { action: "conversation", user_id: "user123", message: "Hi" }',
        experience:
          'POST { action: "experience", student_name: "Sarah", conversation_scenario: "homework_help" }',
      },
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only GET and POST methods allowed" });
  }

  try {
    const { action, ...requestData } = req.body;

    if (!action) {
      return res.status(400).json({
        error: "Missing action parameter",
        required: "action",
        available_actions: ["analyze", "conversation", "experience", "route"],
        example:
          '{ "action": "analyze", "user_id": "student123", "message": "Help with math" }',
      });
    }

    console.log(`🧠 Brain processing action: ${action}`);

    let result;
    switch (action) {
      case "analyze":
        result = await handleAgentManagerAnalysis(requestData);
        break;
      case "conversation":
        result = await handleConversationFlow(requestData);
        break;
      case "experience":
        result = await handleWhatsAppExperience(requestData);
        break;
      case "route":
        result = await handleAgentRouting(requestData);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action",
          provided: action,
          available: ["analyze", "conversation", "experience", "route"],
        });
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      action_processed: action,
      brain_status: "success",
      ...result,
    });
  } catch (error) {
    console.error("❌ Brain processing error:", error);
    return res.status(500).json({
      error: "Brain processing failed",
      action: req.body.action || "unknown",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// AI Agent Manager Analysis (from agent-manager.js)
async function handleAgentManagerAnalysis(data) {
  const { user_id, user_name, message, conversation_context = {} } = data;

  if (!user_id || !message) {
    throw new Error("Missing required fields: user_id, message");
  }

  console.log(
    `🔍 Analyzing message from ${user_name || user_id}: "${message}"`
  );

  // Analyze the user's message with GPT-4
  const messageAnalysis = await analyzeUserMessage(
    message,
    user_name,
    conversation_context
  );

  // Determine which agent should handle this request
  const agentDecision = await determineAgent(
    messageAnalysis,
    conversation_context
  );

  // Generate response
  const response = await generateAgentResponse(
    agentDecision,
    messageAnalysis,
    user_name
  );

  return {
    user_info: {
      user_id,
      user_name: user_name || "Student",
      message,
    },
    ai_analysis: messageAnalysis,
    agent_decision: agentDecision,
    response: response,
    next_interaction: {
      agent: agentDecision.selected_agent,
      context_preserved: true,
      handoff_ready: agentDecision.confidence > 0.7,
    },
  };
}

// Conversation Flow Management (from conversation-flow.js)
async function handleConversationFlow(data) {
  const { user_id, user_name, message, conversation_history = [] } = data;

  if (!user_id || !message) {
    throw new Error("Missing required fields: user_id, message");
  }

  console.log(
    `💬 Processing conversation with ${user_name || user_id}: "${message}"`
  );

  // Load conversation context
  const conversationContext = await loadConversationContext(
    user_id,
    conversation_history
  );

  // Determine conversation stage
  const conversationStage = await determineConversationStage(
    message,
    conversationContext
  );

  // Generate conversational response
  const response = await generateConversationalResponse(
    user_id,
    user_name,
    message,
    conversationStage,
    conversationContext
  );

  return {
    conversation_manager: "active",
    user_info: {
      user_id,
      user_name: user_name || "Student",
    },
    conversation_analysis: {
      user_message: message,
      conversation_stage: conversationStage.stage,
      intent_detected: conversationStage.intent,
      next_expected: conversationStage.next_expected,
    },
    whatsapp_response: {
      message_text: response.message_text,
      message_type: response.message_type,
      follow_up_expected: response.follow_up_expected,
    },
    agent_coordination: {
      current_agent: response.current_agent,
      handoff_ready: response.handoff_ready,
      gathering_info: response.gathering_info,
    },
  };
}

// WhatsApp Experience Simulation (from whatsapp-experience.js)
async function handleWhatsAppExperience(data) {
  const {
    conversation_scenario = "homework_help",
    student_name = "Student",
    messages = [],
    simulate_full_journey = true,
  } = data;

  console.log(
    `📱 Simulating WhatsApp experience: ${conversation_scenario} for ${student_name}`
  );

  const userId = `whatsapp_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  // Simulate complete conversation journey
  const conversationJourney = await simulateCompleteJourney(
    userId,
    student_name,
    conversation_scenario,
    messages
  );

  // Generate WhatsApp-style display
  const whatsappDisplay = generateWhatsAppDisplay(conversationJourney);

  // Analyze agents coordination
  const agentsCoordination = analyzeAgentsCoordination(conversationJourney);

  return {
    whatsapp_experience: "complete_simulation",
    edtech_platform: "AI Agents First CAPS Curriculum Tutor",
    developer: "tasimaditheto",
    student_info: {
      student_name,
      user_id: userId,
      conversation_scenario,
      total_messages: conversationJourney.length,
    },
    whatsapp_conversation: whatsappDisplay,
    ai_agents_coordination: agentsCoordination,
    educational_impact: {
      caps_curriculum_aligned: true,
      personalized_learning: true,
      step_by_step_guidance: true,
      natural_conversation: true,
      intelligent_routing: true,
    },
  };
}

// Agent Routing (simplified)
async function handleAgentRouting(data) {
  const { message, subject, grade } = data;

  if (!message) {
    throw new Error("Missing required field: message");
  }

  // Simple routing logic
  const analysis = await analyzeUserMessage(message, "Student", {});
  const routing = await determineAgent(analysis, {});

  return {
    routing_decision: {
      recommended_agent: routing.selected_agent,
      confidence: routing.confidence,
      reasoning: routing.reasoning,
    },
    message_analysis: analysis,
  };
}

// Helper functions (consolidated from original files)
async function analyzeUserMessage(
  message,
  userName = "Student",
  conversationContext = {}
) {
  try {
    const OpenAI = require("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const analysisPrompt = `
You are an AI Agent Manager for a CAPS curriculum WhatsApp tutoring system.
Analyze this student message and provide structured analysis.

STUDENT MESSAGE: "${message}"
STUDENT NAME: ${userName}

Analyze and respond with JSON containing:
1. intent_category: homework_help, practice_questions, general_query, greeting
2. subject_detected: Mathematics, Physical Science, Life Science, English, etc.
3. grade_level: Grade 8-12 (if mentioned)
4. urgency_level: low, medium, high
5. emotional_state: confident, confused, stressed, neutral
6. specific_topics: array of topics mentioned
7. recommended_agent: homework, practice, general

IMPORTANT: Respond ONLY with valid JSON.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an expert AI Agent Manager. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    let analysis;
    try {
      analysis = JSON.parse(response.choices[0].message.content.trim());
    } catch {
      analysis = createFallbackAnalysis(message, userName);
    }

    analysis.processing_time = new Date().toISOString();
    analysis.ai_model_used = response.model;
    return analysis;
  } catch (error) {
    console.error("❌ Error analyzing message:", error);
    return createFallbackAnalysis(message, userName);
  }
}

function createFallbackAnalysis(message, userName) {
  const lowerMessage = message.toLowerCase();

  let intent_category = "general_query";
  let recommended_agent = "general";

  if (lowerMessage.includes("homework")) {
    intent_category = "homework_help";
    recommended_agent = "homework";
  } else if (lowerMessage.includes("practice")) {
    intent_category = "practice_questions";
    recommended_agent = "practice";
  } else if (lowerMessage.includes("hi") || lowerMessage.includes("hello")) {
    intent_category = "greeting";
    recommended_agent = "general";
  }

  return {
    intent_category,
    subject_detected: "unknown",
    grade_level: "unknown",
    urgency_level: "medium",
    emotional_state: "neutral",
    specific_topics: [],
    recommended_agent,
    processing_time: new Date().toISOString(),
    ai_model_used: "fallback_analysis",
  };
}

async function determineAgent(analysis, conversationContext) {
  const agentOptions = {
    homework: {
      name: "Homework Agent",
      specialties: ["step-by-step solutions"],
    },
    practice: {
      name: "Practice Questions Agent",
      specialties: ["question generation"],
    },
    general: {
      name: "General Agent",
      specialties: ["information", "guidance"],
    },
  };

  let selectedAgent = analysis.recommended_agent || "general";
  let confidence = 0.5;

  if (analysis.intent_category && analysis.intent_category !== "unknown")
    confidence += 0.3;
  if (analysis.subject_detected && analysis.subject_detected !== "unknown")
    confidence += 0.2;

  return {
    selected_agent: selectedAgent,
    agent_info: agentOptions[selectedAgent],
    confidence: Math.min(confidence, 1.0),
    reasoning: `Selected ${selectedAgent} agent based on intent: ${analysis.intent_category}`,
    handoff_ready: confidence > 0.7,
  };
}

async function generateAgentResponse(agentDecision, analysis, userName) {
  const responses = {
    homework: {
      message: `Perfect! I can help you with your homework, ${userName}. 📚\n\nI've analyzed your request and I'm ready to provide step-by-step guidance. Please share your specific question!`,
      current_agent: "homework",
      handoff_ready: true,
    },
    practice: {
      message: `Great choice! I'll create practice questions for you, ${userName}. 📝\n\nPlease tell me your subject, grade level, and topic for custom CAPS-aligned questions!`,
      current_agent: "practice",
      handoff_ready: true,
    },
    general: {
      message: `Hello ${userName}! I'm your CAPS curriculum AI tutor. 🎓\n\nI can help with homework, practice questions, and study guidance. What would you like help with today?`,
      current_agent: "general",
      handoff_ready: false,
    },
  };

  return responses[agentDecision.selected_agent] || responses.general;
}

// Simplified conversation functions
async function loadConversationContext(userId, conversationHistory) {
  return {
    user_id: userId,
    conversation_history: conversationHistory,
    has_prior_interaction: conversationHistory.length > 0,
  };
}

async function determineConversationStage(message, context) {
  const lowerMessage = message.toLowerCase();

  if (
    !context.has_prior_interaction ||
    lowerMessage.includes("hi") ||
    lowerMessage.includes("hello")
  ) {
    return {
      stage: "greeting",
      intent: "new_conversation",
      next_expected: "student_explains_need",
    };
  }

  if (lowerMessage.includes("homework")) {
    return {
      stage: "homework_request",
      intent: "homework_help",
      next_expected: "gather_details",
    };
  }

  return {
    stage: "general_query",
    intent: "unclear",
    next_expected: "clarification_needed",
  };
}

async function generateConversationalResponse(
  userId,
  userName,
  message,
  conversationStage,
  context
) {
  const responses = {
    greeting: {
      message_text: `Hello ${userName}! 👋\n\nWelcome to your CAPS curriculum AI tutor! I can help with:\n📚 Homework Help\n📝 Practice Questions\n📄 Past Papers\n\nWhat would you like help with today?`,
      message_type: "text",
      current_agent: "conversation_manager",
      handoff_ready: false,
      gathering_info: false,
      follow_up_expected: true,
    },
    homework_request: {
      message_text: `Great! I can help with your homework, ${userName}! 📚\n\nPlease share your specific question, subject, and grade level for step-by-step guidance.`,
      message_type: "text",
      current_agent: "conversation_manager",
      handoff_ready: true,
      gathering_info: true,
      follow_up_expected: true,
    },
    general_query: {
      message_text: `Hi ${userName}! I want to make sure I understand how to help you best. Could you tell me more about what you need?`,
      message_type: "text",
      current_agent: "conversation_manager",
      handoff_ready: false,
      gathering_info: true,
      follow_up_expected: true,
    },
  };

  return responses[conversationStage.stage] || responses.general_query;
}

// Simplified simulation functions
async function simulateCompleteJourney(
  userId,
  studentName,
  scenario,
  customMessages
) {
  const journeys = {
    homework_help: [
      { sender: "student", message: "Hi", stage: "greeting" },
      {
        sender: "ai_tutor",
        message: `Hello ${studentName}! 👋\n\nI'm your CAPS curriculum AI tutor. I can help with homework, practice questions, and past papers.\n\nWhat would you like help with today?`,
        stage: "welcome",
        agent: "conversation_manager",
      },
      {
        sender: "student",
        message: "I need help with my homework",
        stage: "help_request",
      },
      {
        sender: "ai_tutor",
        message: `Great! I can help with your homework, ${studentName}! 📚\n\nPlease share your specific question, subject, and grade level.`,
        stage: "homework_gathering",
        agent: "conversation_manager",
      },
      {
        sender: "student",
        message: "Grade 10 Mathematics: Solve x² + 5x + 6 = 0",
        stage: "specific_question",
      },
      {
        sender: "ai_tutor",
        message: `Perfect! Let me solve this step by step, ${studentName}:\n\n**Problem:** x² + 5x + 6 = 0\n\n**Step 1:** Factor: (x + 2)(x + 3) = 0\n**Step 2:** Solve: x = -2 or x = -3\n\nGreat question! Need help with more problems?`,
        stage: "solution_provided",
        agent: "homework_agent",
      },
    ],
    practice_questions: [
      {
        sender: "student",
        message: "I want practice questions",
        stage: "practice_request",
      },
      {
        sender: "ai_tutor",
        message: `Excellent! I'll create practice questions for you, ${studentName}. 📝\n\nPlease tell me your subject, grade, and topic for custom CAPS-aligned questions!`,
        stage: "practice_gathering",
        agent: "conversation_manager",
      },
    ],
    quick_greeting: [
      { sender: "student", message: "Hello", stage: "greeting" },
      {
        sender: "ai_tutor",
        message: `Hello ${studentName}! 👋\n\nI'm your CAPS curriculum AI tutor. I can help with homework, practice questions, and study guidance.\n\nWhat would you like help with today?`,
        stage: "welcome",
        agent: "conversation_manager",
      },
    ],
  };

  return journeys[scenario] || journeys.homework_help;
}

function generateWhatsAppDisplay(conversationJourney) {
  const messages = conversationJourney.map((exchange, index) => ({
    message_number: index + 1,
    sender: exchange.sender === "student" ? "👤 Student" : "🤖 AI Tutor",
    timestamp: new Date(Date.now() + index * 30000).toLocaleTimeString(
      "en-US",
      { hour12: false, hour: "2-digit", minute: "2-digit" }
    ),
    message_text: exchange.message,
    conversation_stage: exchange.stage,
    current_agent: exchange.agent || "conversation_manager",
  }));

  return {
    conversation_preview: "📱 WhatsApp Conversation Preview",
    total_messages: messages.length,
    messages: messages,
  };
}

function analyzeAgentsCoordination(conversationJourney) {
  const agentsUsed = [
    ...new Set(
      conversationJourney.map((exchange) => exchange.agent).filter(Boolean)
    ),
  ];

  return {
    ai_agents_first_architecture: "Active",
    agents_used_in_conversation: agentsUsed.length,
    agents_coordination: agentsUsed.map((agent) => ({
      agent_name: agent,
      role:
        agent === "homework_agent"
          ? "Step-by-step problem solver"
          : "Conversation manager",
    })),
    intelligence_features: [
      "GPT-4 analysis",
      "CAPS curriculum alignment",
      "Natural conversation flow",
    ],
  };
}

module.exports = handler;
module.exports.default = handler;

