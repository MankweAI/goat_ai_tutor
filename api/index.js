/**
 * GOAT Bot 2.0 - Main Router - ManyChat Webhook Handler
 * Updated: 2025-09-02 13:37:31 UTC
 * Developer: tasimaditheto
 * Handles ManyChat webhook requests with AI agents coordination
 */

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Handle GET requests (info page)
    if (req.method === "GET") {
      return res.status(200).json({
        project: "WhatsApp AI Tutor - CAPS Curriculum Aligned",
        message: "🎉 SUCCESSFULLY DEPLOYED ON VERCEL!",
        status: "✅ LIVE AND WORKING!",
        developer: "tasimaditheto",
        deployment_time: new Date().toISOString(),
        architecture: {
          approach: "AI Agents First",
          curriculum: "South African CAPS Aligned",
          platform: "WhatsApp Native Conversations",
          deployment: "Vercel Serverless Functions",
        },
        webhook_info: {
          accepts_post: "ManyChat webhook data",
          returns: "AI agent responses with echo support",
          ai_coordination: "Brain manager routes to specialized agents",
        },
        available_endpoints: {
          webhook: "/api/index - ManyChat webhook (this endpoint)",
          brain: "/api/brain - AI Agent Manager",
          tutor: "/api/tutor - Educational Agents",
          system: "/api/system - System Functions",
        },
      });
    }

    // Handle POST requests (ManyChat webhook)
    if (req.method === "POST") {
      console.log(
        "📨 ManyChat webhook received:",
        JSON.stringify(req.body, null, 2)
      );

      const webhookData = req.body || {};

      // Extract student information
      const student = {
        subscriber_id:
          webhookData.subscriber_id || webhookData.psid || "unknown",
        first_name: webhookData.first_name || "Student",
        last_name: webhookData.last_name || "",
        full_name: `${webhookData.first_name || "Student"} ${
          webhookData.last_name || ""
        }`.trim(),
        message:
          webhookData.message ||
          webhookData.user_input ||
          webhookData.text ||
          webhookData.last_input_text ||
          "Hello",
      };

      // Auto-generate echo if missing (like your legacy project)
      let echo = webhookData.echo;
      if (!echo) {
        echo = `auto_${Date.now()}_${student.subscriber_id}`;
      }

      console.log(
        `👤 Processing for: ${student.full_name} (${student.subscriber_id})`
      );
      console.log(`💬 Message: "${student.message}"`);
      console.log(`🔄 Echo: ${echo}`);

      // 🧠 AI BRAIN MANAGER - Analyze intent and route to agent
      const brainAnalysis = await simulateAIBrainManager(
        student.message,
        student.first_name
      );

      // 🎓 SPECIALIZED AGENT RESPONSE
      const agentResponse = await simulateEducationalAgent(
        brainAnalysis,
        student
      );

      // 📤 FORMAT RESPONSE LIKE LEGACY PROJECT
      const response = formatGoatResponse(agentResponse.message_text, {
        echo: echo,
        version: "v2",
        content: {
          messages: [
            {
              type: "text",
              text: agentResponse.message_text,
            },
          ],
          quick_replies: agentResponse.quick_replies || [],
        },
        ai_coordination: {
          brain_analysis: brainAnalysis,
          agent_used: agentResponse.agent,
          caps_aligned: true,
          timestamp: new Date().toISOString(),
        },
      });

      console.log("📤 Sending response with echo:", echo);
      return res.status(200).json(response);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("❌ Webhook error:", error);

    const echo = req.body?.echo || `error_${Date.now()}`;

    return res.status(200).json(
      formatGoatResponse(
        "Sorry, I encountered an error. Please try again! 🤖",
        {
          echo: echo,
          version: "v2",
          content: {
            messages: [
              {
                type: "text",
                text: "Sorry, I encountered an error. Please try again! 🤖",
              },
            ],
          },
          error: true,
          timestamp: new Date().toISOString(),
        }
      )
    );
  }
};

