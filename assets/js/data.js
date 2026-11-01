const PART_FILES = ["p1", "p2", "p3", "p4", "p5", "annexes", "entretien"];

let cache = null;

async function fetchPart(name) {
  const response = await fetch(`data/${name}.json`, { cache: "no-cache" });
  if (!response.ok) throw new Error(`data/${name}.json : HTTP ${response.status}`);
  return response.json();
}

/** Flattens every quiz question with its part and section, so the exam can draw from one pool. */
function indexQuestions(parts) {
  const questions = [];
  for (const part of parts) {
    for (const section of part.sections) {
      section.quiz.forEach((question, index) => {
        questions.push({ ...question, id: `${section.id}-${index}`, partId: part.id, sectionId: section.id });
      });
    }
  }
  return questions;
}

/**
 * Interview drill cards (question, what the agent looks for, points, example answer) are the single
 * source for both the simulation and the lessons of the section that declares a `practice` link
 * without lessons of its own: one lesson per theme, built here.
 */
function expandDrills(part) {
  const section = part.sections.find((s) => s.lessons.length === 0 && s.practice);
  if (!part.drills || !section) return;
  const themes = [...new Set(part.drills.map((drill) => drill.theme))];
  section.lessons = themes.map((theme) => ({
    title: theme,
    blocks: part.drills.filter((drill) => drill.theme === theme).flatMap((drill) => [
      { type: "h", text: drill.q },
      { type: "p", text: `**Ce que l'agent cherche :** ${drill.why}` },
      { type: "list", items: drill.points },
      { type: "quote", text: drill.example, source: "Exemple de réponse, à adapter à votre situation" },
    ]),
  }));
}

export async function loadCourse() {
  if (cache) return cache;
  const parts = await Promise.all(PART_FILES.map(fetchPart));
  parts.forEach(expandDrills);
  const sections = parts.flatMap((part) => part.sections.map((section) => ({ ...section, part })));
  const drills = parts.flatMap((part) => part.drills ?? []).map((drill, index) => ({ ...drill, id: `drill-${index}` }));
  cache = { parts, sections, questions: indexQuestions(parts), drills };
  return cache;
}

export function findSection(course, sectionId) {
  return course.sections.find((section) => section.id === sectionId) ?? null;
}

export function nextSection(course, sectionId) {
  const index = course.sections.findIndex((section) => section.id === sectionId);
  return index >= 0 ? course.sections[index + 1] ?? null : null;
}
