const STORAGE_KEY = "livret-citoyen-progress-v1";
export const PASS_RATIO = 0.8;

function emptyProgress() {
  return { sections: {}, memo: {}, exams: [] };
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    return { ...emptyProgress(), ...parsed };
  } catch (error) {
    console.warn("Progression illisible, nouvelle progression utilisée.", error);
    return emptyProgress();
  }
}

let progress = readStorage();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.warn("Impossible d'enregistrer la progression (stockage indisponible).", error);
  }
}

function sectionEntry(sectionId) {
  progress.sections[sectionId] ??= { read: false, best: null, attempts: 0 };
  return progress.sections[sectionId];
}

export function getSection(sectionId) {
  return progress.sections[sectionId] ?? { read: false, best: null, attempts: 0 };
}

/** "todo" | "read" | "passed" */
export function sectionState(sectionId) {
  const entry = getSection(sectionId);
  if (entry.best !== null && entry.best >= PASS_RATIO) return "passed";
  if (entry.read || entry.attempts > 0) return "read";
  return "todo";
}

export function markRead(sectionId) {
  sectionEntry(sectionId).read = true;
  save();
}

export function recordQuiz(sectionId, ratio) {
  const entry = sectionEntry(sectionId);
  entry.attempts += 1;
  entry.best = entry.best === null ? ratio : Math.max(entry.best, ratio);
  save();
}

export function isFactKnown(key) {
  return Boolean(progress.memo[key]);
}

export function setFactKnown(key, isKnown) {
  if (isKnown) progress.memo[key] = true;
  else delete progress.memo[key];
  save();
}

export function recordExam(correct, total) {
  progress.exams.unshift({ at: new Date().toISOString(), correct, total });
  progress.exams = progress.exams.slice(0, 10);
  save();
}

export function getExams() {
  return progress.exams;
}

export function resetProgress() {
  progress = emptyProgress();
  save();
}
