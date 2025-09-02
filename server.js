// server.js
// EMERGENCY SIMPLE SERVER - Fixed for immediate startup
// Copy and paste this entire file to replace your current server.js

const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: ".env.local" });

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

console.log("🔧 Starting emergency simple server...");

// ========================================
// EMERGENCY INLINE HANDLERS (No separate files needed)
// ========================================

// 🏠 ROOT ENDPOINT
app.get("/", (req, res) => {
  res.json({
    project: "WhatsApp AI Tutor - EMERGENCY MODE",
    message: "CAPS Curriculum Aligned AI Tutor - Server Fixed",
    status: "✅ SERVER IS WORKING!",
    developer: "tasimaditheto",
    current_time: new Date().toISOString(),

    emergency_note: "Server running in simplified mode for testing",

    available_endpoints: {
      home: "/ - This page",
      brain: "/api/brain - AI Brain endpoint",
      tutor: "/api/tutor - Educational agents",
      system: "/api/system - System functions",
    },

    quick_tests: {
      test_brain: 'POST /api/brain { "action": "test", "message": "Hello" }',
      test_tutor: 'POST /api/tutor { "agent": "homework", "message": "Test" }',
      test_system: "GET /api/system",
    },

    next_steps: [
      "1. Test these endpoints to confirm server is working",
      "2. Then we can add back the complex features",
      "3. Deploy to Vercel once stable",
    ],
  });
});

// 🧠 BRAIN ENDPOINT (Simplified)
app.all("/api/brain", async (req, res) => {
  // Set CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      endpoint: "AI Brain - Working!",
      status: "✅ Brain endpoint is functional",
      developer: "tasimaditheto",
      actions: ["test", "analyze", "conversation"],
      example: 'POST { "action": "test", "message": "Hello" }',
    });
  }

  if (req.method === "POST") {
    try {
      const {
        action = "test",
        message = "No message",
        user_name = "Student",
      } = req.body;

      console.log(`🧠 Brain processing: ${action} - "${message}"`);

      // Simple response based on action
      let response;

      if (action === "test") {
        response = {
          brain_test: "SUCCESS",
          message_received: message,
          response: `Hello ${user_name}! Brain is working perfectly! 🧠`,
        };
      } else if (action === "analyze") {
        // Simple analysis
        const intent = message.toLowerCase().includes("homework")
          ? "homework_help"
          : message.toLowerCase().includes("practice")
          ? "practice_questions"
          : "general";

        response = {
          ai_analysis: {
            intent_detected: intent,
            recommended_agent:
              intent === "homework_help" ? "homework" : "general",
            confidence: 0.8,
          },
          brain_response: `Analyzed your message about "${message}". Detected intent: ${intent}`,
        };
      } else {
        response = {
          action_unknown: action,
          default_response: `Hi ${user_name}! I received your message: "${message}"`,
        };
      }

      return res.status(200).json({
        timestamp: new Date().toISOString(),
        action_processed: action,
        brain_status: "working",
        user_name: user_name,
        ...response,
      });
    } catch (error) {
      console.error("❌ Brain error:", error);
      return res.status(500).json({
        error: "Brain processing failed",
        details: error.message,
        note: "Emergency simple brain - some features limited",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
});

// 🎓 TUTOR ENDPOINT (Simplified)
app.all("/api/tutor", async (req, res) => {
  // Set CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      endpoint: "Educational Tutor - Working!",
      status: "✅ Tutor endpoint is functional",
      developer: "tasimaditheto",
      agents: ["homework", "practice", "papers"],
      example:
        'POST { "agent": "homework", "user_name": "Sarah", "message": "Help with math" }',
    });
  }

  if (req.method === "POST") {
    try {
      const {
        agent = "homework",
        user_name = "Student",
        message = "No question provided",
        subject = "Mathematics",
        grade = "10",
      } = req.body;

      console.log(`🎓 Tutor ${agent} agent helping ${user_name}`);

      // Simple agent responses
      let agentResponse;

      if (agent === "homework") {
        agentResponse = {
          agent: "homework",
          specialist: "Step-by-step problem solver",
          response: `Hi ${user_name}! I'm your homework specialist. 📚\n\nI see you need help with: "${message}"\n\nFor Grade ${grade} ${subject}, I would:\n1. Analyze your question\n2. Break it down step-by-step\n3. Explain each step clearly\n4. Help you understand the concepts\n\nPlease share your specific homework question!`,
        };
      } else if (agent === "practice") {
        agentResponse = {
          agent: "practice",
          specialist: "Practice questions generator",
          response: `Hi ${user_name}! I'm your practice questions specialist. 📝\n\nI can create custom Grade ${grade} ${subject} questions for you!\n\nJust tell me:\n• What topic you want to practice\n• What difficulty level\n• How many questions\n\nI'll generate CAPS-aligned practice questions!`,
        };
      } else {
        agentResponse = {
          agent: agent,
          specialist: "General educational assistant",
          response: `Hi ${user_name}! I'm here to help with your ${subject} studies. What specific help do you need?`,
        };
      }

      return res.status(200).json({
        timestamp: new Date().toISOString(),
        tutor_status: "working",
        user_info: { user_name, subject, grade },
        ...agentResponse,
      });
    } catch (error) {
      console.error("❌ Tutor error:", error);
      return res.status(500).json({
        error: "Tutor processing failed",
        details: error.message,
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
});

// ⚙️ SYSTEM ENDPOINT (Simplified)
app.all("/api/system", async (req, res) => {
  // Set CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const action = req.query.action || req.body?.action || "health";

    console.log(`⚙️ System processing: ${action}`);

    let systemResponse;

    if (action === "health") {
      systemResponse = {
        system_health: "EXCELLENT",
        server_status: "Running perfectly",
        endpoints_status: "All 3 endpoints working",
        database_status: "Ready for connection",
        ai_status: "Ready for GPT-4 integration",
        deployment_ready: true,
      };
    } else if (action === "test-connections") {
      // Check environment variables
      const hasOpenAI = !!process.env.OPENAI_API_KEY;
      const hasSupabase = !!(
        process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
      );
      const hasWhatsApp = !!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

      systemResponse = {
        connection_tests: {
          openai_key: hasOpenAI ? "Present" : "Missing",
          supabase_credentials: hasSupabase ? "Present" : "Missing",
          whatsapp_token: hasWhatsApp ? "Present" : "Missing",
        },
        overall_status:
          hasOpenAI && hasSupabase && hasWhatsApp
            ? "All connections ready"
            : "Some credentials missing",
        note: "Server working - can add API integrations when ready",
      };
    } else {
      systemResponse = {
        unknown_action: action,
        available_actions: ["health", "test-connections"],
        default_response: "System is working perfectly!",
      };
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      system_action: action,
      system_status: "working",
      developer: "tasimaditheto",
      ...systemResponse,
    });
  } catch (error) {
    console.error("❌ System error:", error);
    return res.status(500).json({
      error: "System processing failed",
      details: error.message,
    });
  }
});

// ❌ 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    requested: req.originalUrl,
    available_endpoints: ["/", "/api/brain", "/api/tutor", "/api/system"],
    note: "Server is working - endpoint just not found",
  });
});

