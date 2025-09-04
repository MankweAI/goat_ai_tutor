/**
 * Practice Agent
 * Generates adaptive practice questions with progressive difficulty
 */
const { getOpenAIClient } = require("../config/openai");
const { updateSession } = require("../session-manager");

class PracticeAgent {
  constructor() {
    this.openai = getOpenAIClient();
    this.difficultyLevels = ["easy", "medium", "hard", "challenge"];
  }

  /**
   * Process practice requests
   */
  async processMessage(userId, context) {
    console.log("📝 Practice agent processing for user", userId);

    const message = context.message || "";
    const sessionState = context.session_state || {};
    const userIntent = context.user_intent || {};

    // Update session with practice context
    await updateSession(userId, {
      has_received_help: true,
      last_help_type: "practice",
    });

    // Extract subject, grade, topic info
    const subject = userIntent.subject || sessionState.subject || "Mathematics";
    const grade = userIntent.grade || sessionState.grade_detected || "11";
    const requestedTopic = userIntent.topic || this.detectTopic(message);

    // Check if user wants to change difficulty
    const difficultyChange = this.detectDifficultyChange(message);

    // Check if user is requesting a hint
    if (
      /\bhint\b|stuck|don't know how|not sure/i.test(message) &&
      sessionState.current_practice_question
    ) {
      return await this.provideHint(userId, sessionState);
    }

    // If user is asking for different difficulty
    if (difficultyChange && sessionState.practice_topic) {
      const newDifficulty = this.getNewDifficulty(
        sessionState.practice_difficulty || "medium",
        difficultyChange
      );

      return await this.generatePracticeQuestion(
        userId,
        subject,
        grade,
        sessionState.practice_topic,
        newDifficulty
      );
    }

    // If user is changing topic
    if (
      requestedTopic &&
      (!sessionState.practice_topic ||
        requestedTopic !== sessionState.practice_topic)
    ) {
      return await this.generatePracticeQuestion(
        userId,
        subject,
        grade,
        requestedTopic,
        "medium" // Reset difficulty when changing topic
      );
    }

    // If requesting solution
    if (
      /solution|answer|show me|give me the answer|solve it/i.test(message) &&
      sessionState.current_practice_question
    ) {
      return await this.provideSolution(userId, sessionState);
    }

    // If continuing with current topic but asking for another question
    if (sessionState.practice_topic && /more|another|next|new/i.test(message)) {
      const difficulty = this.getNextDifficulty(
        sessionState.practice_difficulty || "medium"
      );

      return await this.generatePracticeQuestion(
        userId,
        subject,
        grade,
        sessionState.practice_topic,
        difficulty
      );
    }

    // If this is a new practice session, need to get topic
    if (!sessionState.practice_topic && !requestedTopic) {
      return {
        response: `Great! I'd be happy to give you Grade ${grade} ${subject} practice questions. Which topic would you like to practice? (e.g., Algebra, Trigonometry, Functions, Geometry, Statistics)`,
        expectation: "topic_selection",
      };
    }

    // Default: generate practice question with specified or current topic
    const topic = requestedTopic || sessionState.practice_topic || "Algebra";
    const difficulty = this.getInitialDifficulty(grade);

    return await this.generatePracticeQuestion(
      userId,
      subject,
      grade,
      topic,
      difficulty
    );
  }

