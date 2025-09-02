// lib/topic-classifier.js
// Lightweight keyword classifier for Grade 11 Mathematics (CAPS)

const TOPIC_KEYWORDS = [
  {
    topic: "algebra",
    words: [
      "algebra",
      "factor",
      "factoris",
      "factoring",
      "equation",
      "inequal",
      "exponent",
      "surd",
      "linear programming",
      "algebraic fraction",
    ],
  },
  {
    topic: "functions",
    words: [
      "function",
      "parabola",
      "quadratic",
      "hyperbolic",
      "log",
      "exponential",
      "inverse",
      "average gradient",
      "domain",
      "range",
    ],
  },
  {
    topic: "trigonometry",
    words: [
      "trig",
      "sine rule",
      "cosine rule",
      "identity",
      "sin(",
      "cos(",
      "tan(",
      "trig",
    ],
  },
  {
    topic: "geometry",
    words: [
      "geometry",
      "euclidean",
      "analytical",
      "distance",
      "midpoint",
      "gradient",
      "equation of line",
      "parallel",
      "perpendicular",
      "circle",
    ],
  },
  {
    topic: "statistics",
    words: [
      "stat",
      "mean",
      "median",
      "mode",
      "quartile",
      "quartiles",
      "percentile",
      "standard deviation",
      "box",
      "ogive",
    ],
  },
  {
    topic: "probability",
    words: [
      "probab",
      "venn",
      "tree diagram",
      "outcome",
      "mutually exclusive",
      "independent",
      "dependent",
      "complement",
    ],
  },
  {
    topic: "number_patterns",
    words: ["pattern", "sequence", "sequences", "series", "sigma", "recursive"],
  },
];

const SUBTOPIC_MAP = {
  algebra: [
    "exponents",
    "surds",
    "equations",
    "inequalities",
    "factoring",
    "factorization",
    "quadratic",
    "linear programming",
    "algebraic fractions",
  ],
  functions: [
    "quadratic",
    "exponential",
    "logarithmic",
    "hyperbolic",
    "inverse",
    "average gradient",
    "domain",
    "range",
  ],
  trigonometry: [
    "identities",
    "equations",
    "sine rule",
    "cosine rule",
    "area rule",
    "2d problems",
    "trig identities",
  ],
  geometry: [
    "analytical geometry",
    "analytical",
    "euclidean",
    "distance",
    "midpoint",
    "gradient",
    "equation of line",
    "circle geometry",
  ],
  statistics: [
    "mean",
    "median",
    "mode",
    "quartiles",
    "quartile",
    "standard deviation",
    "box plot",
    "box-and-whisker",
    "ogive",
  ],
  probability: [
    "counting principles",
    "dependent events",
    "independent events",
    "mutually exclusive",
    "venn",
    "tree diagram",
    "complement rule",
  ],
  number_patterns: [
    "sequence",
    "sequences",
    "series",
    "sigma",
    "recursive",
    "number pattern",
  ],
};

function classify(message) {
  const m = message.toLowerCase();
  let topic = null;
  for (const t of TOPIC_KEYWORDS) {
    if (t.words.some((w) => m.includes(w))) {
      topic = t.topic;
      break;
    }
  }
  let subtopic = null;
  if (topic && SUBTOPIC_MAP[topic]) {
    subtopic = SUBTOPIC_MAP[topic].find((st) => m.includes(st.split(" ")[0]));
  }
  return { topic, subtopic };
}

function normalizeSubtopic(topic, raw) {
  if (!topic || !raw) return raw;
  const list = SUBTOPIC_MAP[topic] || [];
  const r = raw.toLowerCase();
  return list.find((st) => st === r || r.startsWith(st.split(" ")[0])) || raw;
}

module.exports = {
  classify,
  normalizeSubtopic,
  SUBTOPIC_MAP,
};
