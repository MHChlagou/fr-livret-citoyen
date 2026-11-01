let deferredPrompt = null;
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIos() {
  const isAppleTouch = /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isAppleTouch;
}

/** "installed" | "prompt" (Android/desktop Chrome) | "ios" (manual steps) | "unavailable" */
function installMode() {
  if (isStandalone()) return "installed";
  if (deferredPrompt) return "prompt";
  if (isIos()) return "ios";
  return "unavailable";
}

export function initInstall() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.warn("Service worker non enregistré : le mode hors ligne est indisponible.", error);
    });
    watchForUpdates();
  }
}

/** A new service worker taking control means a new deploy: the open page still runs the old code until reloaded. */
function watchForUpdates() {
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController) showUpdateToast();
    hadController = true;
  });
}

function showUpdateToast() {
  const toast = document.querySelector("[data-update-toast]");
  if (!toast) return;
  toast.hidden = false;
  toast.querySelector("[data-reload]").addEventListener("click", () => location.reload(), { once: true });
}

function cardMarkup(mode) {
  if (mode === "prompt") {
    return `
      <div class="card install-card view">
        <img src="assets/icons/icon-192.png" alt="" width="56" height="56">
        <div>
          <strong>Installez l'application</strong>
          <p>Révisez depuis l'écran d'accueil de votre téléphone, même sans connexion.</p>
        </div>
        <button class="btn btn-primary" type="button" data-install>Installer</button>
      </div>`;
  }
  if (mode === "ios") {
    return `
      <div class="card install-card view">
        <img src="assets/icons/icon-192.png" alt="" width="56" height="56">
        <div>
          <strong>Installez l'application sur votre iPhone</strong>
          <p>Dans Safari, touchez <svg class="ios-share" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M7 10H5v11h14V10h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> <b>Partager</b>, puis <b>Sur l'écran d'accueil</b>.</p>
        </div>
      </div>`;
  }
  return "";
}

/** Renders the install card into `slot` and keeps it in sync until `onLeave` runs. */
export function mountInstallCard(slot, onLeave) {
  function render() {
    slot.innerHTML = cardMarkup(installMode());
    slot.querySelector("[data-install]")?.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      const promptEvent = deferredPrompt;
      deferredPrompt = null;
      await promptEvent.prompt();
      await promptEvent.userChoice;
      notify();
    });
  }
  listeners.add(render);
  onLeave(() => listeners.delete(render));
  render();
}
