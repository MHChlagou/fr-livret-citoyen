import { shuffle } from "./util.js";

/**
 * Format of the examen civique (arrêté du 10 octobre 2025, in force since 1 January 2026):
 * 40 multiple-choice questions, 45 minutes, pass mark 80 % (32/40). The split per theme
 * follows the official breakdown as we understand it (11 / 6 / 11 / 8 / 4). The annexes
 * (DDHC 1789, Charte des droits et devoirs) feed the "droits et devoirs" theme, capped at
 * 3 questions so that article trivia does not crowd out the rights-and-duties chapter.
 */
export const EXAM_DURATION_SEC = 45 * 60;
export const EXAM_PASS_RATIO = 0.8;
const WEAK_THEME_RATIO = 0.5;
const ALMOST_RATIO = 0.7;

const EXAM_DRAWS = [
  { label: "Principes et valeurs de la République", count: 11, partIds: ["p1"] },
  { label: "Système institutionnel et politique", count: 6, partIds: ["p2"] },
  { label: "Droits et devoirs", count: 8, partIds: ["p3"] },
  { label: "Droits et devoirs", count: 3, partIds: ["annexes"] },
  { label: "Histoire, géographie et culture", count: 8, partIds: ["p4"] },
  { label: "Vivre dans la société française", count: 4, partIds: ["p5"] },
];

/** One entry per theme label, in order, with the total question count. */
export const EXAM_BLUEPRINT = EXAM_DRAWS.reduce((themes, draw) => {
  const theme = themes.find((t) => t.label === draw.label);
  if (theme) theme.count += draw.count;
  else themes.push({ label: draw.label, count: draw.count });
  return themes;
}, []);

export const EXAM_QUESTION_COUNT = EXAM_BLUEPRINT.reduce((sum, theme) => sum + theme.count, 0);

/** How many of the exam's questions come from a given part (0 when the part is not drawn). */
export function examQuestionsForPart(partId) {
  return EXAM_DRAWS.filter((draw) => draw.partIds.includes(partId)).reduce((sum, draw) => sum + draw.count, 0);
}

/** Draws a fresh random exam following the blueprint, spreading picks across sections. */
export function buildExam(questions) {
  return EXAM_DRAWS.flatMap((draw) => {
    const pool = questions.filter((question) => draw.partIds.includes(question.partId));
    return pickSpread(pool, draw.count).map((question) => ({ ...question, theme: draw.label }));
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
 * The official rule is only "80 % overall". This practice site is stricter: a pass with one
 * theme under 50 % is "almost", because the real exam draws different questions each time.
 */
export function readinessVerdict(correct, total, themes) {
  const ratio = total === 0 ? 0 : correct / total;
  const weakThemes = themes.filter((t) => t.total > 0 && t.correct / t.total < WEAK_THEME_RATIO).map((t) => t.label);
  const weakList = weakThemes.length >= themes.length - 1 ? "tous les thèmes" : weakThemes.join(", ");
  if (ratio >= EXAM_PASS_RATIO && weakThemes.length === 0) {
    return { level: "ready", title: "Vous êtes prêt(e) !", message: "Vous atteignez le seuil de 80 % exigé à l'examen civique, sans thème faible." };
  }
  if (ratio >= EXAM_PASS_RATIO) {
    return { level: "almost", title: "Presque prêt(e)", message: `Vous dépassez 80 %, mais un thème reste fragile (${weakList}). Révisez-le : les questions changent à chaque examen.` };
  }
  if (ratio >= ALMOST_RATIO) {
    return { level: "almost", title: "Presque", message: `Encore un effort pour atteindre 80 %.${weakList ? ` Priorité : ${weakList}.` : ""}` };
  }
  return { level: "not-yet", title: "Pas encore", message: `Il faut au moins 80 % de bonnes réponses. Reprenez les leçons${weakList ? `, en commençant par : ${weakList}` : ""}.` };
}
