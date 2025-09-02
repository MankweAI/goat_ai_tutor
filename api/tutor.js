// api/tutor.js
// Consolidated Educational Agents - Homework, Practice, Past Papers
// Single endpoint that handles all educational assistance

const handler = async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      endpoint: "Educational Tutor - All Agents",
      description: "Consolidated Homework + Practice + Past Papers Agents",
      developer: "tasimaditheto",
      date: "2025-09-02",
      available_agents: {
        homework: "POST with agent=homework - Step-by-step homework solutions",
        practice: "POST with agent=practice - Custom practice questions",
        papers: "POST with agent=papers - Past exam papers and memorandums",
        profile: "POST with agent=profile - Student learning profiles",
      },
      example_usage: {
        homework:
          'POST { agent: "homework", user_name: "Sarah", homework_question: "Solve x² + 5x + 6 = 0", subject: "Mathematics", grade: "10" }',
        practice:
          'POST { agent: "practice", user_name: "John", subject: "Mathematics", grade: "11", topic: "Trigonometry", difficulty: "medium" }',
        papers:
          'POST { agent: "papers", user_name: "Lisa", subject: "Physical Science", grade: "12", year: "2023" }',
      },
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only GET and POST methods allowed" });
  }

  try {
    const { agent, ...requestData } = req.body;

    if (!agent) {
      return res.status(400).json({
        error: "Missing agent parameter",
        required: "agent",
        available_agents: ["homework", "practice", "papers", "profile"],
        example:
          '{ "agent": "homework", "user_name": "Sarah", "homework_question": "Solve x + 5 = 10" }',
      });
    }

    console.log(`🎓 Tutor processing agent: ${agent}`);

    let result;
    switch (agent) {
      case "homework":
        result = await handleHomeworkAgent(requestData);
        break;
      case "practice":
        result = await handlePracticeAgent(requestData);
        break;
      case "papers":
        result = await handlePastPapersAgent(requestData);
        break;
      case "profile":
        result = await handleProfileAgent(requestData);
        break;
      default:
        return res.status(400).json({
          error: "Invalid agent",
          provided: agent,
          available: ["homework", "practice", "papers", "profile"],
        });
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      agent_used: agent,
      tutor_status: "success",
      ...result,
    });
  } catch (error) {
    console.error("❌ Tutor processing error:", error);
    return res.status(500).json({
      error: "Tutor processing failed",
      agent: req.body.agent || "unknown",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Homework Agent (from homework-agent.js)
async function handleHomeworkAgent(data) {
  const {
    user_id,
    user_name,
    subject,
    grade,
    topic,
    homework_question,
    previous_work = null,
  } = data;

  if (!homework_question) {
    throw new Error("Missing required field: homework_question");
  }

  console.log(
    `📚 Homework Agent helping ${
      user_name || "Student"
    } with: ${homework_question.substring(0, 50)}...`
  );

  // Analyze the homework problem
  const problemAnalysis = await analyzeHomeworkProblem(
    homework_question,
    subject,
    grade,
    topic
  );

  // Generate step-by-step solution
  const stepBySolution = await generateStepBySolution(
    homework_question,
    problemAnalysis,
    user_name,
    previous_work
  );

  return {
    agent: "homework",
    agent_info: "Step-by-step homework assistance specialist",
    user_info: {
      user_name: user_name || "Student",
      subject: subject || "Not specified",
      grade: grade || "Not specified",
    },
    homework_request: {
      question: homework_question,
      topic: topic || "General",
      has_previous_work: !!previous_work,
    },
    problem_analysis: problemAnalysis,
    step_by_step_solution: stepBySolution,
    next_steps: {
      can_ask_followup: true,
      can_request_similar_problems: true,
      can_get_more_explanation: true,
    },
  };
}

// Practice Agent
async function handlePracticeAgent(data) {
  const {
    user_name,
    subject,
    grade,
    topic,
    difficulty = "medium",
    num_questions = 5,
  } = data;

  if (!subject || !grade) {
    throw new Error("Missing required fields: subject, grade");
  }

  console.log(
    `📝 Practice Agent creating questions for ${
      user_name || "Student"
    }: Grade ${grade} ${subject}`
  );

  // Generate practice questions
  const practiceQuestions = await generatePracticeQuestions(
    subject,
    grade,
    topic,
    difficulty,
    num_questions,
    user_name
  );

  return {
    agent: "practice",
    agent_info: "Custom practice questions generator",
    user_info: {
      user_name: user_name || "Student",
      subject: subject,
      grade: grade,
      topic: topic || "General",
    },
    practice_session: {
      subject: subject,
      grade: grade,
      topic: topic,
      difficulty: difficulty,
      total_questions: num_questions,
      questions: practiceQuestions.questions,
      caps_alignment: `Grade ${grade} ${subject} CAPS curriculum`,
      estimated_time: `${num_questions * 3} minutes`,
    },
    next_steps: {
      can_request_answers: true,
      can_adjust_difficulty: true,
      can_request_more_questions: true,
    },
  };
}

// Past Papers Agent
async function handlePastPapersAgent(data) {
  const {
    user_name,
    subject,
    grade,
    year = "recent",
    include_memorandum = true,
  } = data;

  if (!subject || !grade) {
    throw new Error("Missing required fields: subject, grade");
  }

  console.log(
    `📄 Past Papers Agent helping ${
      user_name || "Student"
    } with Grade ${grade} ${subject} papers`
  );

  // Generate past papers information
  const pastPapersInfo = await generatePastPapersInfo(
    subject,
    grade,
    year,
    include_memorandum,
    user_name
  );

  return {
    agent: "past_papers",
    agent_info: "Past exam papers and memorandums specialist",
    user_info: {
      user_name: user_name || "Student",
      subject: subject,
      grade: grade,
      requested_year: year,
    },
    past_papers_session: {
      subject: subject,
      grade: grade,
      available_papers: pastPapersInfo.papers,
      exam_tips: pastPapersInfo.exam_tips,
      caps_alignment: `Grade ${grade} ${subject} NSC/CAPS aligned`,
      memorandums_included: include_memorandum,
    },
    next_steps: {
      can_request_specific_year: true,
      can_get_exam_tips: true,
      can_request_memorandums: true,
    },
  };
}

// Profile Agent
async function handleProfileAgent(data) {
  const {
    user_name,
    grade,
    subjects = [],
    learning_goals = [],
    preferred_difficulty = "medium",
  } = data;

  console.log(
    `👤 Profile Agent setting up profile for ${user_name || "Student"}`
  );

  return {
    agent: "profile",
    agent_info: "Student learning profile manager",
    user_profile: {
      user_name: user_name || "Student",
      grade: grade || "Not specified",
      subjects: subjects,
      learning_goals: learning_goals,
      preferred_difficulty: preferred_difficulty,
      profile_created: new Date().toISOString(),
    },
    recommendations: {
      suggested_subjects: grade ? getSubjectsForGrade(grade) : [],
      learning_path: `Personalized CAPS curriculum path for Grade ${
        grade || "X"
      }`,
      next_actions: [
        "Complete subject preferences",
        "Set specific learning goals",
        "Start with homework help or practice questions",
      ],
    },
    next_steps: {
      can_update_preferences: true,
      can_set_goals: true,
      can_start_learning: true,
    },
  };
}

// Helper functions
async function analyzeHomeworkProblem(
  question,
  subject = "General",
  grade = "Unknown",
  topic = "General"
) {
  try {
    const OpenAI = require("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const analysisPrompt = `
You are an expert CAPS curriculum tutor analyzing a homework question.

HOMEWORK QUESTION: "${question}"
SUBJECT: ${subject}
GRADE: Grade ${grade}
TOPIC: ${topic}

Analyze and respond with JSON containing:
1. problem_type: equation_solving, word_problem, calculation, concept_explanation
2. difficulty_level: basic, intermediate, advanced
3. caps_topic: specific CAPS curriculum topic
4. solution_approach: array of steps needed
5. key_concepts: main concepts being tested
6. estimated_time: time in minutes

Respond ONLY with valid JSON.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an expert CAPS curriculum homework analyzer. Always respond with valid JSON only.",
        },
        { role: "user", content: analysisPrompt },
      ],
      temperature: 0.2,
      max_tokens: 400,
    });

    let analysis;
    try {
      analysis = JSON.parse(response.choices[0].message.content.trim());
    } catch {
      analysis = {
        problem_type: "general_problem",
        difficulty_level: "intermediate",
        caps_topic: `Grade ${grade} ${subject}`,
        solution_approach: [
          "Understand the question",
          "Apply relevant method",
          "Check answer",
        ],
        key_concepts: [subject || "General"],
        estimated_time: 10,
      };
    }

    analysis.processing_time = new Date().toISOString();
    return analysis;
  } catch (error) {
    console.error("❌ Error analyzing homework problem:", error);
    return {
      problem_type: "general_problem",
      difficulty_level: "intermediate",
      caps_topic: `Grade ${grade} ${subject}`,
      solution_approach: ["Read carefully", "Apply method", "Check answer"],
      key_concepts: [subject || "General"],
      estimated_time: 10,
      processing_time: new Date().toISOString(),
      note: "Fallback analysis used",
    };
  }
}

