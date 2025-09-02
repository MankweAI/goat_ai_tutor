// lib/assist-packs.js
// Assistance Pack Generators for first-value delivery.
// Each pack returns { text, help_type, expectation? }

function buildConceptPack(topic = "statistics") {
  if (topic.toLowerCase().includes("stat")) {
    return {
      help_type: "concept_pack",
      text: "Statistics recap: *Mean* = sum ÷ count, *Median* = middle when ordered, *Range* = max − min. Example: 4,6,6,9 → mean 6.25, median 6, range 5. Want to work on a dataset or move to standard deviation?",
      expectation: "awaiting_dataset_or_choice",
    };
  }
  if (topic.toLowerCase().includes("function")) {
    return {
      help_type: "concept_pack",
      text: "Functions reminder: A quadratic f(x)=ax²+bx+c has a parabola shape; vertex from completing square or -b/(2a). Example: f(x)=x²−4x+3 → vertex (2, -1). Want vertex method practice or factorization next?",
      expectation: "awaiting_choice",
    };
  }
  if (topic.toLowerCase().includes("trig")) {
    return {
      help_type: "concept_pack",
      text: "Trig basics: sin²θ + cos²θ = 1, tanθ = sinθ/cosθ. Example: If sinθ=3/5 (θ acute), cosθ=4/5, tanθ=3/4. Focus on identities or solving equations?",
      expectation: "awaiting_choice",
    };
  }
  if (topic.toLowerCase().includes("algebra")) {
    return {
      help_type: "concept_pack",
      text: "Algebra core: Factor patterns like a²−b²=(a+b)(a−b), trinomials ax²+bx+c, and manipulating exponents. Example: x²−9=(x−3)(x+3). Want factoring practice or equation solving?",
      expectation: "awaiting_choice",
    };
  }
  return {
    help_type: "concept_pack",
    text: "Key concept starter: Provide the exact topic (e.g. 'exponential functions', 'sine rule', 'standard deviation') or I can assume a standard intro. Which would you like?",
    expectation: "awaiting_topic_detail",
  };
}

function buildPracticePack(topic = "algebra") {
  if (topic.toLowerCase().includes("algebra")) {
    return {
      help_type: "practice_pack",
      text: "Practice set:\n1) Solve: 2x + 5 = 17\n2) Factor: x² − 7x + 12\nReply with answers or say 'more' for harder ones.",
      expectation: "awaiting_answers",
    };
  }
  if (topic.toLowerCase().includes("function")) {
    return {
      help_type: "practice_pack",
      text: "Practice set:\n1) Given f(x)=x²−4x+3 find f(2)\n2) Determine the axis of symmetry of f(x)=2x²−8x+5.\nReply with answers or say 'more'.",
      expectation: "awaiting_answers",
    };
  }
  if (topic.toLowerCase().includes("trig")) {
    return {
      help_type: "practice_pack",
      text: "Trig practice:\n1) Simplify: sin²θ + cos²θ\n2) If sinθ=5/13 (acute), find cosθ.\nSend answers or request identities challenge.",
      expectation: "awaiting_answers",
    };
  }
  if (topic.toLowerCase().includes("stat")) {
    return {
      help_type: "practice_pack",
      text: "Stats practice:\nDataset: 3,4,4,6,9\n1) Mean?\n2) Median?\nProvide answers or ask for standard deviation next.",
      expectation: "awaiting_answers",
    };
  }
  return {
    help_type: "practice_pack",
    text: "I can generate practice for algebra, functions, trigonometry, geometry, or statistics. Name one to start.",
    expectation: "awaiting_topic_choice",
  };
}

function buildHomeworkScaffold(rawMessage, topicGuess = "algebra") {
  const scaffold = topicGuess.toLowerCase().includes("stat")
    ? "Send: your data set (comma separated) or the exact question text. I will compute mean/median/spread and guide you."
    : topicGuess.toLowerCase().includes("function")
    ? "Send the exact function and what you need (e.g. intercepts, vertex, domain)."
    : topicGuess.toLowerCase().includes("trig")
    ? "Send the trig equation or identity task (e.g. 'Solve 2sinθ=1 on 0°≤θ≤180°')."
    : "Send the full equation/problem (e.g. 'Solve 2x²+5x−3=0' or 'Factor 3x²−12x').";

  return {
    help_type: "homework_scaffold",
    text: `Let’s start your homework. ${scaffold} While you prepare, here’s a general approach: 1) Identify type 2) Select method 3) Execute carefully 4) Check answer. Ready—share it now.`,
    expectation: "awaiting_full_problem",
  };
}

function buildExamPrepPack() {
  return {
    help_type: "exam_pack",
    text: "Exam focus suggestion: Rotate through algebra (factor & solve), functions (parabola + exponential), trig identities/equations, and a stats summary. Which area needs sharpening first?",
    expectation: "awaiting_exam_focus",
  };
}

module.exports = {
  buildConceptPack,
  buildPracticePack,
  buildHomeworkScaffold,
  buildExamPrepPack,
};

