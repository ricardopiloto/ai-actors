import { Constants } from "../constants.mjs";
import AiSettings from "./ai-settings.mjs";
import { LlmProviders } from "./providers.mjs";
import { generateLlmJsonCompletion } from "./llm-client.mjs";
import { registerModuleSetting } from "./settings-ui.mjs";

export default class ActorAiOpenAiApi {
  static apiKey = "openAiApiKey";
  static systemPromptKey = "systemPrompt";
  static frequencyPenaltyKey = "frequencyPenalty";
  static presencePenaltyKey = "presencePenalty";
  static temperatureKey = "temperature";
  static topPKey = "topP";
  static maxTokensKey = "maxTokens";
  static imageAdditionalQualitiesKey = "imageAdditionalQualities";
  static modelVersion = "modelVersion";
  static historyLength = "historyLength";

  static registerLlmSettings() {
    registerModuleSetting(ActorAiOpenAiApi.apiKey, { group: "llm", provider: LlmProviders.OPENAI }, {
      name: "AActors.Settings.OpenAI.openAiApiKey.Name",
      hint: "AActors.Settings.OpenAI.openAiApiKey.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: "",
    });

    registerModuleSetting(ActorAiOpenAiApi.modelVersion, { group: "llm", provider: LlmProviders.OPENAI }, {
      name: "AActors.Settings.OpenAI.modelVersion.Name",
      hint: "AActors.Settings.OpenAI.modelVersion.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: "gpt-4o",
      choices: {
        "gpt-4o": "GPT-4o",
        "gpt-4": "GPT-4",
        "gpt-3.5-turbo": "GPT-3.5",
      },
    });

    registerModuleSetting(ActorAiOpenAiApi.frequencyPenaltyKey, { group: "llm", provider: LlmProviders.OPENAI }, {
      name: "AActors.Settings.OpenAI.frequencyPenalty.Name",
      hint: "AActors.Settings.OpenAI.frequencyPenalty.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: Number,
      default: 0.33,
    });

    registerModuleSetting(ActorAiOpenAiApi.presencePenaltyKey, { group: "llm", provider: LlmProviders.OPENAI }, {
      name: "AActors.Settings.OpenAI.presencePenalty.Name",
      hint: "AActors.Settings.OpenAI.presencePenalty.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: Number,
      default: 0.33,
    });

    registerModuleSetting(ActorAiOpenAiApi.topPKey, { group: "llm", provider: LlmProviders.OPENAI }, {
      name: "AActors.Settings.OpenAI.topP.Name",
      hint: "AActors.Settings.OpenAI.topP.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: Number,
      default: 0.3,
    });
  }

  static registerSharedLlmSettings() {
    registerModuleSetting(ActorAiOpenAiApi.systemPromptKey, { group: "llm", shared: true }, {
      name: "AActors.Settings.OpenAI.systemPrompt.Name",
      hint: "AActors.Settings.OpenAI.systemPrompt.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: "You are a helpful and creative assistant to the Game Master in 4th Edition Warhammer Fantasy RPG. You help by providing descriptions and basic characteristics for NPCs, places and stories. Use the lore and history of Warhammer Fantasy World and be inspired by other fantasy literature or movies. Use an artistic style based on novels and stories. Do not use calculations and bullet points.",
    });

    registerModuleSetting(ActorAiOpenAiApi.maxTokensKey, { group: "llm", shared: true }, {
      name: "AActors.Settings.OpenAI.maxTokens.Name",
      hint: "AActors.Settings.OpenAI.maxTokens.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: Number,
      default: 8192,
    });

    registerModuleSetting(ActorAiOpenAiApi.temperatureKey, { group: "llm", shared: true }, {
      name: "AActors.Settings.OpenAI.temperature.Name",
      hint: "AActors.Settings.OpenAI.temperature.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: Number,
      default: 1.5,
    });

    registerModuleSetting(ActorAiOpenAiApi.historyLength, { group: "llm", shared: true }, {
      name: "AActors.Settings.OpenAI.historyLength.Name",
      hint: "AActors.Settings.OpenAI.historyLength.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: Number,
      default: 2,
    });
  }

  static registerImageSettings() {
    registerModuleSetting(ActorAiOpenAiApi.imageAdditionalQualitiesKey, { group: "image", shared: true }, {
      name: "AActors.Settings.OpenAI.imageAdditionalQualities.Name",
      hint: "AActors.Settings.OpenAI.imageAdditionalQualities.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: "Photographic, subtle, fantasy setting, oil painting.",
    });
  }

  get initialMessage() {
    return game.i18n.localize("AActors.OpenAI.InitialMessage");
  }

  prepareBasicPrompt() {
    const config = AiSettings.getLlmConfig();
    const data = {
      model: config.model,
      max_tokens: Math.max(game.settings.get(Constants.ID, ActorAiOpenAiApi.maxTokensKey), 8192),
      temperature: game.settings.get(Constants.ID, ActorAiOpenAiApi.temperatureKey),
      messages: [],
    };

    if (config.provider === LlmProviders.OPENAI) {
      data.frequency_penalty = game.settings.get(Constants.ID, ActorAiOpenAiApi.frequencyPenaltyKey);
      data.presence_penalty = game.settings.get(Constants.ID, ActorAiOpenAiApi.presencePenaltyKey);
      data.top_p = game.settings.get(Constants.ID, ActorAiOpenAiApi.topPKey);
      data.response_format = { type: "json_object" };
    }

    if (config.provider === LlmProviders.DEEPSEEK) {
      data.response_format = { type: "json_object" };
    }

    return data;
  }

  async updateInputModelWithImagePrompt(inputModel) {
    const additionalQualities = game.settings.get(Constants.ID, ActorAiOpenAiApi.imageAdditionalQualitiesKey);
    const dalleMessage = game.i18n.localize("AActors.OpenAI.StageImagePrompt").replaceAll("<<additionalImageQualities>>", additionalQualities);
    inputModel.TextPrompt += `\n${dalleMessage}`;
  }

  async generateDescription(postData, inputModel) {
    AiSettings.assertLlmConfigured();
    const systemPrompt = game.settings.get(Constants.ID, ActorAiOpenAiApi.systemPromptKey);
    const technicalPrompt = postData._technicalPrompt;
    const jsonInput = postData._jsonInput;
    delete postData._technicalPrompt;
    delete postData._jsonInput;

    postData.messages = [{
      role: "system",
      content: `${systemPrompt}\n${technicalPrompt}\n${jsonInput}`,
    }];

    return generateLlmJsonCompletion(postData, inputModel);
  }
}
