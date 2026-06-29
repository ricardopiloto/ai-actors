/**
 * @param {string} jsonText
 * @returns {{ inString: boolean, depth: number, arrayDepth: number, truncated: boolean }}
 */
export function analyzeJsonState(jsonText) {
  let inString = false;
  let escaped = false;
  let depth = 0;
  let arrayDepth = 0;

  for (const char of jsonText) {
    if (escaped) {
      escaped = false;
      continue;
    }

    if (inString) {
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (char === "[") arrayDepth += 1;
    if (char === "]") arrayDepth -= 1;
  }

  return {
    inString,
    depth,
    arrayDepth,
    truncated: inString || depth > 0 || arrayDepth > 0,
  };
}

/**
 * Extract a JSON object payload from an LLM text response.
 * @param {string} text
 * @returns {string}
 */
export function extractJsonPayload(text) {
  if (!text?.trim()) {
    throw new Error("Empty LLM response");
  }

  let trimmed = text.trim();

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  if (fenced) {
    trimmed = fenced[1].trim();
  } else {
    const inlineFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (inlineFence) trimmed = inlineFence[1].trim();
  }

  const start = trimmed.indexOf("{");
  if (start < 0) return trimmed;

  trimmed = trimmed.slice(start);

  const state = analyzeJsonState(trimmed);
  if (!state.truncated) {
    const end = trimmed.lastIndexOf("}");
    if (end > 0) trimmed = trimmed.slice(0, end + 1);
  }

  return trimmed;
}

/**
 * Escape raw control characters that appear inside JSON string literals.
 * @param {string} jsonText
 * @returns {string}
 */
export function sanitizeJsonControlCharacters(jsonText) {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonText.length; i++) {
    const char = jsonText[i];
    const code = char.charCodeAt(0);

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString && code < 0x20) {
      switch (char) {
        case "\n":
          result += "\\n";
          break;
        case "\r":
          result += "\\r";
          break;
        case "\t":
          result += "\\t";
          break;
        default:
          result += `\\u${code.toString(16).padStart(4, "0")}`;
          break;
      }
      continue;
    }

    result += char;
  }

  return result;
}

/**
 * Remove trailing commas before } or ] which some models emit.
 * @param {string} jsonText
 * @returns {string}
 */
export function removeTrailingCommas(jsonText) {
  return jsonText.replace(/,\s*([}\]])/g, "$1");
}

/**
 * Escape double quotes that appear inside JSON string literals but are not real closers.
 * @param {string} jsonText
 * @returns {string}
 */
export function repairUnescapedStringQuotes(jsonText) {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonText.length; i++) {
    const char = jsonText[i];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }

    if (char === "\"") {
      if (!inString) {
        inString = true;
        result += char;
        continue;
      }

      let j = i + 1;
      while (j < jsonText.length && /\s/.test(jsonText[j])) j += 1;
      const next = jsonText[j];
      if (next === undefined || next === "," || next === "}" || next === "]" || next === ":") {
        inString = false;
        result += char;
      } else {
        result += "\\\"";
      }
      continue;
    }

    result += char;
  }

  return result;
}

/**
 * @param {string} jsonText
 * @returns {string}
 */
export function attemptCloseTruncatedJson(jsonText) {
  const state = analyzeJsonState(jsonText);
  if (!state.truncated) return jsonText;

  let repaired = jsonText.trimEnd();
  if (state.inString) repaired += "\"";
  for (let i = 0; i < state.arrayDepth; i++) repaired += "]";
  for (let i = 0; i < state.depth; i++) repaired += "}";
  return repaired;
}

/**
 * @param {string} text
 * @returns {{ parsed: object, payload: string, truncated: boolean }}
 */
export function parseLlmJsonDetailed(text) {
  const payload = extractJsonPayload(text);
  const truncated = analyzeJsonState(payload).truncated;
  const sanitized = sanitizeJsonControlCharacters(payload);
  const quoteRepaired = repairUnescapedStringQuotes(sanitized);
  const closed = attemptCloseTruncatedJson(quoteRepaired);
  const attempts = [
    payload,
    sanitized,
    quoteRepaired,
    removeTrailingCommas(payload),
    removeTrailingCommas(sanitized),
    removeTrailingCommas(quoteRepaired),
    closed,
    removeTrailingCommas(closed),
    attemptCloseTruncatedJson(sanitizeJsonControlCharacters(repairUnescapedStringQuotes(payload))),
    removeTrailingCommas(attemptCloseTruncatedJson(sanitizeJsonControlCharacters(repairUnescapedStringQuotes(payload)))),
  ];

  let lastError = null;

  for (const candidate of attempts) {
    try {
      return {
        parsed: JSON.parse(candidate),
        payload,
        truncated,
      };
    } catch (error) {
      lastError = error;
    }
  }

  console.warn("AI Actors: failed to parse LLM JSON response", {
    error: lastError?.message,
    truncated,
    preview: payload.slice(0, 800),
    tail: payload.slice(-200),
  });

  const details = truncated
    ? game.i18n.localize("AActors.Errors.LlmJsonTruncated")
    : (lastError?.message ?? "Unknown JSON error");

  throw new Error(game.i18n.format("AActors.Errors.LlmJsonInvalid", { details }));
}

/**
 * @param {string} text
 * @returns {object}
 */
export function parseLlmJson(text) {
  return parseLlmJsonDetailed(text).parsed;
}
