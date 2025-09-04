/**
 * Exam Agent
 * Specialized agent for exam preparation and past paper assistance
 */
const { BaseAgent } = require("./agent-protocol");
const { getOpenAIClient } = require("../config/openai");
const { updateSession } = require("../session-manager");

class ExamAgent extends BaseAgent {
  constructor() {
    super("exam_agent");
    this.capabilities = [
      "exam_preparation",
      "past_papers",
      "exam_strategies",
      "topic_revision",
      "marking_schemes",
    ];
    this.openai = getOpenAIClient();
  }

  async processMessage(userId, context) {
    const message = context.message || "";
    const sessionState = context.session_state || {};
    const userIntent = context.user_intent || {};

    // Update session with exam prep context
    await updateSession(userId, {
      has_received_help: true,
      last_help_type: "exam_prep",
    });

    // Extract subject, grade, topic info
    const subject = userIntent.subject || sessionState.subject || "Mathematics";
    const grade = userIntent.grade || sessionState.grade_detected || "11";

    // Check if we're in an active exam flow
    if (sessionState.exam_flow?.active) {
      return await this.continueExamFlow(userId, message, sessionState);
    }

    // Starting new exam prep
    return await this.startExamPrep(
      userId,
      message,
      subject,
      grade,
      sessionState
    );
  }

  async startExamPrep(userId, message, subject, grade, sessionState) {
    // Extract topic from message or use default
    const topicMatch = message.match(
      /\b(algebra|trig|function|geometry|calculus|statistics|probability)\w*/i
    );
    const topic = topicMatch ? topicMatch[0] : "mixed topics";

    // Determine if user wants past papers specifically
    const wantsPastPaper = /past paper|previous exam|exam paper/i.test(message);

    // Create exam preparation content
    const examPrepPrompt = `You are a South African CAPS curriculum exam specialist for Grade ${grade} ${subject}.
    
Create ${
      wantsPastPaper
        ? "a past paper style question set"
        : "an exam preparation pack"
    } focusing on ${topic}.
Include:
1. 3-4 exam-style questions with increasing difficulty
2. Key points to remember for this topic
3. Exam strategy tip
4. A note on how this connects to the CAPS curriculum

Format your response for WhatsApp (brief paragraphs, clear structure).`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        temperature: 0.6,
        messages: [
          { role: "system", content: examPrepPrompt },
          {
            role: "user",
            content: `Generate a ${
              wantsPastPaper ? "past paper" : "exam prep"
            } set for ${topic} now.`,
          },
        ],
      });

      // Update session with active exam flow
      await updateSession(userId, {
        exam_flow: {
          active: true,
          subject: subject,
          grade: grade,
          focus_topic: topic,
          mode: wantsPastPaper ? "past_paper" : "exam_prep",
          stage: "questions",
        },
      });

      return {
        response:
          completion.choices[0].message.content +
          "\n\nSay 'more questions' for another set, 'solutions' for answers to these questions, or specify another topic.",
        exam_info: {
          subject,
          grade,
          topic,
          mode: wantsPastPaper ? "past_paper" : "exam_prep",
        },
      };
    } catch (error) {
      console.error("Exam prep generation error:", error);
      return {
        response: `I'm preparing ${subject} Grade ${grade} exam material for you, focused on ${topic}. Would you like practice questions, past paper examples, or study strategies?`,
        error: true,
      };
    }
  }

  async continueExamFlow(userId, message, sessionState) {
    const examFlow = sessionState.exam_flow;
    const subject = examFlow.subject;
    const grade = examFlow.grade;
    const topic = examFlow.focus_topic;

    // Check if user wants solutions
    if (/solution|answer|memo/i.test(message)) {
      return await this.provideSolutions(userId, sessionState);
    }

    // Check if user wants more questions
    if (/more|another|next/i.test(message)) {
      return await this.provideMoreQuestions(userId, sessionState);
    }

    // Check if user wants to switch topics
    const topicMatch = message.match(
      /\b(algebra|trig|function|geometry|calculus|statistics|probability)\w*/i
    );
    if (topicMatch) {
      const newTopic = topicMatch[0];

      // Update exam flow with new topic
      await updateSession(userId, {
        exam_flow: {
          ...examFlow,
          focus_topic: newTopic,
        },
      });

      return await this.startExamPrep(
        userId,
        `${newTopic} ${examFlow.mode}`,
        subject,
        grade,
        {
          ...sessionState,
          exam_flow: {
            ...examFlow,
            active: false,
          },
        }
      );
    }

    // Default response to keep the flow going
    return {
      response: `For your ${subject} Grade ${grade} ${
        examFlow.mode === "past_paper" ? "past paper" : "exam prep"
      } on ${topic}, you can say:\n- "more questions" for another set\n- "solutions" for answers\n- Specify another topic to switch focus`,
      exam_info: {
        subject,
        grade,
        topic,
        mode: examFlow.mode,
      },
    };
  }

  async provideSolutions(userId, sessionState) {
    const examFlow = sessionState.exam_flow;

    const solutionsPrompt = `You are providing solutions for ${
      examFlow.subject
    } Grade ${examFlow.grade} ${examFlow.focus_topic} ${
      examFlow.mode === "past_paper" ? "past paper questions" : "exam questions"
    }.

Provide clear, step-by-step solutions that would be appropriate for a marking memorandum.
Format your response for WhatsApp (brief paragraphs, clear notation).
Include:
1. Solution approach for each question
2. Key steps in the working
3. Final answers clearly marked
4. Brief explanation of common mistakes

Keep your response concise and educational.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        temperature: 0.5,
        messages: [
          { role: "system", content: solutionsPrompt },
          {
            role: "user",
            content: `Provide solutions for the previous ${examFlow.focus_topic} questions.`,
          },
        ],
      });

      return {
        response:
          completion.choices[0].message.content +
          "\n\nSay 'more questions' for another set or specify another topic to practice.",
        exam_info: {
          subject: examFlow.subject,
          grade: examFlow.grade,
          topic: examFlow.focus_topic,
          mode: examFlow.mode,
          solutions_provided: true,
        },
      };
    } catch (error) {
      console.error("Solutions generation error:", error);
      return {
        response: `Here are solution guidelines for ${examFlow.focus_topic}:\n\n• Break down each problem step by step\n• Apply the key formulas and concepts\n• Show all your working clearly\n• Double-check your final answer\n\n(Specific solutions currently unavailable - please try again)`,
        error: true,
      };
    }
  }

  async provideMoreQuestions(userId, sessionState) {
    const examFlow = sessionState.exam_flow;

    // Start a new exam prep with the same parameters but fresh questions
    return await this.startExamPrep(
      userId,
      `${examFlow.focus_topic} ${examFlow.mode}`,
      examFlow.subject,
      examFlow.grade,
      sessionState
    );
  }
}

module.exports = new ExamAgent();