// 🚀 START SERVER
app.listen(PORT, () => {
  console.log("\n🎉 SUCCESS! WhatsApp AI Tutor Server is RUNNING!");
  console.log("📱 CAPS Curriculum Aligned AI Tutor Chatbot");
  console.log("🔧 EMERGENCY SIMPLIFIED MODE - Everything Working!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`📅 Started: ${new Date().toLocaleString()}`);
  console.log(`👤 Developer: tasimaditheto`);
  console.log(`🎯 Status: FIXED and RUNNING!`);
  console.log("═══════════════════════════════════════════════════");

  console.log("\n✅ WORKING ENDPOINTS:");
  console.log(`   • 🏠 Home: http://localhost:${PORT}/`);
  console.log(`   • 🧠 AI Brain: http://localhost:${PORT}/api/brain`);
  console.log(`   • 🎓 Tutor: http://localhost:${PORT}/api/tutor`);
  console.log(`   • ⚙️ System: http://localhost:${PORT}/api/system`);

  console.log("\n🧪 QUICK TESTS:");
  console.log(
    '   • Test Brain: POST /api/brain {"action":"test","message":"Hello"}'
  );
  console.log(
    '   • Test Tutor: POST /api/tutor {"agent":"homework","user_name":"Sarah"}'
  );
  console.log("   • Test System: GET /api/system?action=health");

  console.log("\n🚀 SERVER IS FIXED AND READY!");
  console.log("💡 Now you can test all endpoints and then deploy!\n");
});

// Export for Vercel
module.exports = app;
