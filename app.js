import { verifiedFlyerUrl } from "./config.js";
import { copyFormattedMessage, copyText, createEmail, createMailto, messageParts, validateAnswers, validateFlyerUrl } from "./email.js";

const get = (id) => document.getElementById(id);
const form = get("school-form");
const subject = get("subject");
const message = get("message");
const emailLink = get("open-email");
const dialog = get("replace-dialog");
let generatedDraft = null;
let pendingAnswers = null;
let flyerUrl = "";

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
  const nodes = messageParts(message.value, flyerUrl).map((part) => {
    if (!part.href) return document.createTextNode(part.text);
    const link = document.createElement("a");
    link.href = part.href;
    link.textContent = part.text;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `${part.text} (opens in a new tab)`);
    return link;
  });
  get("message-preview").replaceChildren(...nodes);
}

function focusMessage() {
  get("message-edit").open = true;
  message.focus();
}

function refreshEmailLink() {
  const result = createMailto(currentDraft());
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
  generatedDraft = createEmail(values, flyerUrl);
  subject.value = generatedDraft.subject;
  message.value = generatedDraft.body;
  renderMessagePreview();
  get("draft-empty").hidden = true;
  get("draft-editor").hidden = false;
  get("generate").textContent = "Update my email";
  refreshEmailLink();
  get("draft-title").focus();
}

function validateForm(values) {
  const errors = validateAnswers(values);
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
      ? await copyFormattedMessage(field.value, navigator.clipboard, { flyerUrl })
      : await copyText(field.value, navigator.clipboard);
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
    get("draft-status").textContent = "Your device may ask which email app to use. Nothing has been sent. If no draft opens, copy the subject and message.";
  }
});
emailLink.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !emailLink.hasAttribute("href")) {
    event.preventDefault();
    get("draft-status").textContent = createMailto(currentDraft()).message;
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
  get("generate").textContent = "Create my email";
});

try {
  flyerUrl = validateFlyerUrl(verifiedFlyerUrl);
  if (flyerUrl) {
    get("flyer-link-status").textContent = "Your email will include the public flyer link. You can also download the image and attach it manually; links pictured in a downloaded image are not clickable.";
  }
  form.hidden = false;
  get("startup-message").hidden = true;
} catch (error) {
  get("startup-message").textContent = `The email builder couldn't start: ${error.message} Please ask the site owner to correct the flyer configuration.`;
  get("startup-message").setAttribute("role", "alert");
  console.error("Outreach configuration error", error);
}
