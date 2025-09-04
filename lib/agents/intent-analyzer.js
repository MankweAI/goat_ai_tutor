/**
 * Intent Analyzer
 * Analyzes user messages to understand their educational intent
 */
const { getOpenAIClient } = require("../config/openai");

/**
 * Analyze user's message to extract educational intent
 */
async function analyzeUserIntent(message, sessionState = {}) {
  const openai = getOpenAIClient();

  // Simple pre-filters
  const lowerMessage = message.toLowerCase();

  // Fast-track for obvious greetings
  if (/^(hi|hello|hey|greetings)$/i.test(message.trim())) {
    return {
      category: "greeting",
      confidence: 0.95,
      subject: sessionState.subject || "unknown",
      grade: sessionState.grade_detected || "unknown",
      topic: null,
      conversationStage: sessionState.welcome_sent
        ? "returning_greeting"
        : "initial_greeting",
    };
  }

  // Detect grade from message
  const gradeMatch = message.match(/\bgrade\s*(\d{1,2})\b/i);
  const grade = gradeMatch
    ? gradeMatch[1]
    : sessionState.grade_detected || "unknown";

  try {
    // Main intent analysis with AI
    const systemPrompt = `You are an expert educational intent analyzer for South African CAPS curriculum.
Analyze the student's message and extract the following in JSON format:

1. category: One of [greeting, homework_help, practice_request, exam_preparation, concept_explanation, general_question]
2. subject: The academic subject (e.g., Mathematics, Physical Sciences)
3. grade: The grade level 8-12
4. topic: The specific topic within the subject (e.g., Algebra, Trigonometry)
5. confidence: 0.0-1.0 indicating your confidence in this analysis
6. conversationStage: [greeting, subject_selection, topic_exploration, problem_solving, reflection]

Base your analysis on South African CAPS curriculum knowledge.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Student message: "${message}"` },
        {
          role: "user",
          content: `Known context: Grade ${grade}, Subject: ${
            sessionState.subject || "unknown"
          }`,
        },
      ],
      response_format: { type: "json_object" },
    });

    let intent = JSON.parse(completion.choices[0].message.content);

    // If we detected grade in message but AI didn't, override
    if (grade !== "unknown" && intent.grade === "unknown") {
      intent.grade = grade;
    }

    // If we have subject from session but AI didn't detect it, keep previous
    if (sessionState.subject && intent.subject === "unknown") {
      intent.subject = sessionState.subject;
    }

    return intent;
  } catch (error) {
    console.error("Intent analysis error:", error);

    // Fallback basic intent detection
    let category = "general_question";

    if (
      lowerMessage.includes("homework") ||
      lowerMessage.includes("solve") ||
      lowerMessage.includes("help")
    ) {
      category = "homework_help";
    } else if (
      lowerMessage.includes("practice") ||
      lowerMessage.includes("question")
    ) {
      category = "practice_request";
    } else if (
      lowerMessage.includes("exam") ||
      lowerMessage.includes("test") ||
      lowerMessage.includes("paper")
    ) {
      category = "exam_preparation";
    } else if (
      lowerMessage.includes("explain") ||
      lowerMessage.includes("what is") ||
      lowerMessage.includes("how does")
    ) {
      category = "concept_explanation";
    } else if (/^(hi|hello|hey|greetings)/i.test(lowerMessage)) {
      category = "greeting";
    }

    return {
      category: category,
      subject: sessionState.subject || "unknown",
      grade: grade,
      topic: detectTopic(lowerMessage),
      confidence: 0.7,
      conversationStage: sessionState.welcome_sent
        ? "ongoing_conversation"
        : "greeting",
    };
  }
}

/**
 * Simple topic detection based on keywords
 */
function detectTopic(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("algebra") || lowerMessage.includes("equation")) {
    return "Algebra";
  } else if (lowerMessage.includes("trig")) {
    return "Trigonometry";
  } else if (
    lowerMessage.includes("function") ||
    lowerMessage.includes("graph")
  ) {
    return "Functions";
  } else if (lowerMessage.includes("geometry")) {
    return "Geometry";
  } else if (
    lowerMessage.includes("statistic") ||
    lowerMessage.includes("data")
  ) {
    return "Statistics";
  } else if (lowerMessage.includes("probability")) {
    return "Probability";
  } else if (
    lowerMessage.includes("calculus") ||
    lowerMessage.includes("derivative")
  ) {
    return "Calculus";
  }

  return null;
}

module.exports = { analyzeUserIntent };

