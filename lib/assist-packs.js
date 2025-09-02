// lib/assist-packs.js
// Assistance Pack Generators with difficulty progression + unique IDs.

// Difficulty order
const DIFFICULTY_SEQUENCE = ["easy", "medium", "hard", "challenge"];

function nextDifficulty(current) {
  const idx = DIFFICULTY_SEQUENCE.indexOf(current);
  if (idx === -1) return "medium";
  return DIFFICULTY_SEQUENCE[Math.min(idx + 1, DIFFICULTY_SEQUENCE.length - 1)];
}

// Practice question bank (expand freely later)
const PRACTICE_BANK = {
  algebra: {
    easy: [
      { id: "alg-e-1", q: "Solve: 2x + 5 = 17" },
      { id: "alg-e-2", q: "Factor: x² - 9" },
      { id: "alg-e-3", q: "Simplify: 3(x + 2)" },
    ],
    medium: [
      { id: "alg-m-1", q: "Factor completely: x² - 7x + 12" },
      { id: "alg-m-2", q: "Solve: 3x - 4 = 2x + 7" },
      { id: "alg-m-3", q: "Simplify: (2x² * 3x) ÷ x" },
    ],
    hard: [
      { id: "alg-h-1", q: "Solve: 2x² - 5x - 3 = 0" },
      { id: "alg-h-2", q: "Factor: 3x² - 12x + 12" },
      { id: "alg-h-3", q: "Simplify: (x³y²)/(xy)" },
    ],
    challenge: [
      { id: "alg-c-1", q: "Solve simultaneously: y = 2x + 1 and x² + y² = 25" },
      { id: "alg-c-2", q: "Solve inequality: 2(x - 3) ≤ x + 5" },
    ],
  },
  functions: {
    easy: [
      { id: "fun-e-1", q: "Given f(x)=x²-4x+3, find f(2)" },
      { id: "fun-e-2", q: "State the y-intercept of f(x)=x²-5x+6" },
    ],
    medium: [
      { id: "fun-m-1", q: "Find axis of symmetry of f(x)=2x²-8x+5" },
      { id: "fun-m-2", q: "Find the roots of f(x)=x²-5x+6" },
    ],
    hard: [
      { id: "fun-h-1", q: "Vertex of f(x)=x²-6x+11" },
      { id: "fun-h-2", q: "Solve f(x)=0 for f(x)=2x² - x - 3" },
    ],
    challenge: [
      { id: "fun-c-1", q: "Given f(x)=x²-4 and g(x)=2x+1, solve f(g(x))=0" },
    ],
  },
  trigonometry: {
    easy: [
      { id: "trig-e-1", q: "Simplify: sin²θ + cos²θ" },
      { id: "trig-e-2", q: "Given sinθ=3/5 (acute), find cosθ" },
    ],
    medium: [
      { id: "trig-m-1", q: "If tanθ=3/4 (acute), find sinθ & cosθ" },
      { id: "trig-m-2", q: "Solve: sinθ=1/2 for 0°≤θ≤180°" },
    ],
    hard: [
      { id: "trig-h-1", q: "Solve: 2sinθ=1 for 0°≤θ≤360°" },
      { id: "trig-h-2", q: "Prove: (1 - cosθ)(1 + cosθ)=sin²θ" },
    ],
    challenge: [{ id: "trig-c-1", q: "Solve: 2sinθ + √3 = 0 for 0°≤θ≤360°" }],
  },
  statistics: {
    easy: [
      { id: "stat-e-1", q: "Dataset: 3,4,5. Mean?" },
      { id: "stat-e-2", q: "Dataset: 2,2,5,7. Median?" },
    ],
    medium: [
      { id: "stat-m-1", q: "Dataset: 4,4,6,9,10. Find mean & median." },
      { id: "stat-m-2", q: "Dataset: 5,7,7,8,9. Range?" },
    ],
    hard: [
      { id: "stat-h-1", q: "Dataset: 2,5,5,8,9,11. Mean & range?" },
      { id: "stat-h-2", q: "Explain skew if data: 2,2,3,20" },
    ],
    challenge: [
      {
        id: "stat-c-1",
        q: "Estimate effect on mean if largest value doubles (qualitative).",
      },
    ],
  },
  geometry: {
    easy: [
      { id: "geo-e-1", q: "Midpoint of (0,2) & (4,6)?" },
      { id: "geo-e-2", q: "Distance between (1,1) & (4,5)?" },
    ],
    medium: [
      { id: "geo-m-1", q: "Gradient of line through (2,3) & (6,11)?" },
      { id: "geo-m-2", q: "Equation of line with m=2 through (1,3)?" },
    ],
    hard: [
      {
        id: "geo-h-1",
        q: "Is line through (1,2),(3,6) parallel to line through (2,1),(4,5)?",
      },
      {
        id: "geo-h-2",
        q: "Show triangle with points (0,0),(4,0),(4,3) is right-angled.",
      },
    ],
    challenge: [
      {
        id: "geo-c-1",
        q: "Circle through (0,0),(2,0),(0,2): find its equation.",
      },
    ],
  },
};

// Normalize a topic label to our keys
function normalizeTopic(t = "") {
  const m = t.toLowerCase();
  if (m.includes("algebra")) return "algebra";
  if (m.includes("function")) return "functions";
  if (m.includes("trig")) return "trigonometry";
  if (m.includes("stat")) return "statistics";
  if (m.includes("geo")) return "geometry";
  return "algebra"; // default
}

