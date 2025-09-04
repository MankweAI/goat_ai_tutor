/**
 * Agent Interactions Test Framework
 * Tests the behavior and interactions between different AI agents
 */

// Mock dependencies to avoid actual API calls during testing
jest.mock("../lib/config/openai", () => ({
  getOpenAIClient: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn(async (options) => ({
          choices: [
            {
              message: {
                content: "Test response from mock OpenAI",
              },
            },
          ],
        })),
      },
    },
  })),
}));

jest.mock("../lib/session-manager", () => ({
  getSession: jest.fn(async (userId) => ({ user_id: userId })),
  updateSession: jest.fn(async (userId, update) => ({
    user_id: userId,
    ...update,
  })),
  addToHistory: jest.fn(async () => ({})),
}));

// Import modules to test
const brainAgent = require("../lib/agents/brain-agent");
const homeworkAgent = require("../lib/agents/homework-agent");
const practiceAgent = require("../lib/agents/practice-agent");
const examAgent = require("../lib/agents/exam-agent");

describe("Brain Agent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Should analyze user intent correctly", async () => {
    const result = await brainAgent.analyzeIntent(
      "help me with algebra",
      null,
      {}
    );
    expect(result).toBeDefined();
    expect(result.category).toBeDefined();
  });

  test("Should determine appropriate specialized agent", async () => {
    const intent = {
      category: "homework_help",
      subject: "Mathematics",
      grade: "11",
    };
    const targetAgent = await brainAgent.determineTargetAgent(intent, {});
    expect(targetAgent).toBe("homework_agent");
  });
});

describe("Homework Agent", () => {
  test("Should process homework text correctly", async () => {
    const response = await homeworkAgent.processMessage("user123", {
      message: "Solve 2x + 5 = 15",
      session_state: {},
    });

    expect(response).toBeDefined();
    expect(response.response).toBeDefined();
  });

  test("Should handle image processing", async () => {
    // Mock image processing result
    const response = await homeworkAgent.processMessage("user123", {
      image_url: "http://example.com/image.jpg",
      image_data: {
        success: true,
        text: "Solve 2x + 5 = 15",
        structured_data: {
          subject: "Mathematics",
          question_count: 1,
          questions: ["Solve 2x + 5 = 15"],
        },
      },
      session_state: {},
    });

    expect(response).toBeDefined();
    expect(response.response).toBeDefined();
  });
});

describe("Practice Agent", () => {
  test("Should generate practice questions", async () => {
    const response = await practiceAgent.processMessage("user123", {
      message: "Give me algebra practice",
      session_state: { grade_detected: "11" },
    });

    expect(response).toBeDefined();
    expect(response.response).toBeDefined();
  });

  test("Should provide progressive hints", async () => {
    const response = await practiceAgent.provideHint("user123", {
      current_practice_question: {
        text: "Solve for x: 2x + 5 = 15",
        topic: "algebra",
        difficulty: "easy",
        grade: "11",
      },
      hint_level: 1,
    });

    expect(response).toBeDefined();
    expect(response.response).toContain("Hint");
  });
});

describe("End-to-End Agent Flow", () => {
  test("Should handle complete conversation flow", async () => {
    // Step 1: Process initial greeting with Brain Agent
    const greetingResponse = await brainAgent.processMessage("user123", {
      message: "Hi",
      user_name: "Student",
      session_state: { welcome_sent: false },
    });

    expect(greetingResponse).toBeDefined();

    // Step 2: Process help request with Brain Agent which should route to Homework Agent
    const helpResponse = await brainAgent.processMessage("user123", {
      message: "Help me with algebra homework",
      user_name: "Student",
      session_state: { welcome_sent: true },
    });

    expect(helpResponse).toBeDefined();
    expect(helpResponse.agent_id).toBe("homework_agent");
  });
});
