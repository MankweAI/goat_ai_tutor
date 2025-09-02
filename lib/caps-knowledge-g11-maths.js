// lib/caps-knowledge-g11-maths.js
// Specialized Grade 11 Mathematics CAPS knowledge

// Grade 11 Mathematics CAPS curriculum details
const GRADE_11_MATHS_CURRICULUM = {
  subject: "Mathematics",
  grade: "11",
  topics: [
    {
      name: "Functions",
      subtopics: [
        "Quadratic functions",
        "Exponential functions",
        "Logarithmic functions",
        "Hyperbolic functions",
        "Inverse functions",
        "Average gradient",
        "Interpretation of functions",
        "Effect of parameters on functions",
      ],
      key_concepts: [
        "Domain and range",
        "Asymptotes",
        "Turning points",
        "Axis of symmetry",
        "Intervals of increase/decrease",
      ],
    },
    {
      name: "Number Patterns",
      subtopics: [
        "Number sequences",
        "Arithmetic sequences",
        "Geometric sequences",
        "Sigma notation",
        "Recursive patterns",
      ],
      key_concepts: [
        "Common difference",
        "Common ratio",
        "General term (formula)",
        "Sum of sequences",
      ],
    },
    {
      name: "Algebra",
      subtopics: [
        "Exponents",
        "Equations",
        "Inequalities",
        "Factorization",
        "Algebraic fractions",
        "Simplification",
        "Partial fractions",
      ],
      key_concepts: [
        "Exponential laws",
        "Quadratic equations",
        "Nature of roots",
        "Completing the square",
      ],
    },
    {
      name: "Trigonometry",
      subtopics: [
        "Trigonometric functions",
        "Trigonometric identities",
        "Trigonometric equations",
        "Sine rule",
        "Cosine rule",
        "Area rule",
        "2D problems",
      ],
      key_concepts: [
        "Compound angle identities",
        "Double angle identities",
        "Reduction formulas",
        "General solutions",
      ],
    },
    {
      name: "Geometry",
      subtopics: [
        "Circle geometry",
        "Analytical geometry",
        "Euclidean geometry",
        "Coordinate geometry",
      ],
      key_concepts: [
        "Distance formula",
        "Midpoint formula",
        "Gradient of a line",
        "Equation of a circle",
        "Cyclic quadrilaterals",
        "Tangent-chord theorem",
      ],
    },
    {
      name: "Statistics",
      subtopics: [
        "Measures of central tendency",
        "Measures of dispersion",
        "Five-number summary",
        "Box-and-whisker plots",
        "Ogives",
      ],
      key_concepts: [
        "Mean, median, mode",
        "Range, variance, standard deviation",
        "Quartiles",
        "Percentiles",
      ],
    },
    {
      name: "Probability",
      subtopics: [
        "Counting principles",
        "Dependent and independent events",
        "Mutually exclusive events",
        "Venn diagrams",
        "Tree diagrams",
      ],
      key_concepts: [
        "Probability scale",
        "Complement rule",
        "Addition rule",
        "Multiplication rule",
      ],
    },
  ],
  assessment: {
    formal: [
      "Term 1 Test",
      "March Control Test",
      "June Examination",
      "Term 3 Test",
      "Trial Examination",
      "November Examination",
    ],
    weightings: {
      "School-Based Assessment": "25%",
      "End-of-Year Examination": "75%",
    },
    paper_structure: {
      "Paper 1": {
        duration: "3 hours",
        marks: 150,
        content: [
          "Algebra and Equations (and inequalities)",
          "Patterns and sequences",
          "Finance, growth and decay",
          "Functions and graphs",
          "Differential Calculus",
          "Probability",
        ],
      },
      "Paper 2": {
        duration: "3 hours",
        marks: 150,
        content: [
          "Trigonometry",
          "Euclidean Geometry and measurement",
          "Analytical Geometry",
          "Statistics",
        ],
      },
    },
  },
};

// Function to get topic details
function getGrade11MathsTopicDetails(topic) {
  const normalizedTopic = topic.toLowerCase().trim();

  return GRADE_11_MATHS_CURRICULUM.topics.find(
    (t) =>
      t.name.toLowerCase() === normalizedTopic ||
      t.subtopics.some((sub) => sub.toLowerCase().includes(normalizedTopic))
  );
}

// Export the curriculum
module.exports = {
  GRADE_11_MATHS_CURRICULUM,
  getGrade11MathsTopicDetails,
};

