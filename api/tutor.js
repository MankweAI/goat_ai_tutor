// api/tutor.js
// EDUCATIONAL AGENTS - Homework, Practice, Papers
// Copy this entire file exactly as shown

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      endpoint: "Educational Tutor Agents",
      status: "✅ All agents ready!",
      developer: "tasimaditheto",
      agents: {
        homework: "Step-by-step homework problem solver",
        practice: "CAPS-aligned practice questions generator",
        papers: "Past exam papers and memorandums specialist",
        profile: "Student learning profile manager",
      },
      example:
        'POST { "agent": "homework", "user_name": "Sarah", "homework_question": "Solve x + 5 = 10" }',
    });
  }

  if (req.method === "POST") {
    try {
      const {
        agent = "homework",
        user_name = "Student",
        homework_question = "",
        subject = "Mathematics",
        grade = "10",
        topic = "",
        message = "",
      } = req.body;

      console.log(`🎓 ${agent} agent helping ${user_name}`);

      let response;

      if (agent === "homework") {
        response = handleHomeworkAgent({
          user_name,
          homework_question,
          subject,
          grade,
          topic,
          message,
        });
      } else if (agent === "practice") {
        response = handlePracticeAgent({
          user_name,
          subject,
          grade,
          topic,
        });
      } else if (agent === "papers") {
        response = handlePastPapersAgent({
          user_name,
          subject,
          grade,
        });
      } else if (agent === "profile") {
        response = handleProfileAgent({
          user_name,
          grade,
          subject,
        });
      } else {
        response = {
          error: "Unknown agent",
          available_agents: ["homework", "practice", "papers", "profile"],
          example:
            'Use: { "agent": "homework", "user_name": "Sarah", "homework_question": "Help with math" }',
        };
      }

      return res.status(200).json({
        timestamp: new Date().toISOString(),
        agent_used: agent,
        tutor_status: "success",
        developer: "tasimaditheto",
        ...response,
      });
    } catch (error) {
      console.error("❌ Tutor error:", error);
      return res.status(500).json({
        error: "Tutor processing failed",
        agent: req.body.agent || "unknown",
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};

// HOMEWORK AGENT HANDLER
function handleHomeworkAgent(data) {
  const { user_name, homework_question, subject, grade, topic, message } = data;

  const question = homework_question || message || "No question provided";

  // Analyze the homework problem
  const analysis = analyzeHomeworkProblem(question, subject, grade);

  // Generate step-by-step solution
  const solution = generateStepBySolution(question, analysis, user_name);

  return {
    agent: "homework",
    specialist: "Step-by-step problem solver",
    user_info: {
      user_name: user_name,
      subject: subject,
      grade: `Grade ${grade}`,
      question: question,
    },
    problem_analysis: analysis,
    step_by_step_solution: solution,
    caps_alignment: `This solution follows Grade ${grade} ${subject} CAPS curriculum standards`,
    next_steps: {
      can_ask_followup: true,
      can_request_similar: true,
      can_explain_concepts: true,
    },
  };
}

// PRACTICE AGENT HANDLER
function handlePracticeAgent(data) {
  const { user_name, subject, grade, topic } = data;

  const practiceQuestions = generatePracticeQuestions(
    subject,
    grade,
    topic,
    user_name
  );

  return {
    agent: "practice",
    specialist: "CAPS-aligned practice questions generator",
    user_info: {
      user_name: user_name,
      subject: subject,
      grade: `Grade ${grade}`,
      topic: topic || "General",
    },
    practice_session: {
      subject: subject,
      grade: grade,
      topic: topic,
      questions: practiceQuestions,
      caps_reference: `Grade ${grade} ${subject} CAPS curriculum`,
      estimated_time: "15-20 minutes",
    },
    next_steps: {
      can_request_answers: true,
      can_adjust_difficulty: true,
      can_request_more: true,
    },
  };
}

// PAST PAPERS AGENT HANDLER
function handlePastPapersAgent(data) {
  const { user_name, subject, grade } = data;

  const pastPapers = generatePastPapersInfo(subject, grade);

  return {
    agent: "past_papers",
    specialist: "Exam preparation specialist",
    user_info: {
      user_name: user_name,
      subject: subject,
      grade: `Grade ${grade}`,
    },
    past_papers_session: {
      subject: subject,
      grade: grade,
      available_papers: pastPapers.papers,
      exam_tips: pastPapers.tips,
      memorandums: pastPapers.memorandums,
      caps_alignment: `Grade ${grade} ${subject} NSC/CAPS aligned`,
    },
    next_steps: {
      can_download_papers: true,
      can_request_tips: true,
      can_get_memorandums: true,
    },
  };
}

// PROFILE AGENT HANDLER
function handleProfileAgent(data) {
  const { user_name, grade, subject } = data;

  return {
    agent: "profile",
    specialist: "Learning profile manager",
    user_profile: {
      user_name: user_name,
      grade: `Grade ${grade}`,
      primary_subject: subject,
      learning_style: "Visual and step-by-step",
      strengths: ["Problem-solving approach"],
      areas_for_improvement: ["Will be identified through usage"],
      caps_progress: "Starting assessment",
    },
    personalized_recommendations: {
      study_schedule: "Regular practice sessions recommended",
      focus_areas: [`${subject} problem-solving techniques`],
      next_goals: ["Complete homework efficiently", "Master key concepts"],
    },
    next_steps: {
      can_update_profile: true,
      can_set_goals: true,
      can_track_progress: true,
    },
  };
}

// HELPER FUNCTIONS
function analyzeHomeworkProblem(question, subject, grade) {
  const lowerQuestion = question.toLowerCase();

  let problemType = "general_problem";
  let difficulty = "medium";
  let keyTerms = [];

  // Mathematics analysis
  if (subject.toLowerCase().includes("math")) {
    if (lowerQuestion.includes("equation") || lowerQuestion.includes("solve")) {
      problemType = "equation_solving";
      keyTerms.push("algebraic_equations");
    }
    if (lowerQuestion.includes("graph") || lowerQuestion.includes("plot")) {
      problemType = "graphing";
      keyTerms.push("coordinate_geometry");
    }
    if (
      lowerQuestion.includes("factor") ||
      lowerQuestion.includes("quadratic")
    ) {
      problemType = "factoring";
      keyTerms.push("quadratic_equations");
    }
  }

  // Science analysis
  if (subject.toLowerCase().includes("science")) {
    if (lowerQuestion.includes("force") || lowerQuestion.includes("motion")) {
      problemType = "physics_mechanics";
      keyTerms.push("forces_and_motion");
    }
    if (
      lowerQuestion.includes("chemical") ||
      lowerQuestion.includes("reaction")
    ) {
      problemType = "chemistry";
      keyTerms.push("chemical_reactions");
    }
  }

  return {
    problem_type: problemType,
    difficulty_level: difficulty,
    key_terms: keyTerms,
    caps_topic: `Grade ${grade} ${subject}`,
    estimated_time: "10-15 minutes",
  };
}

function generateStepBySolution(question, analysis, userName) {
  // Example solution for quadratic equation
  if (
    question.toLowerCase().includes("x²") ||
    question.toLowerCase().includes("quadratic")
  ) {
    return {
      greeting: `Hi ${userName}! Let me solve this step-by-step for you. 📚`,
      steps: [
        {
          step_number: 1,
          action: "Identify the equation type",
          explanation:
            "This is a quadratic equation in the form ax² + bx + c = 0",
          working: question,
        },
        {
          step_number: 2,
          action: "Choose solution method",
          explanation:
            "We can use factoring, completing the square, or the quadratic formula",
          working: "Let's try factoring first",
        },
        {
          step_number: 3,
          action: "Factor if possible",
          explanation:
            "Look for two numbers that multiply to give c and add to give b",
          working: "Find factors and solve",
        },
        {
          step_number: 4,
          action: "Check your answer",
          explanation: "Substitute back into the original equation to verify",
          working: "Verification step",
        },
      ],
      final_answer: "x = [solution values]",
      encouragement: `Great question, ${userName}! Quadratic equations are fundamental in Grade ${analysis.caps_topic}. Keep practicing! 🌟`,
    };
  }

  // General solution template
  return {
    greeting: `Hi ${userName}! Let me help you solve this problem step-by-step. 📚`,
    steps: [
      {
        step_number: 1,
        action: "Understand the problem",
        explanation: "Let's break down what the question is asking",
        working: question,
      },
      {
        step_number: 2,
        action: "Identify the method",
        explanation: "Choose the best approach for this type of problem",
        working: "Apply relevant concepts",
      },
      {
        step_number: 3,
        action: "Solve systematically",
        explanation: "Work through the solution methodically",
        working: "Step-by-step calculation",
      },
    ],
    final_answer: "Solution will be provided based on the specific problem",
    encouragement: `Excellent work, ${userName}! This type of problem helps build your ${analysis.caps_topic} skills. 🎓`,
  };
}

function generatePracticeQuestions(subject, grade, topic, userName) {
  const questions = [];

  if (subject.toLowerCase().includes("math")) {
    questions.push(
      {
        question_number: 1,
        question_text: `Solve for x: 2x + 5 = 15`,
        question_type: "linear_equation",
        marks: 3,
        difficulty: "easy",
        caps_reference: `Grade ${grade} Algebra`,
      },
      {
        question_number: 2,
        question_text: `Factor completely: x² - 9x + 20`,
        question_type: "factoring",
        marks: 4,
        difficulty: "medium",
        caps_reference: `Grade ${grade} Quadratic Equations`,
      },
      {
        question_number: 3,
        question_text: `A rectangle has length (x + 3) and width (x - 1). If the area is 35 square units, find x.`,
        question_type: "word_problem",
        marks: 6,
        difficulty: "challenging",
        caps_reference: `Grade ${grade} Application of Algebra`,
      }
    );
  } else if (subject.toLowerCase().includes("science")) {
    questions.push(
      {
        question_number: 1,
        question_text: `Calculate the force needed to accelerate a 5kg object at 2m/s².`,
        question_type: "calculation",
        marks: 3,
        difficulty: "easy",
        caps_reference: `Grade ${grade} Forces and Motion`,
      },
      {
        question_number: 2,
        question_text: `Explain Newton's Second Law and give a real-world example.`,
        question_type: "explanation",
        marks: 5,
        difficulty: "medium",
        caps_reference: `Grade ${grade} Newton's Laws`,
      }
    );
  }

  return questions;
}

function generatePastPapersInfo(subject, grade) {
  const currentYear = new Date().getFullYear();

  return {
    papers: [
      {
        year: currentYear - 1,
        paper: `${subject} Grade ${grade} Paper 1`,
        type: "November Examination",
        duration: "3 hours",
        marks: 150,
      },
      {
        year: currentYear - 1,
        paper: `${subject} Grade ${grade} Paper 2`,
        type: "November Examination",
        duration: "3 hours",
        marks: 150,
      },
      {
        year: currentYear - 2,
        paper: `${subject} Grade ${grade} Paper 1`,
        type: "November Examination",
        duration: "3 hours",
        marks: 150,
      },
    ],
    memorandums: [
      `${subject} Grade ${grade} Memorandum ${currentYear - 1}`,
      `${subject} Grade ${grade} Memorandum ${currentYear - 2}`,
    ],
    tips: [
      "Read questions carefully and underline key words",
      "Show all working for partial marks",
      "Manage your time effectively during exams",
      "Practice with past papers regularly",
      "Review memorandums to understand marking criteria",
    ],
  };
}
