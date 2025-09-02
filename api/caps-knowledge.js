// lib/caps-knowledge.js
// CAPS (Curriculum Assessment Policy Statement) knowledge base for South African education

// CAPS curriculum structure and subjects
const CAPS_SUBJECTS = {
  // Core subjects for all grades
  core: {
    Mathematics: {
      grades: ["8", "9", "10", "11", "12"],
      topics: {
        8: [
          "Numbers",
          "Patterns",
          "Functions",
          "Algebra",
          "Geometry",
          "Measurement",
          "Data Handling",
          "Probability",
        ],
        9: [
          "Numbers",
          "Patterns",
          "Functions",
          "Algebra",
          "Geometry",
          "Measurement",
          "Data Handling",
          "Probability",
        ],
        10: [
          "Algebra",
          "Functions",
          "Number Patterns",
          "Geometry",
          "Trigonometry",
          "Statistics",
          "Probability",
        ],
        11: [
          "Functions",
          "Number Patterns",
          "Algebra",
          "Geometry",
          "Trigonometry",
          "Statistics",
          "Probability",
        ],
        12: [
          "Functions",
          "Sequences and Series",
          "Finance",
          "Trigonometry",
          "Polynomials",
          "Differential Calculus",
          "Statistics",
          "Probability",
        ],
      },
      assessment: "Formal Assessment Tasks (FATs), Tests, Examinations",
    },

    "Mathematical Literacy": {
      grades: ["10", "11", "12"],
      topics: {
        10: [
          "Numbers and Operations",
          "Patterns",
          "Functions",
          "Space and Shape",
          "Measurement",
          "Data Handling",
        ],
        11: [
          "Numbers and Operations",
          "Patterns",
          "Functions",
          "Space and Shape",
          "Measurement",
          "Data Handling",
        ],
        12: [
          "Numbers and Operations",
          "Patterns",
          "Functions",
          "Space and Shape",
          "Measurement",
          "Data Handling",
        ],
      },
      assessment: "Formal Assessment Tasks (FATs), Tests, Examinations",
    },

    "Physical Sciences": {
      grades: ["10", "11", "12"],
      topics: {
        10: [
          "Matter and Materials",
          "Chemical Change",
          "Mechanics",
          "Waves, Sound and Light",
        ],
        11: [
          "Matter and Materials",
          "Chemical Change",
          "Mechanics",
          "Waves, Sound and Light",
        ],
        12: [
          "Matter and Materials",
          "Chemical Change",
          "Mechanics",
          "Waves, Sound and Light",
          "Electricity and Magnetism",
        ],
      },
      assessment: "Practical work, Tests, Examinations",
    },

    "Life Sciences": {
      grades: ["10", "11", "12"],
      topics: {
        10: [
          "Life at Molecular, Cellular and Tissue Level",
          "Life Processes in Plants and Animals",
          "Environmental Studies",
          "Diversity, Change and Continuity",
        ],
        11: [
          "Life at Molecular, Cellular and Tissue Level",
          "Life Processes in Plants and Animals",
          "Environmental Studies",
          "Diversity, Change and Continuity",
        ],
        12: [
          "Life at Molecular, Cellular and Tissue Level",
          "Life Processes in Plants and Animals",
          "Environmental Studies",
          "Diversity, Change and Continuity",
        ],
      },
      assessment: "Practical work, Tests, Examinations",
    },

    "English Home Language": {
      grades: ["8", "9", "10", "11", "12"],
      topics: {
        8: [
          "Listening and Speaking",
          "Reading and Viewing",
          "Writing and Presenting",
          "Language Structures and Conventions",
        ],
        9: [
          "Listening and Speaking",
          "Reading and Viewing",
          "Writing and Presenting",
          "Language Structures and Conventions",
        ],
        10: [
          "Listening and Speaking",
          "Reading and Viewing",
          "Writing and Presenting",
          "Language Structures and Conventions",
        ],
        11: [
          "Listening and Speaking",
          "Reading and Viewing",
          "Writing and Presenting",
          "Language Structures and Conventions",
        ],
        12: [
          "Listening and Speaking",
          "Reading and Viewing",
          "Writing and Presenting",
          "Language Structures and Conventions",
        ],
      },
      assessment: "Oral work, Written work, Examinations",
    },

    "Afrikaans First Additional Language": {
      grades: ["8", "9", "10", "11", "12"],
      topics: {
        8: [
          "Luister en Praat",
          "Lees en Kyk",
          "Skryf en Aanbied",
          "Taalstrukture en Konvensies",
        ],
        9: [
          "Luister en Praat",
          "Lees en Kyk",
          "Skryf en Aanbied",
          "Taalstrukture en Konvensies",
        ],
        10: [
          "Luister en Praat",
          "Lees en Kyk",
          "Skryf en Aanbied",
          "Taalstrukture en Konvensies",
        ],
        11: [
          "Luister en Praat",
          "Lees en Kyk",
          "Skryf en Aanbied",
          "Taalstrukture en Konvensies",
        ],
        12: [
          "Luister en Praat",
          "Lees en Kyk",
          "Skryf en Aanbied",
          "Taalstrukture en Konvensies",
        ],
      },
      assessment: "Mondelinge werk, Geskrewe werk, Eksamens",
    },
  },

  // Optional subjects
  optional: {
    Geography: {
      grades: ["10", "11", "12"],
      topics: {
        10: [
          "Climate and Weather",
          "Geomorphology",
          "Settlements",
          "Economic Geography of South Africa",
        ],
        11: [
          "Climate and Weather",
          "Geomorphology",
          "Settlements",
          "Economic Geography of South Africa",
        ],
        12: [
          "Climate and Weather",
          "Geomorphology",
          "Settlements",
          "Economic Geography of South Africa",
        ],
      },
    },

    History: {
      grades: ["10", "11", "12"],
      topics: {
        10: [
          "The Scramble for Africa",
          "South African War",
          "World War I",
          "Russian Revolution",
        ],
        11: [
          "Nationalism in South Africa",
          "World War II",
          "Cold War",
          "Independent Africa",
        ],
        12: [
          "Civil Rights Movement",
          "Black Consciousness",
          "End of the Cold War",
          "Democracy in South Africa",
        ],
      },
    },

    Accounting: {
      grades: ["10", "11", "12"],
      topics: {
        10: [
          "Accounting Concepts",
          "Accounting Equation",
          "General Ledger",
          "Trial Balance",
        ],
        11: [
          "Partnerships",
          "Clubs and Societies",
          "Interpretation of Financial Statements",
          "Budgeting",
        ],
        12: [
          "Companies",
          "Cash Flow Statements",
          "Analysis and Interpretation",
          "Ethical Behavior",
        ],
      },
    },

    "Business Studies": {
      grades: ["10", "11", "12"],
      topics: {
        10: [
          "Influences on Business Environment",
          "Business Sectors",
          "Business Plan",
          "Presentation and Data Response",
        ],
        11: [
          "Business Environment",
          "Business Ventures",
          "Business Roles",
          "Presentation and Data Response",
        ],
        12: [
          "Business Environment",
          "Business Operations",
          "Miscellaneous Topics",
          "Presentation and Data Response",
        ],
      },
    },

    Economics: {
      grades: ["10", "11", "12"],
      topics: {
        10: [
          "Basic Economic Problem",
          "Economic Systems",
          "Circular Flow",
          "Demand and Supply",
        ],
        11: [
          "Macroeconomics",
          "Economic Growth and Development",
          "Money and Banking",
          "Public Sector",
        ],
        12: [
          "Macroeconomics",
          "Economic Growth and Development",
          "Money and Banking",
          "Open Economy",
        ],
      },
    },

    Tourism: {
      grades: ["10", "11", "12"],
      topics: {
        10: [
          "Introducing Tourism",
          "Communication and Customer Care",
          "Tourism Attractions",
          "Tourism Industry",
        ],
        11: [
          "Tourism Attractions",
          "Tourism Industry",
          "Tourism Business",
          "Sustainable Tourism",
        ],
        12: [
          "Tourism Attractions",
          "Tourism Industry",
          "Tourism Business",
          "Sustainable Tourism",
        ],
      },
    },
  },
};

