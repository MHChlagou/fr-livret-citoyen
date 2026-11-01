import { shuffle } from "./util.js";

/**
 * Format of the examen civique (since 1 January 2026): 40 multiple-choice questions, 45 minutes,
 * pass mark 80 % (32/40). Questions per theme follow the official breakdown; the annexes
 * (DDHC 1789, Charte des droits et devoirs) feed the "droits et devoirs" theme.
 */
export const EXAM_DURATION_SEC = 45 * 60;
export const EXAM_PASS_RATIO = 0.8;

export const EXAM_BLUEPRINT = [
  { label: "Principes et valeurs de la République", count: 11, partIds: ["p1"] },
  { label: "Système institutionnel et politique", count: 6, partIds: ["p2"] },
  { label: "Droits et devoirs", count: 11, partIds: ["p3", "annexes"] },
  { label: "Histoire, géographie et culture", count: 8, partIds: ["p4"] },
  { label: "Vivre dans la société française", count: 4, partIds: ["p5"] },
];

export const EXAM_QUESTION_COUNT = EXAM_BLUEPRINT.reduce((sum, theme) => sum + theme.count, 0);

/** Draws a fresh random exam following the blueprint, spreading picks across sections. */
export function buildExam(questions) {
  return EXAM_BLUEPRINT.flatMap((theme) => {
    const pool = questions.filter((question) => theme.partIds.includes(question.partId));
    return pickSpread(pool, theme.count).map((question) => ({ ...question, theme: theme.label }));
  });
}

/** Round-robin over sections so one long section cannot crowd out the others. */
function pickSpread(pool, count) {
  const bySection = new Map();
  for (const question of shuffle(pool)) {
    if (!bySection.has(question.sectionId)) bySection.set(question.sectionId, []);
    bySection.get(question.sectionId).push(question);
  }
  const queues = shuffle([...bySection.values()]);
  const picked = [];
  while (picked.length < count && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      if (picked.length < count && queue.length > 0) picked.push(queue.pop());
    }
  }
  return picked;
}

/** Score per theme, in blueprint order: [{ label, correct, total }]. */
export function scoreByTheme(answers) {
  return EXAM_BLUEPRINT.map((theme) => {
    const themed = answers.filter((answer) => answer.question.theme === theme.label);
    return { label: theme.label, correct: themed.filter((a) => a.isCorrect).length, total: themed.length };
  });
}

/**
 * Turns an exam result into the readiness message shown to the candidate.
 *
 * @param {number} correct  number of correct answers
 * @param {number} total    number of questions (40)
 * @param {{label: string, correct: number, total: number}[]} themes  score per theme
 * @returns {{ level: "ready" | "almost" | "not-yet", title: string, message: string }}
 *
 * The official rule is only "80 % overall". Whether to also flag a weak theme
 * (e.g. passing at 34/40 while getting 1/4 in "Vivre dans la société") is a judgment call.
 */
export function readinessVerdict(correct, total, themes) {
  // TODO(hedi): replace this default with your own readiness rule.
  const ratio = total === 0 ? 0 : correct / total;
  if (ratio >= EXAM_PASS_RATIO) {
    return { level: "ready", title: "Vous êtes prêt(e) !", message: "Vous atteignez le seuil de 80 % exigé à l'examen civique." };
  }
  return { level: "not-yet", title: "Pas encore", message: "Il faut au moins 80 % de bonnes réponses. Revoyez les thèmes les plus faibles." };
}
