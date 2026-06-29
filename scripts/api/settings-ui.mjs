import { Constants } from "../constants.mjs";
import { ImageProviders, LlmProviders } from "./providers.mjs";

/** @typedef {"llm-selector"|"image-selector"|"general"} SelectorGroup */
/** @typedef {{ group: "llm"|"image", provider?: string, shared?: boolean } | SelectorGroup} SettingUiMeta */

/** @type {Map<string, SettingUiMeta>} */
const SETTING_UI = new Map();

/** @type {string[]} */
const SETTING_ORDER = [];

const PROVIDER_LABEL_KEYS = {
  [LlmProviders.ANTHROPIC]: "AActors.Settings.Sections.Anthropic",
  [LlmProviders.OPENAI]: "AActors.Settings.Sections.OpenAI",
  [LlmProviders.DEEPSEEK]: "AActors.Settings.Sections.DeepSeek",
  [ImageProviders.OPENROUTER]: "AActors.Settings.Sections.OpenRouter",
  [ImageProviders.OPENAI]: "AActors.Settings.Sections.OpenAIImage",
};

/**
 * @param {string} key
 * @param {SettingUiMeta} meta
 * @param {object} config
 */
export function registerModuleSetting(key, meta, config) {
  SETTING_UI.set(key, meta);
  SETTING_ORDER.push(key);
  game.settings.register(Constants.ID, key, config);
}

export function getSettingUiMeta(key) {
  return SETTING_UI.get(key);
}

function resolveRoot(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return html ?? null;
}

function getRowFromInput(input) {
  return input.closest(".form-group")
    ?? input.closest(".setting")
    ?? input.closest(".flexrow")
    ?? input.parentElement?.closest(".form-group")
    ?? input.parentElement?.parentElement;
}

function findSettingRow(root, key) {
  const fullKey = `${Constants.ID}.${key}`;
  const selectors = [
    `[name="${fullKey}"]`,
    `[data-name="${fullKey}"]`,
    `[data-setting="${fullKey}"]`,
    `[data-key="${fullKey}"]`,
  ];

  for (const selector of selectors) {
    const input = root.querySelector(selector);
    if (input) return getRowFromInput(input);
  }

  return null;
}

function collectModuleSettingRows(root) {
  /** @type {Map<string, HTMLElement>} */
  const rows = new Map();

  for (const key of SETTING_ORDER) {
    const row = findSettingRow(root, key);
    if (row) rows.set(key, row);
  }

  if (rows.size === 0) {
    root.querySelectorAll(`[name^="${Constants.ID}."], [data-name^="${Constants.ID}."]`).forEach((input) => {
      const attributeName = input.getAttribute("name") ?? input.getAttribute("data-name") ?? "";
      const key = attributeName.slice(Constants.ID.length + 1);
      if (!key || rows.has(key)) return;
      const row = getRowFromInput(input);
      if (row) rows.set(key, row);
    });
  }

  return rows;
}

function shouldShowSetting(key, llmProvider, imageProvider) {
  const meta = SETTING_UI.get(key);
  if (!meta) return true;

  if (meta === "llm-selector" || meta === "image-selector" || meta === "general") {
    return true;
  }

  if (meta.shared && meta.group === "llm") return true;
  if (meta.shared && meta.group === "image") return true;

  if (key === "openAiApiKey") {
    return llmProvider === LlmProviders.OPENAI || imageProvider === ImageProviders.OPENAI;
  }

  if (meta.group === "llm") {
    return meta.provider === llmProvider;
  }

  if (meta.group === "image") {
    return meta.provider === imageProvider;
  }

  return true;
}

