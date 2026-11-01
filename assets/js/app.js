import { loadCourse } from "./data.js";
import { escapeHtml } from "./util.js";
import { renderHome } from "./views/home.js";
import { renderSection } from "./views/section.js";
import { renderSectionQuiz } from "./views/section-quiz.js";
import { renderExam } from "./views/exam.js";
import { renderMemo } from "./views/memo.js";
import { renderMistakes } from "./views/mistakes.js";
import { renderInterview } from "./views/interview.js";
import { initInstall } from "./install.js";
import { initWelcome } from "./welcome.js";

const main = document.getElementById("main");
const THEME_KEY = "livret-citoyen-theme";

const ROUTES = [
  { pattern: /^\/?$/, nav: "home", view: renderHome },
  { pattern: /^\/section\/([\w-]+)$/, nav: "home", view: renderSection },
  { pattern: /^\/quiz\/([\w-]+)$/, nav: "home", view: renderSectionQuiz },
  { pattern: /^\/exam$/, nav: "exam", view: renderExam },
  { pattern: /^\/memo$/, nav: "memo", view: renderMemo },
  { pattern: /^\/erreurs$/, nav: "home", view: renderMistakes },
  { pattern: /^\/entretien$/, nav: "home", view: renderInterview },
];

let leaveHandlers = [];
/** When set, returns a confirmation message to show before leaving the current view, or null. */
let leaveGuard = null;
let currentPath = null;
let isRestoringHash = false;

function runLeaveHandlers() {
  leaveHandlers.forEach((handler) => handler());
  leaveHandlers = [];
}

function readPath() {
  try {
    return decodeURIComponent(location.hash.replace(/^#/, "")) || "/";
  } catch (error) {
    console.warn("Adresse illisible, retour à l'accueil.", error);
    return "/";
  }
}

/** Returns true when the user chose to stay on the current view. */
function isLeaveCancelled(nextPath) {
  if (!leaveGuard || nextPath === currentPath) return false;
  const message = leaveGuard();
  if (!message || window.confirm(message)) return false;
  isRestoringHash = true;
  location.hash = `#${currentPath}`;
  return true;
}

window.addEventListener("beforeunload", (event) => {
  if (leaveGuard && leaveGuard()) {
    event.preventDefault();
    event.returnValue = "";
  }
});

function setActiveNav(nav) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === nav) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function renderError(error) {
  console.error(error);
  main.innerHTML = `
    <div class="card error-box view">
      <h1>Impossible de charger le contenu</h1>
      <p>${escapeHtml(error.message)}</p>
      <p>Si vous ouvrez le fichier directement depuis votre disque, lancez plutôt un petit serveur local (par exemple <code>python3 -m http.server</code>).</p>
    </div>`;
}

async function route() {
  if (isRestoringHash) {
    isRestoringHash = false;
    return;
  }
  const path = readPath();
  if (isLeaveCancelled(path)) return;
  leaveGuard = null;
  runLeaveHandlers();
  const match = ROUTES.map((r) => ({ r, m: path.match(r.pattern) })).find(({ m }) => m);
  if (!match) {
    location.replace("#/");
    return;
  }
  currentPath = path;
  setActiveNav(match.r.nav);
  main.innerHTML = `<div class="loading">Chargement…</div>`;
  try {
    const course = await loadCourse();
    const ctx = {
      course,
      onLeave: (handler) => leaveHandlers.push(handler),
      guardLeave: (guard) => { leaveGuard = guard; },
    };
    match.r.view(main, ctx, ...match.m.slice(1));
    window.scrollTo({ top: 0, behavior: "instant" });
    main.focus({ preventScroll: true });
  } catch (error) {
    renderError(error);
  }
}

const THEME_COLORS = { light: "#f6f3ec", dark: "#11132a" };

function isDarkTheme() {
  return document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => { meta.content = THEME_COLORS[theme]; });
  document.querySelector(".theme-toggle").setAttribute("aria-pressed", String(theme === "dark"));
}

function setupTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (error) {
    console.warn("Préférence de thème indisponible.", error);
  }
  const toggle = document.querySelector(".theme-toggle");
  toggle.setAttribute("aria-label", "Activer le thème sombre");
  if (saved === "light" || saved === "dark") applyTheme(saved);
  else toggle.setAttribute("aria-pressed", String(isDarkTheme()));
  toggle.addEventListener("click", () => {
    const next = isDarkTheme() ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (error) {
      console.warn("Préférence de thème non enregistrée.", error);
    }
  });
}

setupTheme();
initInstall();
window.addEventListener("hashchange", route);
route();
initWelcome(route);
