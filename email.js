import { engagementDestinationUrl, engagementUrl } from "./config.js";
import { defaultLanguage, languageCodes, pack } from "./i18n.js";

// English values remain the module's defaults so existing callers keep working.
export const grades = pack(defaultLanguage).grades;
export const interests = pack(defaultLanguage).interests;

// Email applications have different limits; use copying for longer drafts.
export const mailtoLimit = 1800;

export function singleLine(value) {
  return value.replace(/[\u0000-\u001f\u007f\s]+/g, " ").trim();
}

export function validateAnswers({ school, grade, selectedInterests }, language = defaultLanguage) {
  const strings = pack(language).errors;
  const errors = {};
  if (!singleLine(school)) {
    errors.school = strings.school;
  } else if (singleLine(school).length > 120) {
    errors.school = strings.schoolLong;
  }
  if (!Object.hasOwn(grades, grade)) {
    errors.grade = strings.grade;
  }
  if (
    !Array.isArray(selectedInterests) ||
    selectedInterests.length === 0 ||
    selectedInterests.some((interest) => !Object.hasOwn(interests, interest))
  ) {
    errors.interests = strings.interests;
  }
  return errors;
}

export function validateFlyerUrl(value, language = defaultLanguage) {
  if (value === "") return "";
  const strings = pack(language).errors;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(strings.flyerInvalid);
  }
  const host = url.hostname;
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !host.includes(".") ||
    /^[\d.]+$/.test(host) ||
    host.includes(":") ||
    /(?:^|\.)(?:localhost|localdomain|local|internal|test|invalid|example)$/.test(host) ||
    /^example\.(?:com|net|org)$/.test(host) ||
    url.href === new URL(engagementUrl).href ||
    url.origin === new URL(engagementDestinationUrl).origin
  ) {
    throw new Error(strings.flyerUnsafe);
  }
  return url.href;
}

// The published flyer has one static file per language, so a recipient opens it
// in the same language as the email that linked to it.
export function localizeFlyerUrl(flyerUrl, language = defaultLanguage) {
  // Only languages that actually have a published flyer file are substituted,
  // so an unknown code can never point parents at a missing page.
  if (!flyerUrl || language === defaultLanguage || !languageCodes.includes(language)) return flyerUrl;
  const url = new URL(flyerUrl);
  if (!url.pathname.endsWith("/flyer.html")) return flyerUrl;
  url.pathname = url.pathname.replace(/\/flyer\.html$/, `/flyer-${language}.html`);
  return url.href;
}

export function createEmail(answers, flyerUrl = "", language = defaultLanguage) {
  const errors = validateAnswers(answers, language);
  if (Object.keys(errors).length) {
    throw new Error(Object.values(errors).join(" "));
  }
  const strings = pack(language);
  const school = singleLine(answers.school);
  const selected = [...new Set(answers.selectedInterests)].map((key) => strings.interests[key]);
  const flyer = validateFlyerUrl(flyerUrl, language);
  const paragraphs = [
    strings.email.greeting(school),
    strings.email.intro(strings.grades[answers.grade], school),
    strings.email.discovery(strings.joinList(selected)),
    strings.email.ask,
  ];
  if (flyer) paragraphs.push(`${strings.email.flyerIntro}\n${flyer}`);
  paragraphs.push(
    `${strings.email.formIntro}\n${engagementUrl}`,
    strings.email.thanks,
    strings.email.signature,
  );
  return {
    subject: strings.email.subject(school),
    body: paragraphs.join("\n\n"),
  };
}

export function createMailto({ subject, body }, limit = mailtoLimit, language = defaultLanguage) {
  const strings = pack(language).status;
  const cleanSubject = singleLine(subject);
  if (!cleanSubject || !body.trim()) {
    return { url: null, message: strings.mailtoEmpty };
  }
  let url;
  try {
    const message = body.replace(/\r\n|\r|\n/g, "\r\n");
    url = `mailto:?subject=${encodeURIComponent(cleanSubject)}&body=${encodeURIComponent(message)}`;
  } catch (error) {
    if (!(error instanceof URIError)) throw error;
    return { url: null, message: strings.mailtoEncoding };
  }
  if (url.length > limit) {
    return { url: null, message: strings.mailtoLong };
  }
  return { url, message: "" };
}

export function messageParts(body, flyerUrl = "", language = defaultLanguage) {
  const strings = pack(language).email;
  const text = body.replace(/\r\n|\r/g, "\n");
  const flyer = validateFlyerUrl(flyerUrl, language);
  const links = [
    {
      source: `${strings.brandPrefix}Nuevo Foundation`,
      prefix: strings.brandPrefix,
      text: "Nuevo Foundation",
      href: "https://nuevofoundation.org/",
    },
    { source: `${strings.formTail}\n${engagementUrl}`, text: strings.formLabel, href: engagementUrl },
    { source: engagementUrl, text: strings.formLabel, href: engagementUrl },
  ];
  if (flyer) {
    links.push(
      { source: `${strings.flyerIntro}\n${flyer}`, text: strings.flyerLabel, href: flyer },
      { source: flyer, text: strings.flyerLabel, href: flyer },
    );
  }
  const alternatives = links.map((link) => link.source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?:${alternatives.join("|")})(?=\\s|$)`, "g");
  const parts = [];
  let start = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > start) parts.push({ text: text.slice(start, match.index) });
    const link = links.find((entry) => entry.source === match[0]);
    if (link.prefix) parts.push({ text: link.prefix });
    parts.push({ text: link.text, href: link.href });
    start = match.index + match[0].length;
  }
  if (start < text.length) parts.push({ text: text.slice(start) });
  return parts;
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function formattedMessage(body, flyerUrl = "", language = defaultLanguage) {
  const content = messageParts(body, flyerUrl, language).map((part) => part.href
    ? `<a href="${escapeHtml(part.href)}">${escapeHtml(part.text)}</a>`
    : escapeHtml(part.text).replace(/\n/g, "<br>")).join("");
  return `<div>${content}</div>`;
}

export async function copyFormattedMessage(text, clipboard, { ClipboardItemType = globalThis.ClipboardItem, flyerUrl = "", language = defaultLanguage } = {}) {
  const strings = pack(language).status;
  if (clipboard && typeof clipboard.write === "function" && ClipboardItemType) {
    try {
      await clipboard.write([new ClipboardItemType({
        "text/html": new Blob([formattedMessage(text, flyerUrl, language)], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      })]);
      return { ok: true, message: strings.copiedRich };
    } catch {
      // Some browsers allow text copying but deny formatted clipboard content.
    }
  }
  const result = await copyText(text, clipboard, language);
  return result.ok ? { ok: true, message: strings.copiedPlainFallback } : result;
}

export async function copyText(text, clipboard, language = defaultLanguage) {
  const strings = pack(language).status;
  if (!clipboard || typeof clipboard.writeText !== "function") {
    return { ok: false, message: strings.copyUnavailable };
  }
  try {
    await clipboard.writeText(text);
    return { ok: true, message: strings.copied };
  } catch {
    return { ok: false, message: strings.copyFailed };
  }
}