// 🧠 AI BRAIN MANAGER SIMULATION
async function simulateAIBrainManager(message, studentName) {
  console.log(`🧠 AI Brain analyzing: "${message}" from ${studentName}`);

  const lowerMessage = message.toLowerCase();

  // Intent detection (enhanced from your brain.js)
  let intent = {
    category: "general_query",
    confidence: 0.7,
    recommended_agent: "conversation_manager",
  };

  if (
    lowerMessage.includes("homework") ||
    lowerMessage.includes("help") ||
    lowerMessage.includes("solve")
  ) {
    intent = {
      category: "homework_help",
      confidence: 0.9,
      recommended_agent: "homework",
    };
  } else if (
    lowerMessage.includes("practice") ||
    lowerMessage.includes("questions") ||
    lowerMessage.includes("quiz")
  ) {
    intent = {
      category: "practice_questions",
      confidence: 0.9,
      recommended_agent: "practice",
    };
  } else if (
    lowerMessage.includes("past") ||
    lowerMessage.includes("papers") ||
    lowerMessage.includes("exam")
  ) {
    intent = {
      category: "past_papers",
      confidence: 0.8,
      recommended_agent: "papers",
    };
  } else if (
    lowerMessage.includes("hi") ||
    lowerMessage.includes("hello") ||
    lowerMessage.includes("hey")
  ) {
    intent = {
      category: "greeting",
      confidence: 0.9,
      recommended_agent: "conversation_manager",
    };
  }

  // Subject and grade detection
  let subject = "unknown";
  let grade = "unknown";

  if (lowerMessage.includes("math")) subject = "Mathematics";
  if (lowerMessage.includes("science")) subject = "Physical Science";
  if (lowerMessage.includes("english")) subject = "English";

  const gradeMatch = lowerMessage.match(/grade (\d+)/);
  if (gradeMatch) grade = gradeMatch[1];

  return {
    intent_category: intent.category,
    confidence: intent.confidence,
    recommended_agent: intent.recommended_agent,
    subject_detected: subject,
    grade_detected: grade,
    brain_decision: `Routing to ${intent.recommended_agent} agent`,
  };
}

// 🎓 EDUCATIONAL AGENT SIMULATION
async function simulateEducationalAgent(brainAnalysis, student) {
  const agent = brainAnalysis.recommended_agent;
  const studentName = student.first_name;

  console.log(`🎓 ${agent} agent activated for ${studentName}`);

  switch (agent) {
    case "homework":
      return {
        agent: "homework",
        message_text: `Great! I can help with your homework, ${studentName}! 📚\n\nI'm your specialized homework agent. Please share:\n• Your specific question\n• Subject (Math, Science, etc.)\n• Grade level\n\nI'll provide step-by-step guidance!`,
        quick_replies: [
          { title: "📐 Mathematics", payload: "subject_mathematics" },
          { title: "🔬 Physical Science", payload: "subject_science" },
          { title: "📖 English", payload: "subject_english" },
        ],
      };

    case "practice":
      return {
        agent: "practice",
        message_text: `Perfect! I'll create practice questions for you, ${studentName}! 📝\n\nI'm your practice questions specialist. Tell me:\n• Subject you want to practice\n• Your grade level\n• Specific topic (optional)\n\nI'll generate CAPS-aligned questions!`,
        quick_replies: [
          { title: "Grade 8-9", payload: "grade_junior" },
          { title: "Grade 10-11", payload: "grade_senior" },
          { title: "Grade 12", payload: "grade_matric" },
        ],
      };

    case "papers":
      return {
        agent: "papers",
        message_text: `Excellent! I can help with past exam papers, ${studentName}! 📄\n\nI'm your exam preparation specialist. I provide:\n• Past NSC papers\n• Memorandums\n• Exam strategies\n\nWhat grade and subject papers do you need?`,
        quick_replies: [
          { title: "📐 Math Papers", payload: "papers_mathematics" },
          { title: "🔬 Science Papers", payload: "papers_science" },
          { title: "📖 English Papers", payload: "papers_english" },
        ],
      };

    case "conversation_manager":
    default:
      if (brainAnalysis.intent_category === "greeting") {
        return {
          agent: "conversation_manager",
          message_text: `Hello ${studentName}! 👋\n\nWelcome to your CAPS curriculum AI tutor! I'm powered by specialized AI agents:\n\n📚 Homework Help - Step-by-step solutions\n📝 Practice Questions - Custom CAPS questions\n📄 Past Papers - Exam preparation\n\nWhat would you like help with today?`,
          quick_replies: [
            { title: "📚 Homework Help", payload: "homework_help" },
            { title: "📝 Practice Questions", payload: "practice_questions" },
            { title: "📄 Past Papers", payload: "past_papers" },
          ],
        };
      } else {
        return {
          agent: "conversation_manager",
          message_text: `Hi ${studentName}! I want to help you with your studies. 🎓\n\nMy AI agents specialize in:\n• Homework questions (any subject)\n• Practice exercises\n• Past exam papers\n\nWhat do you need help with?`,
          quick_replies: [
            { title: "📚 Homework Help", payload: "homework_help" },
            { title: "📝 Practice Questions", payload: "practice_questions" },
            { title: "📄 Past Papers", payload: "past_papers" },
          ],
        };
      }
  }
}

// Response formatter (like your legacy project)
function formatGoatResponse(message, additionalData = {}) {
  return {
    message: message,
    timestamp: new Date().toISOString(),
    platform: "whatsapp_manychat",
    ai_agents_coordination: true,
    caps_curriculum_aligned: true,
    developer: "tasimaditheto",
    ...additionalData,
  };
}
