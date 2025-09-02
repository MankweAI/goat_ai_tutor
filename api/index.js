// api/index.js
// Main entry point for Vercel serverless deployment
// COPY THIS ENTIRE FILE

const express = require("express");
const cors = require("cors");

// Create express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Environment variables check
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasSupabase = !!(
  process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
);
const hasWhatsApp = !!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

// Main route handler
const handler = async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Main response
  return res.status(200).json({
    project: "WhatsApp AI Tutor - CAPS Curriculum Aligned",
    message: "AI Agents First EdTech Platform - Successfully Deployed!",
    status: "✅ LIVE AND WORKING!",
    developer: "tasimaditheto",
    deployment_time: new Date().toISOString(),

    architecture: {
      approach: "AI Agents First",
      curriculum: "South African CAPS Aligned",
      platform: "WhatsApp Native Conversations",
      deployment: "Vercel Serverless",
    },

    environment_status: {
      openai_configured: hasOpenAI,
      supabase_configured: hasSupabase,
      whatsapp_configured: hasWhatsApp,
      all_ready: hasOpenAI && hasSupabase && hasWhatsApp,
    },

    available_endpoints: {
      home: "/ - This page",
      brain: "/api/brain - AI Agent Manager",
      tutor: "/api/tutor - Educational Agents",
      system: "/api/system - System Functions",
      env_check: "/api/env-check - Environment Check",
    },

    ai_agents_system: {
      brain_agent: "AI Agent Manager - Routes student requests intelligently",
      homework_agent: "Step-by-step homework problem solver",
      practice_agent: "Custom CAPS practice questions generator",
      papers_agent: "Past exam papers and memorandums specialist",
      conversation_flow: "Natural WhatsApp conversations with context memory",
    },

    caps_curriculum_support: [
      "Grade 8-12 Mathematics",
      "Grade 8-12 Physical Sciences",
      "Grade 8-12 Life Sciences",
      "Grade 8-12 English Home Language",
      "Grade 8-12 Social Sciences",
      "NSC Exam Preparation",
    ],

    quick_tests: {
      brain_test: 'POST /api/brain { "action": "test", "message": "Hello" }',
      homework_help:
        'POST /api/tutor { "agent": "homework", "user_name": "Sarah", "homework_question": "Solve x² + 5x + 6 = 0" }',
      system_health: "GET /api/system?action=health",
      env_check: "GET /api/env-check",
    },

    market_opportunity: {
      target_students: "2.5M+ Grade 8-12 students in South Africa",
      revenue_model: "Freemium + Subscription (R50-200/month per student)",
      expansion_potential: "Pan-African (Kenya, Nigeria, Ghana)",
      competitive_advantage:
        "AI Agents First + CAPS Specific + WhatsApp Native",
    },

    ready_for: [
      "✅ Student beta testing",
      "✅ WhatsApp Business API integration",
      "✅ School partnerships",
      "✅ Investor presentations",
      "✅ Market validation",
    ],
  });
};

// Export for Vercel
module.exports = handler;
module.exports.default = handler;
