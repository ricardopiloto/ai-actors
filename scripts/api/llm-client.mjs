import { Constants } from "../constants.mjs";
import ActorAiOpenAiApi from "./actor-ai-open-ai-api.mjs";
import AiSettings from "./ai-settings.mjs";
import { parseLlmJsonDetailed } from "./json-response.mjs";
import { LlmProviders } from "./providers.mjs";

const MIN_MAX_TOKENS = 8192;
const MAX_MAX_TOKENS = 16384;
const MAX_JSON_ATTEMPTS = 3;

function getSharedLlmSettings() {
  return {
    systemPrompt: game.settings.get(Constants.ID, ActorAiOpenAiApi.systemPromptKey),
    maxTokens: game.settings.get(Constants.ID, ActorAiOpenAiApi.maxTokensKey),
    temperature: game.settings.get(Constants.ID, ActorAiOpenAiApi.temperatureKey),
  };
}

function ensureMinMaxTokens(postData, minimum = MIN_MAX_TOKENS) {
  const current = Number(postData.max_tokens ?? getSharedLlmSettings().maxTokens ?? minimum);
  postData.max_tokens = Math.max(current, minimum);
}

async function readErrorDetails(response) {
  try {
    return JSON.stringify(await response.json());
  } catch {
    return await response.text();
  }
}

/**
 * @param {object} config
 * @param {object} postData
 * @returns {Promise<{ text: string, usage?: object, finishReason?: string }>}
 */
async function fetchOpenAiCompatibleCompletion(config, postData) {
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    throw new Error(`LLM API error (${response.status}): ${await readErrorDetails(response)}`);
  }

  const responseData = await response.json();
  const choice = responseData.choices?.[0] ?? {};

  return {
    text: choice.message?.content ?? "",
    usage: responseData.usage,
    finishReason: choice.finish_reason,
  };
}

/**
 * @param {object} config
 * @param {object} postData
 * @returns {Promise<{ text: string, usage?: object, finishReason?: string }>}
 */
async function fetchAnthropicCompletion(config, postData) {
  const { maxTokens, temperature } = getSharedLlmSettings();
  const systemContent = postData.messages?.find((message) => message.role === "system")?.content ?? "";
  const userMessages = postData.messages?.filter((message) => message.role !== "system") ?? [];

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: postData.max_tokens ?? maxTokens,
      temperature: postData.temperature ?? temperature,
      system: systemContent,
      messages: userMessages.map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error (${response.status}): ${await readErrorDetails(response)}`);
  }

  const responseData = await response.json();
  const stopReason = responseData.stop_reason;

  return {
    text: responseData.content?.[0]?.text ?? "",
    usage: responseData.usage,
    finishReason: stopReason === "max_tokens" ? "length" : stopReason,
  };
}

async function fetchCompletion(config, postData) {
  if (config.provider === LlmProviders.ANTHROPIC) {
    return fetchAnthropicCompletion(config, postData);
  }
  return fetchOpenAiCompatibleCompletion(config, postData);
}

function buildRepairMessages(originalMessages, badResponse, finishReason, attemptIndex) {
  const repairPrompt = game.i18n.localize("AActors.OpenAI.JsonRepairPrompt");
  const truncatedHint = finishReason === "length"
    ? `\n${game.i18n.localize("AActors.OpenAI.JsonTruncatedHint")}`
    : "";
  const shortHint = attemptIndex >= 2
    ? `\n${game.i18n.localize("AActors.OpenAI.JsonRetryShortHint")}`
    : "";

  return [
    ...originalMessages,
    { role: "assistant", content: badResponse },
    { role: "user", content: `${repairPrompt}${truncatedHint}${shortHint}` },
  ];
}

function bumpMaxTokens(postData) {
  const current = Number(postData.max_tokens ?? getSharedLlmSettings().maxTokens ?? MIN_MAX_TOKENS);
  postData.max_tokens = Math.min(Math.max(current * 2, MIN_MAX_TOKENS), MAX_MAX_TOKENS);
}

function shouldRetryJsonParse({ truncated, finishReason }, attemptIndex) {
  if (attemptIndex >= MAX_JSON_ATTEMPTS - 1) return false;
  return truncated || finishReason === "length";
}

/**
 * @param {object} config
 * @param {object} postData
 * @param {string} userContent
 */
async function completeAndParseJson(config, postData, userContent) {
  const requestBody = foundry.utils.deepClone(postData);
  requestBody.messages = [...(requestBody.messages ?? [])];
  ensureMinMaxTokens(requestBody);

  if (!requestBody.messages.some((message) => message.role === "user" && message.content === userContent)) {
    requestBody.messages.push({ role: "user", content: userContent });
  }

  let activeBody = requestBody;
  let lastError = null;
  let completion = null;

  for (let attempt = 0; attempt < MAX_JSON_ATTEMPTS; attempt++) {
    completion = await fetchCompletion(config, activeBody);

    try {
      const { parsed, truncated } = parseLlmJsonDetailed(completion.text);
      if (shouldRetryJsonParse({ truncated, finishReason: completion.finishReason }, attempt)) {
        throw new Error("truncated-json");
      }
      parsed.usage = completion.usage;
      return parsed;
    } catch (error) {
      lastError = error;
      if (attempt >= MAX_JSON_ATTEMPTS - 1) break;

      ui.notifications.warn(game.i18n.localize("AActors.Notifications.LlmJsonRetrying"));

      const retryBody = foundry.utils.deepClone(activeBody);
      bumpMaxTokens(retryBody);
      retryBody.messages = buildRepairMessages(
        requestBody.messages,
        completion.text,
        completion.finishReason,
        attempt + 1,
      );

      if (config.provider !== LlmProviders.ANTHROPIC) {
        retryBody.temperature = Math.min(Number(retryBody.temperature ?? 1), 0.7);
      }

      activeBody = retryBody;
    }
  }

  throw lastError;
}

/**
 * @param {string} systemContent
 * @param {string} userContent
 * @param {{ maxTokens?: number, temperature?: number }} [options]
 * @returns {Promise<string>}
 */
export async function completeLlmText(systemContent, userContent, options = {}) {
  const config = AiSettings.assertLlmConfigured();
  const postData = {
    model: config.model,
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0.2,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userContent },
    ],
  };

  const completion = await fetchCompletion(config, postData);
  return (completion.text ?? "").trim();
}

export async function generateLlmJsonCompletion(postData, inputModel) {
  const config = AiSettings.assertLlmConfigured();
  const userContent = `NPC: ${inputModel.TextPrompt}`;
  return completeAndParseJson(config, postData, userContent);
}