// Assessment requirements per grade
const ASSESSMENT_REQUIREMENTS = {
  FET: {
    // Further Education and Training Phase (Grades 10-12)
    formal_assessment: {
      tests_assignments: "25%",
      june_exam: "25%",
      preliminary_exam: "25%", // Grade 12 only
      final_exam: "25%", // Grades 10-11: November exam, Grade 12: Final NSC exam
    },
    promotion_requirements: {
      "10-11": "Pass 6 out of 7 subjects with specific level requirements",
      12: "NSC requirements for Bachelor, Diploma, or Higher Certificate",
    },
  },
  "Senior Phase": {
    // Grades 7-9
    formal_assessment: {
      tests_assignments: "75%",
      exam: "25%",
    },
  },
};

// Common learning difficulties and solutions
const LEARNING_SUPPORT = {
  mathematics: [
    "Break down complex problems into smaller steps",
    "Use visual aids and real-world examples",
    "Practice basic arithmetic until fluent",
    "Connect new concepts to previously learned material",
  ],
  sciences: [
    "Use practical experiments to understand concepts",
    "Create concept maps to show relationships",
    "Practice drawing and labeling diagrams",
    "Connect theory to everyday applications",
  ],
  languages: [
    "Practice reading comprehension regularly",
    "Build vocabulary through context",
    "Focus on grammar in context, not isolation",
    "Use authentic texts and media",
  ],
};

