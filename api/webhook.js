// api/webhook.js
// Enhanced WhatsApp webhook handler with message processing

const handler = async (req, res) => {
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
      // Webhook verification for ManyChat/WhatsApp
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

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
            expected_token: "Check your WEBHOOK_VERIFY_TOKEN in .env.local",
          });
        }
      }

      return res.status(400).json({
        error: "Bad Request",
        message:
          "Missing required parameters: hub.mode, hub.verify_token, hub.challenge",
      });
    }

    if (req.method === "POST") {
      // Handle incoming webhook data from WhatsApp/ManyChat
      const webhookData = req.body;

      console.log(
        "📨 Received webhook data:",
        JSON.stringify(webhookData, null, 2)
      );

      // Process the incoming message
      const processedMessage = await processIncomingMessage(webhookData);

      // Log the interaction
      await logWebhookInteraction(webhookData, processedMessage);

      return res.status(200).json({
        status: "received",
        message: "Webhook data processed successfully",
        timestamp: new Date().toISOString(),
        processed_data: processedMessage,
      });
    }

    // Method not allowed
    return res.status(405).json({
      error: "Method not allowed",
      message: "Only GET and POST methods are supported",
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);

    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to process webhook request",
      timestamp: new Date().toISOString(),
      details: error.message,
    });
  }
};

