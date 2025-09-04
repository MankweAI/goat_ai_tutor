/**
 * Enhanced webhook handler for GOAT AI Tutor
 * Integrates with the AI agent architecture for specialized assistance
 */
const brainAgent = require("../lib/agents/brain-agent");
const {
  getSession,
  updateSession,
  addToHistory,
} = require("../lib/session-manager");
const agentStateManager = require("../lib/agents/agent-state-manager");
const imageProcessor = require("../lib/services/image-processor");

// Welcome messages
const FIRST_TIME_WELCOME =
  "Hey 👋 Welcome to The GOAT!\nYour expert tutor for Grades 8-12 CAPS curriculum subjects. Whether it's:\n✓ Homework help\n✓ Exam practice\n✓ Past paper questions\n✓ Understanding a tricky concept\nType your question—I got you! 📚";
const RETURNING_WELCOME =
  "Back again 👋 Ready for more? Drop a homework question, ask for tougher practice, or name a concept to unpack—I've got you. 🔁📚";

module.exports = async (req, res) => {
  // CORS and options handling
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      endpoint: "webhook",
      status: "ok",
      note: "POST with { subscriber_id, first_name, text, image_url }",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const userId = body.subscriber_id || "unknown";
    const firstName = body.first_name || "Student";
    const message = (body.text || "").trim();
    const imageUrl = body.image_url || null;
    const echo = body.echo || `echo_${Date.now()}_${userId}`;

    console.log(
      `👤 Processing message from ${firstName} (${userId}): ${message.substring(
        0,
        50
      )}${message.length > 50 ? "..." : ""}`
    );

    // Handle empty message with no image
    if (!message && !imageUrl) {
      return send(
        res,
        echo,
        "Send your question, homework photo, or topic for practice (Grades 8–12 CAPS)."
      );
    }

    // Get user session
    const session = await getSession(userId);

    // Check for greeting and welcome messages
    const isGreeting = /^(hi|hello|hey|greetings)$/i.test(message);

    // Handle first-time welcome
    if (isGreeting && !session.welcome_sent) {
      await updateSession(userId, { welcome_sent: true });

      // Add message and response to history
      await addToHistory(userId, {
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      });

      await addToHistory(userId, {
        role: "assistant",
        content: FIRST_TIME_WELCOME,
        agent_id: "conversation_agent",
        timestamp: new Date().toISOString(),
      });

      return send(res, echo, FIRST_TIME_WELCOME);
    }

    // Handle returning user welcome
    if (isGreeting && session.welcome_sent && session.has_received_help) {
      // Add message and response to history
      await addToHistory(userId, {
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      });

      await addToHistory(userId, {
        role: "assistant",
        content: RETURNING_WELCOME,
        agent_id: "conversation_agent",
        timestamp: new Date().toISOString(),
      });

      return send(res, echo, RETURNING_WELCOME);
    }

    // Process image if present
    let processedImage = null;
    if (imageUrl) {
      console.log(`🖼️ Processing image from user ${userId}`);
      processedImage = await imageProcessor.analyzeImage(imageUrl);
      console.log(
        `Image processing ${processedImage.success ? "successful" : "failed"}`
      );
    }

    // Add message to history
    await addToHistory(userId, {
      role: "user",
      content: message,
      image_url: imageUrl,
      timestamp: new Date().toISOString(),
    });

    // Check for direct handoff needed based on current message
    const currentAgentId = session.current_agent || "conversation_agent";
    const handoffNeeded = await agentStateManager.determineHandoffNeeded(
      currentAgentId,
      userId,
      message
    );

    // Prepare context for Brain Agent
    const context = {
      user_id: userId,
      user_name: firstName,
      message: message,
      image_url: imageUrl,
      image_data: processedImage,
      session_state: session,
      platform: "whatsapp",
      handoff_needed: handoffNeeded.handoff_needed,
      target_agent: handoffNeeded.handoff_needed
        ? handoffNeeded.target_agent
        : null,
    };

    console.log(
      `🧠 Brain processing message, handoff needed: ${handoffNeeded.handoff_needed}`
    );

    // Process with Brain Agent
    const agentResponse = await brainAgent.processMessage(userId, context);

    // Update session with agent response
    await updateSession(userId, {
      current_agent: agentResponse.agent_id,
      last_agent: agentResponse.agent_id,
      last_response_time: new Date().toISOString(),
      has_received_help: true,
      ...(agentResponse.user_state_update || {}),
    });

    // Record agent transitions if there was a handoff
    if (currentAgentId !== agentResponse.agent_id) {
      console.log(
        `🔄 Agent handoff: ${currentAgentId} → ${agentResponse.agent_id}`
      );

      // Record the handoff
      await agentStateManager.recordHandoff(
        userId,
        currentAgentId,
        agentResponse.agent_id,
        {
          reason: handoffNeeded.reason || "Brain agent decision",
          confidence: handoffNeeded.confidence || 0.7,
          message: message,
        }
      );

      // Add agent transition to session
      await updateSession(userId, {
        agent_history: [
          ...(session.agent_history || []),
          {
            from: currentAgentId,
            to: agentResponse.agent_id,
            timestamp: new Date().toISOString(),
          },
        ].slice(-5), // Keep last 5 transitions
      });
    }

    // Add response to history
    await addToHistory(userId, {
      role: "assistant",
      content: agentResponse.response,
      agent_id: agentResponse.agent_id,
      timestamp: new Date().toISOString(),
    });

    console.log(`✅ Response sent from ${agentResponse.agent_id}`);

    // Send response back to WhatsApp
    return send(res, echo, agentResponse.response);
  } catch (error) {
    console.error("Webhook error:", error);
    return send(
      res,
      req.body?.echo || "error_echo",
      "I encountered a technical issue. Please try again in a moment."
    );
  }
};

function send(res, echo, text) {
  if (!text || !text.trim())
    text = "Send a question for any Grade 8-12 subject.";
  return res.status(200).json({
    echo,
    version: "v2",
    content: { messages: [{ type: "text", text }] },
    timestamp: new Date().toISOString(),
  });
}

module.exports.default = module.exports;