async function generateStepBySolution(
  question,
  analysis,
  userName = "Student",
  previousWork = null
) {
  try {
    const OpenAI = require("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const solutionPrompt = `
You are a patient CAPS curriculum tutor helping ${userName}.

HOMEWORK QUESTION: "${question}"
STUDENT'S PREVIOUS WORK: ${previousWork || "None provided"}

Create a step-by-step solution with JSON format:
- greeting: personalized greeting
- step_by_step: array of steps with step_number, action, explanation, calculation
- final_answer: the complete answer
- encouragement: motivating message

Be educational and encouraging. Respond ONLY with valid JSON.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a patient CAPS curriculum tutor. Always respond with valid JSON only.",
        },
        { role: "user", content: solutionPrompt },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    let solution;
    try {
      solution = JSON.parse(response.choices[0].message.content.trim());
    } catch {
      solution = {
        greeting: `Hi ${userName}! Let me help you solve this step by step.`,
        step_by_step: [
          {
            step_number: 1,
            action: "Understand the question",
            explanation: "Read carefully and identify what we need to find.",
            calculation: question,
          },
          {
            step_number: 2,
            action: "Apply the method",
            explanation: "Use the appropriate method for this problem type.",
            calculation: "Follow standard procedure",
          },
          {
            step_number: 3,
            action: "Check the answer",
            explanation: "Verify our answer makes sense.",
            calculation: "Review and confirm",
          },
        ],
        final_answer: "Work through the steps above to find your answer",
        encouragement: `Great question, ${userName}! Take it step by step.`,
      };
    }

    solution.processing_time = new Date().toISOString();
    return solution;
  } catch (error) {
    console.error("❌ Error generating solution:", error);
    return {
      greeting: `Hi ${userName}! Let me help you with this problem.`,
      step_by_step: [
        {
          step_number: 1,
          action: "Read the question",
          explanation: "Understand what's being asked.",
          calculation: question,
        },
      ],
      final_answer: "Follow the problem-solving steps",
      encouragement: `You can do this, ${userName}!`,
      processing_time: new Date().toISOString(),
      note: "Fallback solution used",
    };
  }
}