// Build a practice pack with progression
function buildPracticePack(
  topicRaw = "algebra",
  difficulty = "easy",
  usedIds = []
) {
  const topic = normalizeTopic(topicRaw);
  const bank = PRACTICE_BANK[topic] || PRACTICE_BANK.algebra;
  const bucket = bank[difficulty] || bank.easy;

  // Filter out used question IDs
  const fresh = bucket.filter((q) => !usedIds.includes(q.id));

  // If no fresh left at this difficulty -> escalate difficulty automatically (unless at max)
  let chosenDifficulty = difficulty;
  let chosenList = fresh;
  if (fresh.length === 0) {
    const next = nextDifficulty(difficulty);
    if (next !== difficulty) {
      const nextBucket = bank[next] || [];
      const nextFresh = nextBucket.filter((q) => !usedIds.includes(q.id));
      if (nextFresh.length) {
        chosenDifficulty = next;
        chosenList = nextFresh;
      }
    }
  }

  // Pick up to 2 questions (increase to 3 if difficulty hard/challenge)
  const maxCount = ["hard", "challenge"].includes(chosenDifficulty) ? 3 : 2;
  const selected = chosenList.slice(0, maxCount);

  const textLines = selected.map((q, i) => `${i + 1}) ${q.q}`);
  const header = `Practice (${capitalize(topic)} – ${chosenDifficulty})`;
  const footer =
    "Reply with answers or say 'more'. To change topic, just type e.g. 'stats' or 'geometry'.";
  const text = `${header}:\n${textLines.join("\n")}\n${footer}`;

  const ids = selected.map((q) => q.id);

  return {
    help_type: "practice_pack",
    topic,
    difficulty: chosenDifficulty,
    questions: selected,
    question_ids: ids,
    text,
    expectation: "awaiting_answers",
  };
}

// Concept packs (unchanged except topic normalization)
function buildConceptPack(topicRaw = "statistics") {
  const topic = normalizeTopic(topicRaw);
  if (topic === "statistics") {
    return {
      help_type: "concept_pack",
      topic,
      text: "Statistics recap: *Mean* = sum ÷ count, *Median* = middle when ordered, *Range* = max−min. Example: 4,6,6,9 → mean 6.25, median 6. Want a dataset or standard deviation next?",
      expectation: "awaiting_dataset_or_choice",
    };
  }
  if (topic === "functions") {
    return {
      help_type: "concept_pack",
      topic,
      text: "Functions: Quadratic f(x)=ax²+bx+c forms a parabola. Vertex via -b/(2a). Example: f(x)=x²−4x+3 → vertex (2, -1). Need factorization, vertex method, or domain/range?",
      expectation: "awaiting_choice",
    };
  }
  if (topic === "trigonometry") {
    return {
      help_type: "concept_pack",
      topic,
      text: "Trig basics: sin²θ+cos²θ=1; tanθ=sinθ/cosθ. If sinθ=3/5 (acute), cosθ=4/5. Focus on identities, solving equations, or ratios?",
      expectation: "awaiting_choice",
    };
  }
  if (topic === "algebra") {
    return {
      help_type: "concept_pack",
      topic,
      text: "Algebra core: Factor patterns a²−b²=(a+b)(a−b), trinomials, exponent laws. Example: x²−9=(x−3)(x+3). Want factoring practice or solving equations?",
      expectation: "awaiting_choice",
    };
  }
  if (topic === "geometry") {
    return {
      help_type: "concept_pack",
      topic,
      text: "Analytical geometry: distance, midpoint, gradient, equation of line. Example: midpoint of (0,2) & (4,6) is (2,4). Which concept do you want to drill?",
      expectation: "awaiting_choice",
    };
  }
  return {
    help_type: "concept_pack",
    topic,
    text: "Name the exact concept (e.g. 'standard deviation', 'vertex', 'sine rule') and I’ll explain.",
    expectation: "awaiting_topic_detail",
  };
}

function buildHomeworkScaffold(rawMessage, topicRaw = "algebra") {
  const topic = normalizeTopic(topicRaw);
  const scaffold =
    topic === "statistics"
      ? "Send your dataset (comma separated) or the exact stats question. I’ll compute & explain."
      : topic === "functions"
      ? "Send the function and what you need (intercepts, vertex, domain, transformation)."
      : topic === "trigonometry"
      ? "Send the trig equation / identity task (e.g. solve 2sinθ=1 on 0°≤θ≤180°)."
      : topic === "geometry"
      ? "Send coordinate points or the geometry statement you must prove."
      : "Send the full equation/problem (e.g. 2x²+5x−3=0 or factor 3x²−12x).";
  return {
    help_type: "homework_scaffold",
    topic,
    text: `Let’s start homework. ${scaffold} While you prepare: 1) Identify type 2) Pick method 3) Work carefully 4) Check. Share it now.`,
    expectation: "awaiting_full_problem",
  };
}

function buildExamPrepPack(topicRaw = "algebra") {
  const topic = normalizeTopic(topicRaw);
  return {
    help_type: "exam_pack",
    topic,
    text: "Exam focus plan: rotate Algebra (factor & solve), Functions (graphs), Trig (identities & equations), Stats (summary), Geometry (analytic basics). Which area first?",
    expectation: "awaiting_exam_focus",
  };
}

// Utility
function capitalize(str = "") {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  buildPracticePack,
  buildConceptPack,
  buildHomeworkScaffold,
  buildExamPrepPack,
  nextDifficulty,
  normalizeTopic,
  DIFFICULTY_SEQUENCE,
};
