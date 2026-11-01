import { loadCourse } from "./data.js";
import { escapeHtml } from "./util.js";
import { renderHome } from "./views/home.js";
import { renderSection } from "./views/section.js";
import { renderSectionQuiz } from "./views/section-quiz.js";
import { renderExam } from "./views/exam.js";
import { renderMemo } from "./views/memo.js";
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
];

let leaveHandlers = [];

function runLeaveHandlers() {
  leaveHandlers.forEach((handler) => handler());
  leaveHandlers = [];
}

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
  runLeaveHandlers();
  const path = decodeURIComponent(location.hash.replace(/^#/, "")) || "/";
  const match = ROUTES.map((r) => ({ r, m: path.match(r.pattern) })).find(({ m }) => m);
  if (!match) {
    location.replace("#/");
    return;
  }
  setActiveNav(match.r.nav);
  main.innerHTML = `<div class="loading">Chargement…</div>`;
  try {
    const course = await loadCourse();
    const ctx = { course, onLeave: (handler) => leaveHandlers.push(handler) };
    match.r.view(main, ctx, ...match.m.slice(1));
    window.scrollTo({ top: 0, behavior: "instant" });
    main.focus({ preventScroll: true });
  } catch (error) {
    renderError(error);
  }
}

function setupTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (error) {
    console.warn("Préférence de thème indisponible.", error);
  }
  if (saved) document.documentElement.dataset.theme = saved;
  document.querySelector(".theme-toggle").addEventListener("click", () => {
    const isDark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
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