// Function to get subject information
function getSubjectInfo(subjectName, grade = null) {
  const normalizedSubject = normalizeSubjectName(subjectName);

  // Search in core subjects
  if (CAPS_SUBJECTS.core[normalizedSubject]) {
    const subject = CAPS_SUBJECTS.core[normalizedSubject];
    return {
      ...subject,
      subject_name: normalizedSubject,
      category: "core",
      grade_specific_topics: grade ? subject.topics[grade] || [] : null,
    };
  }

  // Search in optional subjects
  if (CAPS_SUBJECTS.optional[normalizedSubject]) {
    const subject = CAPS_SUBJECTS.optional[normalizedSubject];
    return {
      ...subject,
      subject_name: normalizedSubject,
      category: "optional",
      grade_specific_topics: grade ? subject.topics[grade] || [] : null,
    };
  }

  return null;
}

// Normalize subject names to handle variations
function normalizeSubjectName(subjectName) {
  const subjectMap = {
    math: "Mathematics",
    maths: "Mathematics",
    mathematics: "Mathematics",
    "mathematical literacy": "Mathematical Literacy",
    "math lit": "Mathematical Literacy",
    physics: "Physical Sciences",
    "physical science": "Physical Sciences",
    "physical sciences": "Physical Sciences",
    chemistry: "Physical Sciences",
    biology: "Life Sciences",
    "life science": "Life Sciences",
    "life sciences": "Life Sciences",
    english: "English Home Language",
    afrikaans: "Afrikaans First Additional Language",
    geography: "Geography",
    history: "History",
    accounting: "Accounting",
    "business studies": "Business Studies",
    economics: "Economics",
    tourism: "Tourism",
  };

  const normalized = subjectName.toLowerCase().trim();
  return subjectMap[normalized] || subjectName;
}

// Function to detect CAPS alignment
function getCAPSAlignment(subject, grade, topic = null) {
  const subjectInfo = getSubjectInfo(subject, grade);

  if (!subjectInfo) {
    return {
      aligned: false,
      reason: "Subject not found in CAPS curriculum",
    };
  }

  if (grade && !subjectInfo.grades.includes(grade)) {
    return {
      aligned: false,
      reason: `${subject} is not offered in Grade ${grade} according to CAPS`,
    };
  }

  if (topic && subjectInfo.grade_specific_topics) {
    const topicFound = subjectInfo.grade_specific_topics.some(
      (capsTopicName) =>
        capsTopicName.toLowerCase().includes(topic.toLowerCase()) ||
        topic.toLowerCase().includes(capsTopicName.toLowerCase())
    );

    return {
      aligned: topicFound,
      reason: topicFound
        ? `Topic "${topic}" aligns with CAPS curriculum for Grade ${grade} ${subject}`
        : `Topic "${topic}" may not be part of standard CAPS curriculum for Grade ${grade} ${subject}`,
      suggested_topics: subjectInfo.grade_specific_topics,
    };
  }

  return {
    aligned: true,
    reason: `${subject} is part of the CAPS curriculum`,
    available_grades: subjectInfo.grades,
    category: subjectInfo.category,
  };
}

// Function to get learning support suggestions
function getLearningSupport(subject) {
  const normalizedSubject = normalizeSubjectName(subject).toLowerCase();

  if (normalizedSubject.includes("mathematic")) {
    return LEARNING_SUPPORT.mathematics;
  } else if (normalizedSubject.includes("science")) {
    return LEARNING_SUPPORT.sciences;
  } else if (
    normalizedSubject.includes("english") ||
    normalizedSubject.includes("afrikaans")
  ) {
    return LEARNING_SUPPORT.languages;
  }

  return [
    "Break down complex concepts into smaller parts",
    "Use active learning techniques",
    "Practice regularly and consistently",
    "Connect new learning to existing knowledge",
    "Seek help when concepts are unclear",
  ];
}

module.exports = {
  CAPS_SUBJECTS,
  ASSESSMENT_REQUIREMENTS,
  LEARNING_SUPPORT,
  getSubjectInfo,
  normalizeSubjectName,
  getCAPSAlignment,
  getLearningSupport,
};
