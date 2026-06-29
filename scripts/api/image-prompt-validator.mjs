import AiSettings from "./ai-settings.mjs";
import { completeLlmText } from "./llm-client.mjs";

const MAX_PROMPT_LENGTH = 4000;

const BLOCKED_PATTERNS = [
  /\b(nude|nudity|naked|nsfw|porn(?:ographic)?|xxx|erotic|hentai|fetish)\b/i,
  /\b(topless|bottomless|genital|penis|vagina|areola|nipple(?:s)?\s+visible)\b/i,
  /\b(loli|shota|pedoph|paedoph|underage\s+sex)\b/i,
  /\b(gore|dismember(?:ed|ment)?|behead(?:ed|ing)?|mutilat(?:e|ed|ion))\b/i,
  /\b(swastika|nazi\s+salute)\b/i,
  /\b(child|minor|kid|underage|teen(?:ager)?)\s+(?:who\s+is\s+)?(?:nude|naked|undressed|sexual)\b/i,
  /\b(?:nude|naked|undressed|sexual)\s+(?:child|minor|kid|underage|teen(?:ager)?)\b/i,
];

const REFUSAL_PATTERNS = [
  /^(I (?:cannot|can't|am unable to|must refuse|will not)|Sorry,? I (?:cannot|can't))/i,
  /content policy/i,
  /cannot (?:generate|create|produce) (?:this|that|such) (?:image|prompt)/i,
];

function normalizeImagePrompt(rawPrompt) {
  return String(rawPrompt ?? "").replace(/\s+/g, " ").trim();
}

function enforceMaxLength(prompt) {
  if (prompt.length <= MAX_PROMPT_LENGTH) return prompt;
  return prompt.slice(0, MAX_PROMPT_LENGTH).trim();
}

/**
 * @param {string} prompt
 * @returns {string[]}
 */
export function findLocalContentIssues(prompt) {
  const issues = [];
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(prompt)) {
      issues.push(pattern.source);
    }
  }
  return issues;
}

function isLlmRefusal(text) {
  if (!text) return true;
  if (text.length > MAX_PROMPT_LENGTH * 1.5) return true;
  return REFUSAL_PATTERNS.some((pattern) => pattern.test(text));
}

async function reviewImagePromptWithLlm(prompt) {
  const systemPrompt = game.i18n.localize("AActors.OpenAI.ImagePromptReviewSystem");
  const userPrompt = game.i18n
    .localize("AActors.OpenAI.ImagePromptReviewUser")
    .replace("<<prompt>>", prompt);

  const reviewed = await completeLlmText(systemPrompt, userPrompt, {
    maxTokens: 512,
    temperature: 0.1,
  });

  if (isLlmRefusal(reviewed)) {
    throw new Error(game.i18n.localize("AActors.Errors.ImagePromptUnfixable"));
  }

  return normalizeImagePrompt(reviewed);
}

/**
 * Validate and sanitize an image generation prompt before sending it to an image API.
 * @param {string} rawPrompt
 * @returns {Promise<string>}
 */
export async function prepareImagePromptForGeneration(rawPrompt) {
  const prompt = normalizeImagePrompt(rawPrompt);
  if (!prompt) {
    throw new Error(game.i18n.localize("AActors.Errors.ImagePromptEmpty"));
  }

  const initialIssues = findLocalContentIssues(prompt);
  let reviewed = prompt;
  let llmReviewed = false;

  if (AiSettings.getLlmConfig().apiKey) {
    try {
      reviewed = await reviewImagePromptWithLlm(prompt);
      llmReviewed = true;
    } catch (error) {
      if (initialIssues.length > 0) {
        throw new Error(game.i18n.localize("AActors.Errors.ImagePromptPolicyViolation"));
      }
      throw error;
    }
  } else if (initialIssues.length > 0) {
    throw new Error(game.i18n.localize("AActors.Errors.ImagePromptPolicyViolation"));
  } else {
    ui.notifications.warn(game.i18n.localize("AActors.Notifications.ImagePromptReviewSkipped"));
  }

  const remainingIssues = findLocalContentIssues(reviewed);
  if (remainingIssues.length > 0) {
    throw new Error(game.i18n.localize("AActors.Errors.ImagePromptPolicyViolation"));
  }

  if (llmReviewed && reviewed !== prompt) {
    ui.notifications.info(game.i18n.localize("AActors.Notifications.ImagePromptSanitized"));
  }

  return enforceMaxLength(reviewed);
}
