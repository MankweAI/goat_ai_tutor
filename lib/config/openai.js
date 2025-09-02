// lib/config/openai.js
// OpenAI API configuration for Vercel deployment

const OpenAI = require("openai");

let openaiClient = null;

// Initialize OpenAI client (singleton pattern for serverless)
const getOpenAIClient = () => {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OpenAI API key missing");
      throw new Error(
        "OpenAI API key missing. Please check your environment variables."
      );
    }

    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
};

// Test OpenAI connection
const testConnection = async () => {
  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Test connection - respond with 'OK'",
        },
      ],
      max_tokens: 5,
    });

    console.log("✅ OpenAI connection successful");
    return {
      success: true,
      message: "Connected successfully",
      response: response.choices[0].message.content,
    };
  } catch (error) {
    console.error("❌ OpenAI connection failed:", error.message);
    return { success: false, message: error.message };
  }
};

// Common OpenAI configurations for different agents
const agentConfigs = {
  agentManager: {
    model: "gpt-4",
    temperature: 0.3,
    max_tokens: 200,
    systemPrompt:
      "You are the AI Agent Manager for a CAPS curriculum-aligned tutoring system. Your job is to understand student queries and route them to the appropriate specialized agent.",
  },

  homeworkAgent: {
    model: "gpt-4",
    temperature: 0.5,
    max_tokens: 800,
    systemPrompt:
      "You are a Homework Agent specialized in helping South African students with CAPS curriculum homework. Provide step-by-step explanations and encourage understanding.",
  },

  practiceAgent: {
    model: "gpt-4",
    temperature: 0.7,
    max_tokens: 600,
    systemPrompt:
      "You are a Practice Questions Agent that generates CAPS curriculum-aligned practice questions. Create engaging questions with varying difficulty levels.",
  },
};

module.exports = {
  getOpenAIClient,
  testConnection,
  agentConfigs,
};