function ensureStyles() {
  if (document.getElementById("ai-actors-settings-style")) return;

  const style = document.createElement("style");
  style.id = "ai-actors-settings-style";
  style.textContent = `
    .ai-actors-settings-section {
      margin: 1.25em 0 0.35em;
      padding-top: 0.75em;
      border-top: 1px solid var(--color-border-light-2, #ccc);
      font-size: var(--font-size-15, 15px);
      font-weight: 600;
    }
    .ai-actors-settings-provider {
      margin: 0.75em 0 0.15em;
      font-size: var(--font-size-13, 13px);
      font-weight: 600;
      color: var(--color-text-secondary, #666);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .ai-actors-settings-hidden {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function createHeader(className, datasetKey, label) {
  const header = document.createElement("div");
  header.className = className;
  header.dataset.aiActorsUi = datasetKey;
  header.textContent = label;
  return header;
}

function insertHeaderAfter(anchor, className, datasetKey, label) {
  if (!anchor) return null;
  const header = createHeader(className, datasetKey, label);
  anchor.insertAdjacentElement("afterend", header);
  return header;
}

let organizing = false;

function organizeModuleSettings(root, overrides = {}) {
  if (!root || organizing) return;

  const rows = collectModuleSettingRows(root);
  if (!rows.size) return;

  organizing = true;
  try {
    ensureStyles();

    const llmProvider = overrides.llmProvider
      ?? game.settings.get(Constants.ID, "llmProvider")
      ?? LlmProviders.OPENAI;
    const imageProvider = overrides.imageProvider
      ?? game.settings.get(Constants.ID, "imageProvider")
      ?? ImageProviders.OPENROUTER;

    root.querySelectorAll("[data-ai-actors-ui]").forEach((node) => node.remove());

    for (const [key, row] of rows.entries()) {
      const visible = shouldShowSetting(key, llmProvider, imageProvider);
      row.classList.toggle("ai-actors-settings-hidden", !visible);
      row.hidden = !visible;
    }

    const llmProviderRow = rows.get("llmProvider");
    if (llmProviderRow && shouldShowSetting("llmProvider", llmProvider, imageProvider)) {
      const sectionHeader = insertHeaderAfter(
        llmProviderRow,
        "ai-actors-settings-section",
        "llm-section",
        game.i18n.localize("AActors.Settings.Sections.LLMConfig"),
      );
      insertHeaderAfter(
        sectionHeader ?? llmProviderRow,
        "ai-actors-settings-provider",
        `llm-provider-${llmProvider}`,
        game.i18n.localize(PROVIDER_LABEL_KEYS[llmProvider] ?? llmProvider),
      );
    }

    const imageProviderRow = rows.get("imageProvider");
    if (imageProviderRow && shouldShowSetting("imageProvider", llmProvider, imageProvider)) {
      const sectionHeader = insertHeaderAfter(
        imageProviderRow,
        "ai-actors-settings-section",
        "image-section",
        game.i18n.localize("AActors.Settings.Sections.ImageConfig"),
      );
      insertHeaderAfter(
        sectionHeader ?? imageProviderRow,
        "ai-actors-settings-provider",
        `image-provider-${imageProvider}`,
        game.i18n.localize(PROVIDER_LABEL_KEYS[imageProvider] ?? imageProvider),
      );
    }
  } finally {
    organizing = false;
  }
}

function bindProviderListeners(root) {
  if (root.dataset.aiActorsSettingsBound === "true") return;
  root.dataset.aiActorsSettingsBound = "true";

  root.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;

    if (target.name === `${Constants.ID}.llmProvider`) {
      const imageInput = root.querySelector(`[name="${Constants.ID}.imageProvider"]`);
      organizeModuleSettings(root, {
        llmProvider: target.value,
        imageProvider: imageInput?.value,
      });
      return;
    }

    if (target.name === `${Constants.ID}.imageProvider`) {
      const llmInput = root.querySelector(`[name="${Constants.ID}.llmProvider"]`);
      organizeModuleSettings(root, {
        llmProvider: llmInput?.value,
        imageProvider: target.value,
      });
    }
  });
}

function scheduleOrganize(app, html) {
  const root = resolveRoot(html) ?? app?.element;
  if (!root) return;

  requestAnimationFrame(() => {
    if (!root.querySelector(`[name^="${Constants.ID}."]`)) return;
    organizeModuleSettings(root);
    bindProviderListeners(root);
  });
}

function isSettingsConfigApp(app) {
  return app?.constructor?.name === "SettingsConfig"
    || app?.id === "settings-config"
    || app?.options?.id === "settings-config";
}

function handleSettingsRender(app, html) {
  const root = resolveRoot(html) ?? app?.element;
  if (!root) return;
  scheduleOrganize(app, root);
}

Hooks.on("renderSettingsConfig", handleSettingsRender);

Hooks.on("renderApplicationV2", (app, html) => {
  if (!isSettingsConfigApp(app)) return;
  handleSettingsRender(app, html);
});

Hooks.on("closeSettingsConfig", () => {
  organizing = false;
});