async function generatePracticeQuestions(
  subject,
  grade,
  topic,
  difficulty,
  numQuestions,
  userName
) {
  try {
    const OpenAI = require("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const questionsPrompt = `
You are a CAPS curriculum practice question generator for ${userName}.

REQUIREMENTS:
Subject: ${subject}
Grade: ${grade}
Topic: ${topic || "General"}
Difficulty: ${difficulty}
Number of questions: ${numQuestions}

Generate ${numQuestions} practice questions in JSON format:
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "question here",
      "question_type": "multiple_choice/calculation/word_problem",
      "marks": number,
      "caps_reference": "CAPS topic reference"
    }
  ]
}

Make questions progressively challenging and CAPS-aligned. Respond ONLY with valid JSON.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an expert CAPS curriculum question generator. Always respond with valid JSON only.",
        },
        { role: "user", content: questionsPrompt },
      ],
      temperature: 0.4,
      max_tokens: 800,
    });

    let questionsData;
    try {
      questionsData = JSON.parse(response.choices[0].message.content.trim());
    } catch {
      questionsData = {
        questions: Array.from({ length: numQuestions }, (_, i) => ({
          question_number: i + 1,
          question_text: `Practice question ${
            i + 1
          } for Grade ${grade} ${subject}${topic ? ` - ${topic}` : ""}`,
          question_type: "calculation",
          marks: 5,
          caps_reference: `Grade ${grade} ${subject} CAPS`,
        })),
      };
    }

    questionsData.processing_time = new Date().toISOString();
    return questionsData;
  } catch (error) {
    console.error("❌ Error generating practice questions:", error);
    return {
      questions: Array.from({ length: numQuestions }, (_, i) => ({
        question_number: i + 1,
        question_text: `Sample question ${i + 1} for Grade ${grade} ${subject}`,
        question_type: "general",
        marks: 5,
        caps_reference: `Grade ${grade} ${subject}`,
      })),
      processing_time: new Date().toISOString(),
      note: "Fallback questions generated",
    };
  }
}

async function generatePastPapersInfo(
  subject,
  grade,
  year,
  includeMemo,
  userName
) {
  const currentYear = new Date().getFullYear();
  const years =
    year === "recent"
      ? [currentYear - 1, currentYear - 2, currentYear - 3]
      : [parseInt(year)];

  const papers = years.map((yr) => ({
    year: yr,
    subject: subject,
    grade: grade,
    paper_1: `${subject} Grade ${grade} Paper 1 (${yr})`,
    paper_2:
      subject.includes("Mathematics") || subject.includes("Science")
        ? `${subject} Grade ${grade} Paper 2 (${yr})`
        : null,
    memorandum: includeMemo
      ? `${subject} Grade ${grade} Memorandum (${yr})`
      : null,
    exam_board: "Department of Basic Education",
    caps_aligned: true,
  }));

  const examTips = [
    `Read questions carefully in ${subject} exams`,
    "Manage your time effectively - allocate time per question",
    "Show all working for partial marks",
    "Review CAPS curriculum requirements",
    "Practice with past papers regularly",
  ];

  return {
    papers: papers,
    exam_tips: examTips,
    processing_time: new Date().toISOString(),
  };
}

function getSubjectsForGrade(grade) {
  const gradeNum = parseInt(grade);
  if (gradeNum >= 10) {
    return [
      "Mathematics",
      "Physical Sciences",
      "Life Sciences",
      "English Home Language",
      "Afrikaans First Additional Language",
      "Geography",
      "History",
    ];
  } else {
    return [
      "Mathematics",
      "Natural Sciences",
      "English Home Language",
      "Afrikaans First Additional Language",
      "Social Sciences",
    ];
  }
}

module.exports = handler;
module.exports.default = handler;
