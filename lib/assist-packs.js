// lib/assist-packs.js
// LEGACY HELPERS (STATIC PACK GENERATORS REMOVED)
// This file previously contained static content generators (buildPracticePack,
// buildConceptPack, buildHomeworkScaffold, buildExamPrepPack).
// NOW: Only keep small utilities still referenced by webhook.
// Once you migrate difficulty logic + topic normalization into AI layer,
// you can DELETE this file entirely.

// --- Topic Normalizer (minimal) ---
function normalizeTopic(raw = "") {
  const t = raw.toLowerCase();
  if (/trig/.test(t)) return "trigonometry";
  if (/function|parabola|graph/.test(t)) return "functions";
  if (/pattern|sequence|series/.test(t)) return "patterns";
  if (/algebra|factor|equation|quadratic|polynomial/.test(t)) return "algebra";
  if (/stat|data/.test(t)) return "statistics";
  if (/prob/.test(t)) return "probability";
  if (/geometry|midpoint|gradient|distance|coordinate|circle/.test(t))
    return "geometry";
  if (/finance/.test(t)) return "finance";
  if (/calculus|deriv/.test(t)) return "calculus";
  return raw.toLowerCase() || "algebra";
}

// --- Difficulty helpers ---
function initialDifficultyForGrade(grade) {
  if (!grade) return "easy";
  const g = parseInt(grade, 10);
  if (g >= 11) return "medium";
  return "easy";
}

function gradeAwareNextDifficulty(grade, current = "easy") {
  const order = ["easy", "medium", "hard", "challenge"];
  const idx = order.indexOf(current);
  if (idx === -1) return initialDifficultyForGrade(grade);
  if (idx === order.length - 1) return current;
  return order[idx + 1];
}

module.exports = {
  normalizeTopic,
  initialDifficultyForGrade,
  gradeAwareNextDifficulty,
};