  /**
   * Generate a practice question
   */
  async generatePracticeQuestion(userId, subject, grade, topic, difficulty) {
    try {
      const systemPrompt = `You are a ${subject} practice question generator for Grade ${grade} CAPS curriculum.

Generate ONE ${difficulty} difficulty practice question on ${topic}.
The question should be clear, concise, and appropriate for WhatsApp format.

Return JSON with:
{
  "question_text": "your practice question here",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "hint1": "subtle hint that doesn't give away the answer",
  "hint2": "more direct hint about approach",
  "hint3": "substantial hint about solution method",
  "solution": "step-by-step solution"
}

Keep the question under 100 words unless data sets are needed.
Do not include the solution or hints in the question_text.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Create a ${difficulty} ${topic} question for Grade ${grade}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      const questionData = JSON.parse(completion.choices[0].message.content);
      const questionId = `practice_${Date.now()}`;

      // Update session with question info
      await updateSession(userId, {
        practice_topic: topic,
        practice_difficulty: difficulty,
        current_practice_question: {
          id: questionId,
          text: questionData.question_text,
          topic: questionData.topic || topic,
          difficulty: questionData.difficulty || difficulty,
          subject: subject,
          grade: grade,
          hints: [questionData.hint1, questionData.hint2, questionData.hint3],
          solution: questionData.solution,
        },
        hint_level: 0,
        expectation: "practice_attempt",
      });

      return {
        response: `Here's a ${difficulty} ${topic} question:\n\n${questionData.question_text}\n\nSay "Hint" if you're stuck, "Solution" to see the answer, or "Change topic" to try something else.`,
        expectation: "practice_attempt",
        practice_info: {
          topic: topic,
          difficulty: difficulty,
          question_id: questionId,
        },
      };
    } catch (error) {
      console.error("Practice question generation error:", error);

      // Fallback question based on topic
      const fallbackQuestions = {
        Algebra: "Solve for x: 3(x+2) = 15",
        Trigonometry: "Find the value of sin(30°) + cos(60°)",
        Functions:
          "Determine the axis of symmetry for the parabola y = x² - 6x + 8",
        Geometry: "Calculate the area of a circle with radius 7 cm",
        Statistics: "Find the mean of the data set: 4, 7, 10, 12, 15, 22",
      };

      const fallbackQuestion =
        fallbackQuestions[topic] || "Solve the equation: 2x + 5 = 13";
      const questionId = `fallback_${Date.now()}`;

      // Update session with fallback question
      await updateSession(userId, {
        practice_topic: topic,
        practice_difficulty: difficulty,
        current_practice_question: {
          id: questionId,
          text: fallbackQuestion,
          topic: topic,
          difficulty: difficulty,
          subject: subject,
          grade: grade,
          hints: [
            "Think about the first step to isolate the variable.",
            "Remember to apply the same operation to both sides.",
            "Once you've isolated the variable, simplify to find the value.",
          ],
          solution:
            "Step 1: Expand 3(x+2) = 15\nStep 2: 3x + 6 = 15\nStep 3: 3x = 9\nStep 4: x = 3",
          is_fallback: true,
        },
        hint_level: 0,
        expectation: "practice_attempt",
      });

      return {
        response: `Here's a ${difficulty} ${topic} question:\n\n${fallbackQuestion}\n\nSay "Hint" if you're stuck, "Solution" to see the answer, or "Change topic" to try something else.`,
        expectation: "practice_attempt",
        practice_info: {
          topic: topic,
          difficulty: difficulty,
          question_id: questionId,
        },
        is_fallback: true,
      };
    }
  }

  /**
   * Provide progressive hints based on current hint level
   */
  async provideHint(userId, sessionState) {
    const question = sessionState.current_practice_question;
    if (!question) {
      return {
        response:
          "I need to give you a practice question first before I can provide a hint. What topic would you like to practice?",
        error: "no_active_question",
      };
    }

    const currentHintLevel = sessionState.hint_level || 0;

    // Maximum 3 hints
    if (currentHintLevel >= 3) {
      return {
        response:
          "I've already given you all the hints. Would you like to see the solution or try a different question?",
        expectation: "practice_hint_followup",
      };
    }

    const nextHintLevel = currentHintLevel + 1;
    const hint = question.hints && question.hints[currentHintLevel];

    // Update hint level in session
    await updateSession(userId, {
      hint_level: nextHintLevel,
    });

    if (!hint) {
      // Generate hint dynamically if we don't have one stored
      return this.generateHint(userId, sessionState, nextHintLevel);
    }

    return {
      response: `Hint ${nextHintLevel}: ${hint}\n\nSay "another hint" if you need more help, or "solution" to see the answer.`,
      expectation: "practice_attempt",
      hint_level: nextHintLevel,
    };
  }

  /**
   * Generate hint dynamically if not stored in question
   */
  async generateHint(userId, sessionState, hintLevel) {
    const question = sessionState.current_practice_question;

    try {
      // Generate appropriate hint based on level
      const systemPrompt = `You are providing hint #${hintLevel} for a Grade ${question.grade} ${question.subject} question.
The topic is ${question.topic} and the difficulty is ${question.difficulty}.

Hint guidelines by level:
- Level 1: Very general hint about approach/formula
- Level 2: More specific hint about first step
- Level 3: Substantial hint that guides through key part

Question: ${question.text}

Provide ONLY the hint (no intro, no reminders). Keep it concise (under 50 words).`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate hint #${hintLevel}` },
        ],
        max_tokens: 150,
      });

      const hint = completion.choices[0].message.content;

      return {
        response: `Hint ${hintLevel}: ${hint}\n\nSay "another hint" if you need more help, or "solution" to see the answer.`,
        expectation: "practice_attempt",
        hint_level: hintLevel,
      };
    } catch (error) {
      console.error("Hint generation error:", error);

      // Fallback hints based on hint level
      const fallbackHints = [
        "Think about which formula or concept applies to this type of problem.",
        "Start by identifying the key variables and writing down what you know.",
        "Consider breaking the problem into smaller steps and solving each part.",
      ];

      const hint =
        fallbackHints[Math.min(hintLevel - 1, fallbackHints.length - 1)];

      return {
        response: `Hint ${hintLevel}: ${hint}\n\nSay "another hint" if you need more help, or "solution" to see the answer.`,
        expectation: "practice_attempt",
        hint_level: hintLevel,
        is_fallback: true,
      };
    }
  }

  /**
   * Provide solution for current practice question
   */
  async provideSolution(userId, sessionState) {
    const question = sessionState.current_practice_question;
    if (!question) {
      return {
        response:
          "I need to give you a practice question first before I can provide a solution. What topic would you like to practice?",
        error: "no_active_question",
      };
    }

    // If we have a stored solution, use it
    if (question.solution) {
      return {
        response: `Solution:\n\n${question.solution}\n\nSay "more" for another question, or name a different topic to practice.`,
        expectation: "practice_followup",
      };
    }

    // Otherwise, generate a solution
    try {
      const systemPrompt = `You are providing a step-by-step solution to this Grade ${question.grade} ${question.subject} question.

Question: ${question.text}

Provide a clear, step-by-step solution with explanations.
Format for WhatsApp (brief paragraphs, simple notation).
Highlight the final answer clearly.

Keep the solution concise but thorough.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Provide the step-by-step solution" },
        ],
        max_tokens: 500,
      });

      const solution = completion.choices[0].message.content;

      // Store the solution in the session for future reference
      await updateSession(userId, {
        current_practice_question: {
          ...question,
          solution: solution,
        },
      });

      return {
        response: `Solution:\n\n${solution}\n\nSay "more" for another question, or name a different topic to practice.`,
        expectation: "practice_followup",
      };
    } catch (error) {
      console.error("Solution generation error:", error);

      return {
        response:
          "I'm having trouble generating a detailed solution right now. The key is to break down the problem step by step. Say 'more' for another question or 'change topic' to try something else.",
        expectation: "practice_followup",
        is_fallback: true,
      };
    }
  }

  /**
   * Detect topic from message
   */
  detectTopic(message) {
    const lowerMessage = message.toLowerCase();

    if (/\balgebra\b|\bequation\b|\bfactor\b/.test(lowerMessage)) {
      return "Algebra";
    } else if (/\btrig\b|\bsin\b|\bcos\b|\btan\b/.test(lowerMessage)) {
      return "Trigonometry";
    } else if (/\bfunction\b|\bgraph\b|\bparabola\b/.test(lowerMessage)) {
      return "Functions";
    } else if (/\bgeometry\b|\bcircle\b|\btriangle\b/.test(lowerMessage)) {
      return "Geometry";
    } else if (/\bstat\b|\bmean\b|\bmedian\b|\bmode\b/.test(lowerMessage)) {
      return "Statistics";
    } else if (/\bprobab/.test(lowerMessage)) {
      return "Probability";
    } else if (/\bpattern\b|\bsequence\b/.test(lowerMessage)) {
      return "Number Patterns";
    }

    return null;
  }

  /**
   * Detect difficulty change request
   */
  detectDifficultyChange(message) {
    const lowerMessage = message.toLowerCase();

    if (/\beasier\b|\beasy\b|\bsimpler\b/.test(lowerMessage)) {
      return "easier";
    } else if (
      /\bharder\b|\bhard\b|\bdifficult\b|\bchallenge\b/.test(lowerMessage)
    ) {
      return "harder";
    }

    return null;
  }

  /**
   * Get appropriate initial difficulty based on grade
   */
  getInitialDifficulty(grade) {
    const gradeNum = parseInt(grade, 10);

    if (gradeNum >= 11) {
      return "medium";
    }

    return "easy";
  }

  /**
   * Get next difficulty level
   */
  getNextDifficulty(currentDifficulty) {
    const index = this.difficultyLevels.indexOf(currentDifficulty);

    // If we can't identify the current difficulty, return medium
    if (index === -1) {
      return "medium";
    }

    // If already at max difficulty, stay there
    if (index === this.difficultyLevels.length - 1) {
      return currentDifficulty;
    }

    // Otherwise go up one level
    return this.difficultyLevels[index + 1];
  }

  /**
   * Get new difficulty based on user request
   */
  getNewDifficulty(currentDifficulty, change) {
    const index = this.difficultyLevels.indexOf(currentDifficulty);

    // If we can't identify the current difficulty, default to medium
    if (index === -1) {
      return "medium";
    }

    if (change === "easier") {
      // Can't go below lowest difficulty
      if (index === 0) return currentDifficulty;
      return this.difficultyLevels[index - 1];
    } else if (change === "harder") {
      // Can't go above highest difficulty
      if (index === this.difficultyLevels.length - 1) return currentDifficulty;
      return this.difficultyLevels[index + 1];
    }

    return currentDifficulty;
  }
}

module.exports = new PracticeAgent();
