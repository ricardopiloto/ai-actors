import { Constants } from "../constants.mjs";
import ActorAiOpenAiApi from "./actor-ai-open-ai-api.mjs";
import ImageMidJourneyApi from "./image-mj-api.mjs";
import ImageOpenAiApi from "./image-open-ai-api.mjs";
import ImageOpenRouterApi from "./image-openrouter-api.mjs";

export const LlmProviders = {
  OPENAI: "openai",
  DEEPSEEK: "deepseek",
};

export const ImageProviders = {
  OPENROUTER: "openrouter",
  OPENAI: "openai",
  MIDJOURNEY: "midjourney",
};

export default class AiSettings {
  static LEGACY_ID = "aactors";
  static llmProviderKey = "llmProvider";
  static deepseekApiKey = "deepseekApiKey";
  static deepseekModelKey = "deepseekModel";
  static imageProviderKey = "imageProvider";
  static openrouterApiKeyKey = ImageOpenRouterApi.apiKeyKey;
  static openrouterImageModelKey = ImageOpenRouterApi.modelKey;

  static initialize() {
    game.settings.register(Constants.ID, AiSettings.llmProviderKey, {
      name: "AActors.Settings.LLM.llmProvider.Name",
      hint: "AActors.Settings.LLM.llmProvider.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: LlmProviders.OPENAI,
      choices: {
        [LlmProviders.OPENAI]: "AActors.Settings.LLM.llmProvider.OpenAI",
        [LlmProviders.DEEPSEEK]: "AActors.Settings.LLM.llmProvider.DeepSeek",
      },
    });

    game.settings.register(Constants.ID, AiSettings.deepseekApiKey, {
      name: "AActors.Settings.LLM.deepseekApiKey.Name",
      hint: "AActors.Settings.LLM.deepseekApiKey.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: "",
    });

    game.settings.register(Constants.ID, AiSettings.deepseekModelKey, {
      name: "AActors.Settings.LLM.deepseekModel.Name",
      hint: "AActors.Settings.LLM.deepseekModel.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: "deepseek-chat",
    });

    game.settings.register(Constants.ID, AiSettings.imageProviderKey, {
      name: "AActors.Settings.Image.imageProvider.Name",
      hint: "AActors.Settings.Image.imageProvider.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: ImageProviders.OPENROUTER,
      choices: {
        [ImageProviders.OPENROUTER]: "AActors.Settings.Image.imageProvider.OpenRouter",
        [ImageProviders.OPENAI]: "AActors.Settings.Image.imageProvider.OpenAI",
        [ImageProviders.MIDJOURNEY]: "AActors.Settings.Image.imageProvider.MidJourney",
      },
    });

    ImageOpenRouterApi.registerSettings();
  }

  static getLegacySettingValue(key) {
    const doc = game.settings.storage.get("world")?.getSetting(`${AiSettings.LEGACY_ID}.${key}`);
    const value = doc?.value;
    if (value === null || value === undefined) return "";
    return typeof value === "string" ? value.trim() : value;
  }

  static getStringSetting(key) {
    const current = game.settings.get(Constants.ID, key);
    if (typeof current === "string" && current.trim()) return current.trim();
    if (current !== null && current !== undefined && current !== "") return current;
    return AiSettings.getLegacySettingValue(key);
  }

  static getLlmConfig() {
    const provider = AiSettings.getStringSetting(AiSettings.llmProviderKey) || LlmProviders.OPENAI;

    if (provider === LlmProviders.DEEPSEEK) {
      return {
        provider,
        url: "https://api.deepseek.com/v1/chat/completions",
        apiKey: AiSettings.getStringSetting(AiSettings.deepseekApiKey),
        model: AiSettings.getStringSetting(AiSettings.deepseekModelKey) || "deepseek-chat",
      };
    }

    return {
      provider: LlmProviders.OPENAI,
      url: "https://api.openai.com/v1/chat/completions",
      apiKey: AiSettings.getStringSetting(ActorAiOpenAiApi.apiKey),
      model: AiSettings.getStringSetting(ActorAiOpenAiApi.modelVersion) || "gpt-4o",
    };
  }

  static getLlmApiKeySettingName(provider = AiSettings.getLlmConfig().provider) {
    return provider === LlmProviders.DEEPSEEK
      ? game.i18n.localize("AActors.Settings.LLM.deepseekApiKey.Name")
      : game.i18n.localize("AActors.Settings.OpenAI.openAiApiKey.Name");
  }

  static assertLlmConfigured() {
    const config = AiSettings.getLlmConfig();
    if (config.apiKey) return config;

    throw new Error(game.i18n.format("AActors.Errors.LlmApiKeyMissingNamed", {
      setting: AiSettings.getLlmApiKeySettingName(config.provider),
    }));
  }

  static async migrateLegacySettings() {
    if (!game.user?.isGM) return;

    const storage = game.settings.storage.get("world");
    if (!storage) return;

    let migrated = 0;
    for (const doc of storage) {
      if (!doc.key?.startsWith(`${AiSettings.LEGACY_ID}.`)) continue;

      const key = doc.key.slice(AiSettings.LEGACY_ID.length + 1);
      const targetId = `${Constants.ID}.${key}`;
      if (!game.settings.settings.has(targetId)) continue;

      const current = game.settings.get(Constants.ID, key);
      if (current !== null && current !== undefined && current !== "") continue;

      const legacyValue = doc.value;
      if (legacyValue === null || legacyValue === undefined || legacyValue === "") continue;

      await game.settings.set(Constants.ID, key, legacyValue);
      migrated += 1;
    }

    if (migrated > 0) {
      ui.notifications.info(game.i18n.format("AActors.Notifications.LegacySettingsMigrated", { count: migrated }));
    }
  }

  static async migrateRemovedImageProviders() {
    if (!game.user?.isGM) return;

    const provider = game.settings.get(Constants.ID, AiSettings.imageProviderKey);
    if (provider !== "cloudflare") return;

    await game.settings.set(Constants.ID, AiSettings.imageProviderKey, ImageProviders.OPENROUTER);
    ui.notifications.info(game.i18n.localize("AActors.Notifications.CloudflareRemovedMigrated"));
  }

  static getImageApi() {
    const provider = game.settings.get(Constants.ID, AiSettings.imageProviderKey);

    switch (provider) {
      case ImageProviders.MIDJOURNEY:
        return new ImageMidJourneyApi();
      case ImageProviders.OPENAI:
        return new ImageOpenAiApi();
      case ImageProviders.OPENROUTER:
      default:
        return new ImageOpenRouterApi();
    }
  }
}

Hooks.once("init", () => {
  AiSettings.initialize();
});

Hooks.once("ready", async () => {
  await AiSettings.migrateLegacySettings();
  await AiSettings.migrateRemovedImageProviders();
});
