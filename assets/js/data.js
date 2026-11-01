const PART_FILES = ["p1", "p2", "p3", "p4", "p5", "annexes"];

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

export async function loadCourse() {
  if (cache) return cache;
  const parts = await Promise.all(PART_FILES.map(fetchPart));
  const sections = parts.flatMap((part) => part.sections.map((section) => ({ ...section, part })));
  cache = { parts, sections, questions: indexQuestions(parts) };
  return cache;
}

export function findSection(course, sectionId) {
  return course.sections.find((section) => section.id === sectionId) ?? null;
}

export function nextSection(course, sectionId) {
  const index = course.sections.findIndex((section) => section.id === sectionId);
  return index >= 0 ? course.sections[index + 1] ?? null : null;
}
