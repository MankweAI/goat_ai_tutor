/**
 * Homework Agent
 * Handles homework help requests and image processing for homework questions
 */
const { getOpenAIClient } = require("../config/openai");
const { analyzeImage } = require("../services/image-processor");
const { updateSession } = require("../session-manager");

class HomeworkAgent {
  constructor() {
    this.openai = getOpenAIClient();
  }

  /**
   * Process homework help requests
   */
  async processMessage(userId, context) {
    console.log("🎓 Homework agent processing for user", userId);

    const message = context.message || "";
    const imageUrl = context.image_url;
    const sessionState = context.session_state || {};
    const userIntent = context.user_intent || {};

    // Update session with homework context
    await updateSession(userId, {
      has_received_help: true,
      last_help_type: "homework_help",
    });

    // Handle image-based homework
    if (imageUrl) {
      return await this.processHomeworkImage(
        userId,
        imageUrl,
        sessionState,
        userIntent
      );
    }

    // Multiple questions from previous image
    if (
      sessionState.expectation === "question_selection" &&
      sessionState.homework_questions
    ) {
      return await this.handleQuestionSelection(userId, message, sessionState);
    }

    // Handle text-based homework question
    return await this.processHomeworkText(
      userId,
      message,
      sessionState,
      userIntent
    );
  }

  /**
   * Process image of homework question
   */
  async processHomeworkImage(userId, imageUrl, sessionState, userIntent) {
    try {
      console.log("Processing homework image...");

      // Extract text and analyze the image
      const imageAnalysis = await analyzeImage(imageUrl);

      if (!imageAnalysis.success) {
        return {
          response:
            "I had trouble reading that image. Could you send it again or type the question?",
          error: true,
        };
      }

      const extractedText = imageAnalysis.text;
      const structuredData = imageAnalysis.structured_data;

      console.log(
        "Image analysis complete:",
        structuredData.subject,
        structuredData.question_count
      );

      // Update session with detected subject/topic
      if (structuredData.subject !== "unknown") {
        await updateSession(userId, {
          subject: structuredData.subject,
        });
      }

      // If multiple questions detected
      if (structuredData.question_count > 1) {
        await updateSession(userId, {
          homework_questions: structuredData.questions,
          expectation: "question_selection",
        });

        return {
          response: `Great! This looks like ${structuredData.subject} homework on ${structuredData.topic}. I can see ${structuredData.question_count} questions. Which one would you like help with first?`,
          expectation: "question_selection",
          question_count: structuredData.question_count,
        };
      }

      // Single question - generate solution
      const solution = await this.generateHomeworkSolution(
        extractedText,
        userIntent
      );

      return {
        response: `I'll help you solve this ${structuredData.subject} question:\n\n${solution}`,
        expectation: "solution_feedback",
        subject: structuredData.subject,
      };
    } catch (error) {
      console.error("Homework image processing error:", error);
      return {
        response:
          "I had trouble processing that image. Could you send it again or type the question?",
        error: true,
      };
    }
  }

  /**
   * Handle user selecting a specific question from previous image
   */
  async handleQuestionSelection(userId, message, sessionState) {
    const questionNumber = this.extractQuestionNumber(message);

    if (
      questionNumber !== null &&
      questionNumber > 0 &&
      questionNumber <= sessionState.homework_questions.length
    ) {
      const selectedQuestion =
        sessionState.homework_questions[questionNumber - 1];

      const solution = await this.generateHomeworkSolution(selectedQuestion, {
        subject: sessionState.subject,
        grade: sessionState.grade_detected,
      });

      await updateSession(userId, {
        expectation: "solution_feedback",
        current_question: questionNumber,
      });

      return {
        response: `Solution for question ${questionNumber}:\n\n${solution}\n\nSay "next" if you need help with another question.`,
        expectation: "solution_feedback",
        current_question: questionNumber,
      };
    }

    // Couldn't understand which question they want
    return {
      response: `I see ${sessionState.homework_questions.length} questions in your homework. Please specify which one you need help with (e.g., "question 2" or "help with #3").`,
      expectation: "question_selection",
    };
  }

