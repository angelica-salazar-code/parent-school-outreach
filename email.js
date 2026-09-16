import { engagementDestinationUrl, engagementUrl } from "./config.js";

export const grades = Object.freeze({
  elementary: "grades 1-5",
  middle: "grades 6-8",
  high: "grades 9-12",
  mixed: "multiple grade levels",
});

export const interests = Object.freeze({
  coding: "coding workshops",
  virtual: "virtual sessions",
  speakers: "STEM speakers",
});

// Email applications have different limits; use copying for longer drafts.
export const mailtoLimit = 1800;

export function singleLine(value) {
  return value.replace(/[\u0000-\u001f\u007f\s]+/g, " ").trim();
}

export function validateAnswers({ school, grade, selectedInterests }) {
  const errors = {};
  if (!singleLine(school)) {
    errors.school = "Enter your school's name.";
  } else if (singleLine(school).length > 120) {
    errors.school = "Use 120 characters or fewer for the school name.";
  }
  if (!Object.hasOwn(grades, grade)) {
    errors.grade = "Choose a grade level.";
  }
  if (
    !Array.isArray(selectedInterests) ||
    selectedInterests.length === 0 ||
    selectedInterests.some((interest) => !Object.hasOwn(interests, interest))
  ) {
    errors.interests = "Choose at least one interest.";
  }
  return errors;
}

export function validateFlyerUrl(value) {
  if (value === "") return "";
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The flyer address must be a verified public HTTPS link.");
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
    [engagementUrl, engagementDestinationUrl].some((address) => url.origin === new URL(address).origin)
  ) {
    throw new Error("Use the verified public flyer link, not a local address or the interest form.");
  }
  return url.href;
}

function joinList(items) {
  if (items.length < 3) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

export function createEmail(answers, flyerUrl = "") {
  const errors = validateAnswers(answers);
  if (Object.keys(errors).length) {
    throw new Error(Object.values(errors).join(" "));
  }
  const school = singleLine(answers.school);
  const selected = [...new Set(answers.selectedInterests)].map((key) => interests[key]);
  const flyer = validateFlyerUrl(flyerUrl);
  const paragraphs = [
    `Hello ${school} team,`,
    `I'm a parent interested in bringing more opportunities to explore science, technology, engineering, and math (STEM) to students in ${grades[answers.grade]} at ${school}.`,
    `I came across Nuevo Foundation and thought its ${joinList(selected)} could be worth exploring for our school. Its flyer describes hands-on learning and opportunities to connect with STEM role models.`,
    "Would our school be interested in learning more? I would love to hear whether this might be a fit and who would be the best person at the school to discuss it.",
  ];
  if (flyer) paragraphs.push(`Here is Nuevo Foundation's flyer:\n${flyer}`);
  paragraphs.push(
    `Your team can express interest directly through Nuevo Foundation's Programs Interest Form:\n${engagementUrl}`,
    "Thank you for considering the idea!",
    "Best,\n[Your name]",
  );
  return {
    subject: `Could we explore Nuevo Foundation for ${school}?`,
    body: paragraphs.join("\n\n"),
  };
}

export function createMailto({ subject, body }, limit = mailtoLimit) {
  const cleanSubject = singleLine(subject);
  if (!cleanSubject || !body.trim()) {
    return { url: null, message: "Add a subject and message before opening your email app." };
  }
  let url;
  try {
    const message = body.replace(/\r\n|\r|\n/g, "\r\n");
    url = `mailto:?subject=${encodeURIComponent(cleanSubject)}&body=${encodeURIComponent(message)}`;
  } catch (error) {
    if (!(error instanceof URIError)) throw error;
    return { url: null, message: "This draft has a character your email app cannot receive. Use the copy buttons instead." };
  }
  if (url.length > limit) {
    return {
      url: null,
      message: "This draft is too long to open reliably in an email app. Copy the subject and message instead.",
    };
  }
  return { url, message: "" };
}

export function messageParts(body, flyerUrl = "") {
  const text = body.replace(/\r\n|\r/g, "\n");
  const flyer = validateFlyerUrl(flyerUrl);
  const links = [
    { source: "I came across Nuevo Foundation", prefix: "I came across ", text: "Nuevo Foundation", href: "https://nuevofoundation.org/" },
    { source: `Form:\n${engagementUrl}`, text: "Form", href: engagementUrl },
    { source: engagementUrl, text: "Form", href: engagementUrl },
  ];
  if (flyer) {
    links.push(
      { source: `Here is Nuevo Foundation's flyer:\n${flyer}`, text: "View the flyer", href: flyer },
      { source: flyer, text: "View the flyer", href: flyer },
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

export function formattedMessage(body, flyerUrl = "") {
  const content = messageParts(body, flyerUrl).map((part) => part.href
    ? `<a href="${escapeHtml(part.href)}">${escapeHtml(part.text)}</a>`
    : escapeHtml(part.text).replace(/\n/g, "<br>")).join("");
  return `<div>${content}</div>`;
}

export async function copyFormattedMessage(text, clipboard, { ClipboardItemType = globalThis.ClipboardItem, flyerUrl = "" } = {}) {
  if (clipboard && typeof clipboard.write === "function" && ClipboardItemType) {
    try {
      await clipboard.write([new ClipboardItemType({
        "text/html": new Blob([formattedMessage(text, flyerUrl)], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      })]);
      return { ok: true, message: 'Copied formatted message. Paste normally into your email to preserve links, not "paste as plain text."' };
    } catch {
      // Some browsers allow text copying but deny formatted clipboard content.
    }
  }
  const result = await copyText(text, clipboard);
  return result.ok
    ? { ok: true, message: "Copied as plain text because formatted copying was unavailable. Any links will appear as their URLs." }
    : result;
}

export async function copyText(text, clipboard) {
  if (!clipboard || typeof clipboard.writeText !== "function") {
    return { ok: false, message: "Automatic copying is unavailable. The text is selected; use your device's Copy command." };
  }
  try {
    await clipboard.writeText(text);
    return { ok: true, message: "Copied. Paste it into your email." };
  } catch {
    return { ok: false, message: "Your browser could not copy the text. It is selected; use your device's Copy command." };
  }
}
