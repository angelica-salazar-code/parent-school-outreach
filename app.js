import { verifiedFlyerUrl } from "./config.js";
import { copyFormattedMessage, copyText, createEmail, createMailto, localizeFlyerUrl, mailtoLimit, messageParts, validateAnswers, validateFlyerUrl } from "./email.js";
import { languages, pack, resolveLanguage, t } from "./i18n.js";

const get = (id) => document.getElementById(id);
const form = get("school-form");
const subject = get("subject");
const message = get("message");
const emailLink = get("open-email");
const dialog = get("replace-dialog");
const siteLanguageSelect = get("site-language");
const emailLanguageSelect = get("email-language");

let generatedDraft = null;
let pendingAnswers = null;
let baseFlyerUrl = "";
let siteLanguage = resolveLanguage(new URLSearchParams(location.search).get("lang"), navigator.languages ?? [navigator.language]);
let emailLanguage = siteLanguage;

function flyerUrlForEmail() {
  return baseFlyerUrl ? localizeFlyerUrl(baseFlyerUrl, emailLanguage) : "";
}

function fillLanguageSelect(select, selected) {
  select.replaceChildren(...languages.map((language) => {
    const option = document.createElement("option");
    option.value = language.code;
    option.textContent = language.label;
    option.lang = language.htmlLang;
    option.selected = language.code === selected;
    return option;
  }));
}

function applyTranslations() {
  const entry = languages.find((language) => language.code === siteLanguage);
  document.documentElement.lang = entry.htmlLang;
  for (const node of document.querySelectorAll("[data-i18n]")) {
    node.textContent = t(siteLanguage, node.dataset.i18n);
  }
  // Values come from this site's own translation file and are inserted as text.
  for (const node of document.querySelectorAll("[data-i18n-attr]")) {
    for (const pair of node.dataset.i18nAttr.split("|")) {
      const [attribute, key] = pair.split(":");
      node.setAttribute(attribute, t(siteLanguage, key));
    }
  }
  if (generatedDraft) get("generate-label").textContent = t(siteLanguage, "button.update");
}

function answers() {
  return {
    school: get("school").value,
    grade: get("grade").value,
    selectedInterests: [...form.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value),
  };
}

function currentDraft() {
  return { subject: subject.value, body: message.value };
}

function renderMessagePreview() {
  const nodes = messageParts(message.value, flyerUrlForEmail(), emailLanguage).map((part) => {
    if (!part.href) return document.createTextNode(part.text);
    const link = document.createElement("a");
    link.href = part.href;
    link.textContent = part.text;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `${part.text} ${t(siteLanguage, "send.newTab")}`);
    return link;
  });
  get("message-preview").replaceChildren(...nodes);
}

function focusMessage() {
  get("message-edit").open = true;
  message.focus();
}

function refreshEmailLink() {
  const result = createMailto(currentDraft(), mailtoLimit, siteLanguage);
  if (result.url) {
    emailLink.href = result.url;
    emailLink.removeAttribute("aria-disabled");
  } else {
    emailLink.removeAttribute("href");
    emailLink.setAttribute("aria-disabled", "true");
  }
  // Keep the fallback discoverable by keyboard even without a mailto destination.
  emailLink.setAttribute("tabindex", "0");
  get("draft-status").textContent = result.message;
  return result;
}

function showDraft(values) {
  generatedDraft = createEmail(values, flyerUrlForEmail(), emailLanguage);
  subject.value = generatedDraft.subject;
  message.value = generatedDraft.body;
  const entry = languages.find((language) => language.code === emailLanguage);
  for (const field of [subject, message]) field.lang = entry.htmlLang;
  get("message-preview").lang = entry.htmlLang;
  renderMessagePreview();
  get("draft-empty").hidden = true;
  get("draft-editor").hidden = false;
  get("generate-label").textContent = t(siteLanguage, "button.update");
  refreshEmailLink();
  get("draft-title").focus();
}

function validateForm(values) {
  const errors = validateAnswers(values, siteLanguage);
  for (const key of ["school", "grade", "interests"]) {
    const field = get(key);
    const error = get(`${key}-error`);
    error.textContent = errors[key] || "";
    error.hidden = !errors[key];
    field.setAttribute("aria-invalid", errors[key] ? "true" : "false");
  }
  if (errors.school) get("school").focus();
  else if (errors.grade) get("grade").focus();
  else if (errors.interests) form.querySelector('input[type="checkbox"]').focus();
  return Object.keys(errors).length === 0;
}