// Process incoming WhatsApp messages
async function processIncomingMessage(webhookData) {
  try {
    console.log("🔄 Processing incoming message...");

    // Extract message information from webhook data
    const messageInfo = extractMessageInfo(webhookData);

    if (!messageInfo) {
      console.log("⚠️ No message info found in webhook data");
      return {
        status: "no_message",
        reason: "No message content found in webhook data",
      };
    }

    console.log("📝 Extracted message info:", messageInfo);

    // Store user interaction in database
    await storeUserInteraction(messageInfo);

    // Generate response based on message content
    const response = await generateResponse(messageInfo);

    // Send response back to user (placeholder for now)
    console.log("📤 Generated response:", response);

    return {
      status: "processed",
      user_message: messageInfo,
      bot_response: response,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Error processing message:", error);
    return {
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Extract message information from webhook data
function extractMessageInfo(webhookData) {
  try {
    // Handle different webhook formats from ManyChat/WhatsApp
    let messageInfo = null;

    // ManyChat format
    if (webhookData.subscriber_id && webhookData.text) {
      messageInfo = {
        user_id: webhookData.subscriber_id,
        whatsapp_id: webhookData.subscriber_id,
        message_text: webhookData.text,
        message_type: "text",
        user_name: webhookData.first_name || "User",
        platform: "manychat",
      };
    }

    // WhatsApp Business API format
    else if (
      webhookData.entry &&
      webhookData.entry[0] &&
      webhookData.entry[0].changes
    ) {
      const change = webhookData.entry[0].changes[0];
      if (change.value && change.value.messages && change.value.messages[0]) {
        const message = change.value.messages[0];
        const contact = change.value.contacts ? change.value.contacts[0] : {};

        messageInfo = {
          user_id: message.from,
          whatsapp_id: message.from,
          message_text: message.text ? message.text.body : "",
          message_type: message.type || "text",
          user_name: contact.profile ? contact.profile.name : "User",
          platform: "whatsapp",
        };
      }
    }

    // Generic format (for testing)
    else if (webhookData.message && webhookData.user_id) {
      messageInfo = {
        user_id: webhookData.user_id,
        whatsapp_id: webhookData.user_id,
        message_text: webhookData.message,
        message_type: "text",
        user_name: webhookData.user_name || "User",
        platform: "generic",
      };
    }

    return messageInfo;
  } catch (error) {
    console.error("❌ Error extracting message info:", error);
    return null;
  }
}

// Store user interaction in Supabase database
async function storeUserInteraction(messageInfo) {
  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Check if user exists, create if not
    let { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("whatsapp_id", messageInfo.whatsapp_id)
      .single();

    if (!existingUser) {
      // Create new user
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert([
          {
            whatsapp_id: messageInfo.whatsapp_id,
            first_name: messageInfo.user_name.split(" ")[0] || "User",
            last_name:
              messageInfo.user_name.split(" ").slice(1).join(" ") || "",
          },
        ])
        .select()
        .single();

      if (userError) throw userError;
      existingUser = newUser;
    }

    // Store conversation
    const { error: conversationError } = await supabase
      .from("conversations")
      .insert([
        {
          user_id: existingUser.id,
          whatsapp_id: messageInfo.whatsapp_id,
          message_text: messageInfo.message_text,
          message_type: messageInfo.message_type,
          sender: "user",
        },
      ]);

    if (conversationError) throw conversationError;

    console.log("✅ User interaction stored successfully");
    return existingUser;
  } catch (error) {
    console.error("❌ Error storing user interaction:", error);
    throw error;
  }
}

// Generate response based on user message
async function generateResponse(messageInfo) {
  try {
    const userMessage = messageInfo.message_text.toLowerCase().trim();

    // Welcome message for new conversations
    if (isWelcomeMessage(userMessage)) {
      return {
        type: "welcome",
        text: `Hello ${messageInfo.user_name}! 👋\n\nI'm your CAPS curriculum AI tutor! I can help you with:\n\n📚 Homework questions\n📝 Practice exercises\n📄 Past exam papers\n🔍 Solving specific problems\n\nWhat would you like help with today?`,
        agent: "welcome",
      };
    }

    // Route to appropriate agent (placeholder for Phase 3)
    const intent = detectIntent(userMessage);

    return {
      type: "agent_routing",
      text: generateRoutingResponse(intent, messageInfo.user_name),
      agent: intent.agent,
      confidence: intent.confidence,
    };
  } catch (error) {
    console.error("❌ Error generating response:", error);
    return {
      type: "error",
      text: "I'm sorry, I'm having trouble processing your message right now. Please try again in a moment.",
      agent: "error",
    };
  }
}

// Check if message is a welcome/greeting message
function isWelcomeMessage(message) {
  const welcomeKeywords = [
    "hi",
    "hello",
    "hey",
    "start",
    "begin",
    "help",
    "good morning",
    "good afternoon",
    "good evening",
    "sawubona",
    "hello there",
    "howzit",
  ];

  return welcomeKeywords.some(
    (keyword) => message.includes(keyword) || message === keyword
  );
}

// Detect user intent (simplified version - will be enhanced in Phase 3)
function detectIntent(message) {
  const intents = [
    {
      keywords: [
        "homework",
        "assignment",
        "help with",
        "solve this",
        "explain",
      ],
      agent: "homework",
      name: "homework_help",
    },
    {
      keywords: ["practice", "questions", "exercises", "quiz", "test myself"],
      agent: "practice",
      name: "practice_questions",
    },
    {
      keywords: ["past papers", "exam papers", "previous", "old papers"],
      agent: "past_papers",
      name: "past_papers",
    },
    {
      keywords: ["grade", "level", "subject", "what grade"],
      agent: "profile",
      name: "user_profile",
    },
  ];

  for (const intent of intents) {
    const matchCount = intent.keywords.filter((keyword) =>
      message.includes(keyword)
    ).length;

    if (matchCount > 0) {
      return {
        agent: intent.agent,
        name: intent.name,
        confidence: matchCount / intent.keywords.length,
        matched_keywords: intent.keywords.filter((keyword) =>
          message.includes(keyword)
        ),
      };
    }
  }

  // Default to agent manager if no specific intent detected
  return {
    agent: "agent_manager",
    name: "general_query",
    confidence: 0.5,
    matched_keywords: [],
  };
}

// Generate routing response based on detected intent
function generateRoutingResponse(intent, userName) {
  const responses = {
    homework: `Great! I can help you with your homework, ${userName}. 📚\n\nPlease share your homework question, and I'll provide step-by-step guidance to help you understand the solution.`,

    practice: `Perfect! Let's get you some practice questions, ${userName}. 📝\n\nWhat subject and grade level would you like to practice? For example: "Grade 10 Mathematics" or "Grade 11 Physical Science"`,

    past_papers: `I can help you access past exam papers, ${userName}. 📄\n\nPlease tell me your grade and subject. For example: "Grade 12 Mathematics past papers"`,

    profile: `Let me help you set up your learning profile, ${userName}. 👤\n\nWhat grade are you in? And what subjects are you studying?`,

    agent_manager: `I understand you need help, ${userName}. 🤔\n\nCould you be more specific about what you'd like help with? For example:\n• "Help with my math homework"\n• "I need practice questions for science"\n• "Show me past exam papers"`,
  };

  return responses[intent.agent] || responses.agent_manager;
}

// Log webhook interaction for debugging
async function logWebhookInteraction(webhookData, processedMessage) {
  try {
    console.log("📊 Logging webhook interaction...");

    // In production, you might want to store this in your database
    // For now, we'll just log to console
    const logEntry = {
      timestamp: new Date().toISOString(),
      webhook_data_size: JSON.stringify(webhookData).length,
      processed_successfully: processedMessage.status === "processed",
      user_id: processedMessage.user_message?.user_id || "unknown",
      message_type: processedMessage.user_message?.message_type || "unknown",
    };

    console.log("📋 Interaction log:", logEntry);
    return logEntry;
  } catch (error) {
    console.error("❌ Error logging interaction:", error);
  }
}

// Export for both Vercel and local development
module.exports = handler;
module.exports.default = handler;