  /**
   * Process text-based homework question
   */
  async processHomeworkText(userId, message, sessionState, userIntent) {
    try {
      // Check if user is asking for the next question after a solution
      if (
        sessionState.expectation === "solution_feedback" &&
        sessionState.current_question &&
        sessionState.homework_questions &&
        /next|another|question/i.test(message)
      ) {
        const nextQuestionNum = sessionState.current_question + 1;

        if (nextQuestionNum <= sessionState.homework_questions.length) {
          const nextQuestion =
            sessionState.homework_questions[nextQuestionNum - 1];
          const solution = await this.generateHomeworkSolution(nextQuestion, {
            subject: sessionState.subject,
            grade: sessionState.grade_detected,
          });

          await updateSession(userId, {
            expectation: "solution_feedback",
            current_question: nextQuestionNum,
          });

          return {
            response: `Solution for question ${nextQuestionNum}:\n\n${solution}\n\nSay "next" if you need help with another question.`,
            expectation: "solution_feedback",
            current_question: nextQuestionNum,
          };
        } else {
          return {
            response:
              "That's all the questions from your homework. Is there anything specific you'd like me to explain in more detail?",
            expectation: "concept_clarification",
          };
        }
      }

      // Check if user wants explanation of a concept from the solution
      if (
        sessionState.expectation === "solution_feedback" &&
        /explain|don't understand|confused by|what is|how does/i.test(message)
      ) {
        const concept = this.extractConceptToExplain(message);
        const miniTutorial = await this.generateMiniTutorial(
          sessionState.current_question_text || message,
          concept
        );

        return {
          response: miniTutorial,
          expectation: "mini_tutorial_feedback",
        };
      }

      // Regular homework question
      const solution = await this.generateHomeworkSolution(message, userIntent);

      return {
        response: solution,
        expectation: "solution_feedback",
      };
    } catch (error) {
      console.error("Homework text processing error:", error);
      return {
        response:
          "I'm having trouble solving this question. Could you rephrase it or provide more details?",
        error: true,
      };
    }
  }

  /**
   * Extract question number from user message
   */
  extractQuestionNumber(message) {
    const match = message.match(/(?:question|number|#|q)\s*(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }

    // Check for "first", "second", etc.
    const ordinals = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };
    for (const [word, num] of Object.entries(ordinals)) {
      if (message.toLowerCase().includes(word)) {
        return num;
      }
    }

    // Check for single digit answers
    const digitMatch = message.match(/^(\d+)$/);
    if (digitMatch) {
      return parseInt(digitMatch[1], 10);
    }

    return null;
  }

  /**
   * Extract concept to explain from user message
   */
  extractConceptToExplain(message) {
    const m = message.toLowerCase();

    // Try to extract specific concept phrases
    const conceptPhrases = [
      /explain (\w+)/i,
      /what is (\w+)/i,
      /how does (\w+)/i,
      /confused by (\w+)/i,
      /don't understand (\w+)/i,
    ];

    for (const regex of conceptPhrases) {
      const match = message.match(regex);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Common math concepts to check for
    const concepts = [
      "factoring",
      "factorization",
      "equation",
      "expression",
      "function",
      "derivative",
      "integral",
      "trigonometry",
      "sine",
      "cosine",
      "tangent",
      "algebra",
      "exponent",
      "logarithm",
      "probability",
      "statistics",
      "geometry",
      "theorem",
      "formula",
      "quadratic",
      "linear",
      "polynomial",
    ];

    for (const concept of concepts) {
      if (m.includes(concept)) {
        return concept;
      }
    }

    return "this concept"; // Generic fallback
  }

  /**
   * Generate step-by-step homework solution
   */
  async generateHomeworkSolution(question, userIntent) {
    const subject = userIntent.subject || "Mathematics";
    const grade = userIntent.grade || "11";

    try {
      const systemPrompt = `You are a specialized ${subject} tutor for Grade ${grade} students following the South African CAPS curriculum.
      
Provide a clear, step-by-step solution to this homework problem.
Format your response for WhatsApp (brief paragraphs, simple notation).

Your solution should include:
1. Brief restatement of the problem
2. Explanation of your approach
3. Step-by-step solution with reasoning
4. Final answer clearly marked

Be educational rather than just giving the answer.
Keep explanations clear and concise for mobile reading.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        temperature: 0.5,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Solve this step-by-step: ${question}` },
        ],
        max_tokens: 800,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error("Solution generation error:", error);
      return `I'll help you solve this step by step:\n\n1. First, identify what the question is asking.\n2. Break down the problem into manageable parts.\n3. Apply the relevant formulas or methods.\n\nLet me know if you need more specific guidance on this question.`;
    }
  }

  /**
   * Generate mini-tutorial on specific concept
   */
  async generateMiniTutorial(question, concept) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content: `Create a brief, focused mini-tutorial about the concept needed to solve this problem.
Be concise (max 200 words), educational, and directly relevant.
Include 1-2 simple examples that illustrate the concept.
Format for WhatsApp with short paragraphs and clear explanations.`,
          },
          {
            role: "user",
            content: `Question: ${question}\nConcept: ${concept}`,
          },
        ],
        max_tokens: 400,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error("Mini-tutorial generation error:", error);
      return `The concept of ${concept} is key to solving this problem. It involves understanding how to apply the relevant principles systematically. Start by identifying the core elements, then apply the appropriate techniques step by step.`;
    }
  }
}

module.exports = new HomeworkAgent();
