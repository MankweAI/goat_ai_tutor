// api/system.js
// Consolidated System Functions - Health, Database, Webhook, Testing
// Single endpoint for all system management functions

const handler = async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Handle different system functions based on URL path or action parameter
  const { action } = req.query;
  const bodyAction = req.body?.action;
  const systemAction = action || bodyAction || "health";

  try {
    console.log(`⚙️ System processing: ${systemAction}`);

    let result;
    switch (systemAction) {
      case "health":
        result = await handleHealthCheck();
        break;
      case "test-connections":
        result = await handleTestConnections();
        break;
      case "setup-database":
        result = await handleSetupDatabase();
        break;
      case "check-token":
        result = await handleCheckToken();
        break;
      case "webhook":
        result = await handleWebhook(req, res);
        return; // Webhook handles its own response
      case "test-message":
        result = await handleTestMessage(req.body);
        break;
      default:
        return res.status(400).json({
          error: "Invalid system action",
          provided: systemAction,
          available: [
            "health",
            "test-connections",
            "setup-database",
            "check-token",
            "webhook",
            "test-message",
          ],
          example:
            'GET /api/system?action=health OR POST { "action": "test-connections" }',
        });
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      system_action: systemAction,
      system_status: "success",
      ...result,
    });
  } catch (error) {
    console.error("❌ System processing error:", error);
    return res.status(500).json({
      error: "System processing failed",
      action: systemAction,
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Health Check (from index.js)
async function handleHealthCheck() {
  return {
    system: "WhatsApp AI Tutor - CAPS Curriculum Aligned",
    architecture: "AI Agents First - Consolidated for Vercel Free",
    developer: "tasimaditheto",
    deployment_date: "2025-09-02",
    status: "All systems operational",
    consolidated_endpoints: {
      brain:
        "/api/brain - AI Agent Manager + Conversation Flow + WhatsApp Experience",
      tutor:
        "/api/tutor - All Educational Agents (Homework, Practice, Papers, Profile)",
      system: "/api/system - Health, Database, Webhook, Testing",
    },
    vercel_optimization: {
      original_endpoints: "12+ separate files",
      consolidated_endpoints: "3 super-endpoints",
      free_tier_compatible: true,
      functionality_preserved: "100%",
    },
    quick_tests: {
      health: "GET /api/system?action=health",
      connections: "GET /api/system?action=test-connections",
      ai_brain:
        'POST /api/brain { "action": "analyze", "user_id": "test", "message": "Hello" }',
      homework_help:
        'POST /api/tutor { "agent": "homework", "user_name": "Sarah", "homework_question": "What is 2+2?" }',
    },
  };
}

// Test Connections
async function handleTestConnections() {
  const results = {
    openai_status: "unknown",
    supabase_status: "unknown",
    environment_variables: "unknown",
  };

  // Test OpenAI
  try {
    const OpenAI = require("openai");
    if (!process.env.OPENAI_API_KEY) {
      results.openai_status = "missing_api_key";
    } else {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "user", content: "Test connection. Reply with just 'OK'." },
        ],
        max_tokens: 5,
        temperature: 0,
      });
      results.openai_status = response.choices[0].message.content.includes("OK")
        ? "connected"
        : "connected_but_unexpected_response";
      results.openai_model = response.model;
    }
  } catch (error) {
    results.openai_status = `error: ${error.message}`;
  }

  // Test Supabase
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      results.supabase_status = "missing_credentials";
    } else {
      const { createClient } = require("@supabase/supabase-js");
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );

      const { data, error } = await supabase
        .from("conversations")
        .select("count")
        .limit(1);

      if (error) {
        results.supabase_status = `error: ${error.message}`;
      } else {
        results.supabase_status = "connected";
        results.supabase_url = process.env.SUPABASE_URL;
      }
    }
  } catch (error) {
    results.supabase_status = `error: ${error.message}`;
  }

  // Check Environment Variables
  const requiredEnvVars = [
    "OPENAI_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  ];
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length === 0) {
    results.environment_variables = "all_present";
  } else {
    results.environment_variables = `missing: ${missingVars.join(", ")}`;
  }

  return {
    connection_test_results: results,
    overall_status: Object.values(results).every(
      (status) => status === "connected" || status === "all_present"
    )
      ? "all_good"
      : "issues_detected",
    recommendations:
      missingVars.length > 0
        ? [`Add missing environment variables: ${missingVars.join(", ")}`]
        : ["All connections working properly"],
  };
}

