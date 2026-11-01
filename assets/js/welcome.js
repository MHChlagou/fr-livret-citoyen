import { getUserName, isNameAsked, setUserName, resetProgress, NAME_MAX_LENGTH } from "./store.js";

let dialog = null;
let onChange = () => {};

function buildDialog() {
  const element = document.createElement("dialog");
  element.className = "name-dialog";
  element.setAttribute("aria-labelledby", "name-dialog-title");
  element.innerHTML = `
    <form method="dialog">
      <span class="name-dialog-icon" aria-hidden="true">👋</span>
      <h2 id="name-dialog-title">Bienvenue !</h2>
      <p>Comment vous appelez-vous ? Votre prénom sert à personnaliser votre parcours.</p>
      <label class="field">
        <span>Votre prénom</span>
        <input name="name" type="text" maxlength="${NAME_MAX_LENGTH}" autocomplete="given-name" autocapitalize="words" enterkeyhint="done" placeholder="Ex. Amina">
      </label>
      <p class="privacy-note">🔒 Votre prénom et votre progression sont enregistrés <strong>uniquement sur cet appareil</strong>. Rien n'est envoyé sur internet.</p>
      <div class="btn-row">
        <button class="btn btn-primary" type="submit" value="save">C'est parti →</button>
        <button class="btn btn-ghost" type="submit" value="later" formnovalidate>Plus tard</button>
      </div>
    </form>`;
  element.addEventListener("close", () => {
    const input = element.querySelector("input[name=name]");
    if (element.returnValue === "save") setUserName(input.value);
    else if (!isNameAsked()) setUserName(null);
    onChange();
  });
  document.body.append(element);
  return element;
}

export function openNameDialog() {
  dialog ??= buildDialog();
  const input = dialog.querySelector("input[name=name]");
  input.value = getUserName() ?? "";
  dialog.returnValue = "";
  dialog.showModal();
  input.focus();
}

/** Asks for the name on the first visit only. `rerender` refreshes the page once the name is known. */
export function initWelcome(rerender) {
  onChange = rerender;
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-edit-name]")) openNameDialog();
    if (event.target.closest("[data-reset-data]")) confirmReset();
  });
  if (!isNameAsked()) openNameDialog();
}

function confirmReset() {
  const isConfirmed = window.confirm("Effacer votre prénom, votre progression et vos résultats sur cet appareil ? Cette action est définitive.");
  if (!isConfirmed) return;
  resetProgress();
  location.hash = "#/";
  onChange();
  openNameDialog();
}