function applyFlyerConfiguration() {
  const localized = flyerUrlForEmail();
  if (!baseFlyerUrl) return;
  get("flyer-link-status").textContent = pack(siteLanguage).status.flyerReady;
  get("email-flyer-hint").textContent = pack(siteLanguage).status.flyerHintReady;
  get("view-email-flyer").href = localized;
  get("view-larger").href = localizeFlyerUrl(baseFlyerUrl, siteLanguage);
}

function setSiteLanguage(next, { followEmail = true } = {}) {
  siteLanguage = next;
  if (followEmail) {
    emailLanguage = next;
    fillLanguageSelect(emailLanguageSelect, emailLanguage);
  }
  const url = new URL(location.href);
  url.searchParams.set("lang", siteLanguage);
  // Language lives in the address only, so nothing about the parent is stored.
  history.replaceState(null, "", url);
  applyTranslations();
  applyFlyerConfiguration();
  get("view-email-flyer").href = flyerUrlForEmail();
  if (generatedDraft) {
    const values = answers();
    const edited = subject.value !== generatedDraft.subject || message.value !== generatedDraft.body;
    if (!edited && Object.keys(validateAnswers(values, siteLanguage)).length === 0) showDraft(values);
    else renderMessagePreview();
  }
  refreshEmailLink();
}

siteLanguageSelect.addEventListener("change", () => setSiteLanguage(siteLanguageSelect.value));

emailLanguageSelect.addEventListener("change", () => {
  emailLanguage = emailLanguageSelect.value;
  get("view-email-flyer").href = flyerUrlForEmail();
  const values = answers();
  const edited = generatedDraft && (subject.value !== generatedDraft.subject || message.value !== generatedDraft.body);
  if (!edited && Object.keys(validateAnswers(values, siteLanguage)).length === 0) showDraft(values);
  else renderMessagePreview();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = answers();
  if (!validateForm(values)) return;
  if (generatedDraft && (subject.value !== generatedDraft.subject || message.value !== generatedDraft.body)) {
    pendingAnswers = values;
    dialog.showModal();
    return;
  }
  showDraft(values);
});

get("keep-draft").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => { pendingAnswers = null; });
get("replace-draft").addEventListener("click", () => {
  const values = pendingAnswers;
  dialog.close();
  if (values) showDraft(values);
});

for (const [buttonId, field] of [["copy-subject", subject], ["copy-message", message]]) {
  get(buttonId).addEventListener("click", async () => {
    const result = field === message
      ? await copyFormattedMessage(field.value, navigator.clipboard, { flyerUrl: flyerUrlForEmail(), language: emailLanguage })
      : await copyText(field.value, navigator.clipboard, siteLanguage);
    if (!result.ok) {
      if (field === message) focusMessage();
      else field.focus();
      field.select();
    }
    get("draft-status").textContent = result.message;
  });
}

subject.addEventListener("input", refreshEmailLink);
message.addEventListener("input", () => {
  renderMessagePreview();
  refreshEmailLink();
});
emailLink.addEventListener("click", (event) => {
  const result = refreshEmailLink();
  if (!result.url) {
    event.preventDefault();
    focusMessage();
  } else {
    get("draft-status").textContent = pack(siteLanguage).status.emailOpening;
  }
});
emailLink.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !emailLink.hasAttribute("href")) {
    event.preventDefault();
    get("draft-status").textContent = createMailto(currentDraft(), mailtoLimit, siteLanguage).message;
    focusMessage();
  }
});

// Do not restore form or email values from the browser's back/forward page cache.
window.addEventListener("pagehide", () => {
  form.reset();
  subject.value = "";
  message.value = "";
  get("message-preview").replaceChildren();
  get("message-edit").open = false;
  generatedDraft = null;
  pendingAnswers = null;
  dialog.close();
  get("draft-editor").hidden = true;
  get("draft-empty").hidden = false;
  get("draft-status").textContent = "";
  emailLink.removeAttribute("href");
  get("generate-label").textContent = t(siteLanguage, "button.create");
});

fillLanguageSelect(siteLanguageSelect, siteLanguage);
fillLanguageSelect(emailLanguageSelect, emailLanguage);

try {
  baseFlyerUrl = validateFlyerUrl(verifiedFlyerUrl, siteLanguage);
  setSiteLanguage(siteLanguage);
  form.hidden = false;
  get("startup-message").hidden = true;
} catch (error) {
  applyTranslations();
  get("startup-message").textContent = pack(siteLanguage).status.startupError(error.message);
  get("startup-message").setAttribute("role", "alert");
  console.error("Outreach configuration error", error);
}