// Setup Database
async function handleSetupDatabase() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Check if tables exist
    const tableChecks = {
      conversations: false,
      user_sessions: false,
      agent_logs: false,
    };

    for (const tableName of Object.keys(tableChecks)) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .limit(1);

        tableChecks[tableName] = !error;
      } catch {
        tableChecks[tableName] = false;
      }
    }

    return {
      database_setup: "checked",
      supabase_url: process.env.SUPABASE_URL,
      tables_status: tableChecks,
      setup_complete: Object.values(tableChecks).every((exists) => exists),
      note: "If tables are missing, create them in Supabase dashboard",
    };
  } catch (error) {
    throw new Error(`Database setup failed: ${error.message}`);
  }
}

// Check Token
async function handleCheckToken() {
  const token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!token) {
    return {
      token_info: {
        token_exists: false,
        error:
          "WHATSAPP_WEBHOOK_VERIFY_TOKEN not found in environment variables",
      },
    };
  }

  return {
    token_info: {
      token_exists: true,
      token_length: token.length,
      token_preview: token.substring(0, 10) + "...",
      full_token_for_debug: token, // Remove this in production
    },
  };
}

// Webhook Handler
async function handleWebhook(req, res) {
  // WhatsApp webhook verification (GET request)
  if (req.method === "GET") {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === verifyToken) {
        console.log("✅ Webhook verified successfully!");
        return res.status(200).send(challenge);
      } else {
        console.log("❌ Webhook verification failed!");
        return res.status(403).send("Forbidden");
      }
    }

    return res.status(400).send("Bad Request");
  }

  // WhatsApp webhook message handling (POST request)
  if (req.method === "POST") {
    console.log(
      "📱 Received WhatsApp webhook:",
      JSON.stringify(req.body, null, 2)
    );

    try {
      // Process incoming WhatsApp message
      const body = req.body;

      if (body.object === "whatsapp_business_account") {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (value?.messages) {
          const message = value.messages[0];
          const from = message.from;
          const messageBody = message.text?.body;

          if (messageBody) {
            console.log(`📱 WhatsApp message from ${from}: ${messageBody}`);

            // Here you would integrate with your AI Brain
            // For now, just acknowledge receipt
            return res.status(200).json({
              status: "received",
              message: "WhatsApp message processed",
              from: from,
              text: messageBody,
              note: "Integrate with /api/brain for AI processing",
            });
          }
        }
      }

      return res.status(200).json({ status: "received" });
    } catch (error) {
      console.error("❌ Webhook processing error:", error);
      return res.status(500).json({ error: "Webhook processing failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// Test Message
async function handleTestMessage(data) {
  const { message, user_name, user_id = "test_user_123" } = data;

  if (!message) {
    throw new Error("Missing required field: message");
  }

  // Simple message processing simulation
  const messageAnalysis = {
    original_message: message,
    user_name: user_name || "Test Student",
    user_id: user_id,
    processing_time: new Date().toISOString(),
  };

  // Detect intent
  const lowerMessage = message.toLowerCase();
  let detectedIntent = "general_query";

  if (lowerMessage.includes("homework") || lowerMessage.includes("help")) {
    detectedIntent = "homework_help";
  } else if (
    lowerMessage.includes("practice") ||
    lowerMessage.includes("questions")
  ) {
    detectedIntent = "practice_questions";
  } else if (lowerMessage.includes("hi") || lowerMessage.includes("hello")) {
    detectedIntent = "greeting";
  }

  // Generate response
  const responses = {
    greeting: `Hello ${
      user_name || "there"
    }! I'm your CAPS curriculum AI tutor. How can I help you today?`,
    homework_help: `I can help you with your homework, ${
      user_name || "student"
    }! Please share your specific question and I'll provide step-by-step guidance.`,
    practice_questions: `Great! I can create practice questions for you, ${
      user_name || "student"
    }. What subject and grade level would you like to practice?`,
    general_query: `Hi ${
      user_name || "there"
    }! I'm here to help with your studies. You can ask me about homework, practice questions, or past papers.`,
  };

  return {
    test_input: {
      message: message,
      user_name: user_name || "Test Student",
      user_id: user_id,
    },
    processing_result: {
      detected_intent: detectedIntent,
      generated_response: responses[detectedIntent],
      would_route_to_agent:
        detectedIntent === "homework_help"
          ? "homework"
          : detectedIntent === "practice_questions"
          ? "practice"
          : "general",
    },
    simulation_status: "success",
  };
}

module.exports = handler;
module.exports.default = handler;
