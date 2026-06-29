import { Constants } from "../constants.mjs";
import {
  DEFAULT_OPENROUTER_IMAGE_MODEL,
  generateOpenRouterImage,
  OpenRouterSettings,
} from "./openrouter-image.mjs";
import { prepareImagePromptForGeneration } from "./image-prompt-validator.mjs";
import { ImageProviders } from "./providers.mjs";
import { registerModuleSetting } from "./settings-ui.mjs";

export default class ImageOpenRouterApi {
  static apiKeyKey = OpenRouterSettings.apiKeyKey;
  static modelKey = OpenRouterSettings.modelKey;
  static siteUrlKey = OpenRouterSettings.siteUrlKey;
  static appNameKey = OpenRouterSettings.appNameKey;

  static registerSettings() {
    registerModuleSetting(ImageOpenRouterApi.apiKeyKey, { group: "image", provider: ImageProviders.OPENROUTER }, {
      name: "AActors.Settings.Image.openrouterApiKey.Name",
      hint: "AActors.Settings.Image.openrouterApiKey.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: "",
    });

    registerModuleSetting(ImageOpenRouterApi.modelKey, { group: "image", provider: ImageProviders.OPENROUTER }, {
      name: "AActors.Settings.Image.openrouterImageModel.Name",
      hint: "AActors.Settings.Image.openrouterImageModel.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: DEFAULT_OPENROUTER_IMAGE_MODEL,
    });

    registerModuleSetting(ImageOpenRouterApi.siteUrlKey, { group: "image", provider: ImageProviders.OPENROUTER }, {
      name: "AActors.Settings.Image.openrouterSiteUrl.Name",
      hint: "AActors.Settings.Image.openrouterSiteUrl.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: "",
    });

    registerModuleSetting(ImageOpenRouterApi.appNameKey, { group: "image", provider: ImageProviders.OPENROUTER }, {
      name: "AActors.Settings.Image.openrouterAppName.Name",
      hint: "AActors.Settings.Image.openrouterAppName.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: "AI Generated NPCs",
    });
  }

  get imageHtml() {
    return `<div contenteditable class="ai-image" style="text-align: center;"><img class="actor-ai-img-gen" src=<<img>> style="border: none;"></div><div><button class='ai-image-copy'>${game.i18n.localize("AActors.General.CopyToClipboard")}</button></div><div><button class='ai-image-save'>${game.i18n.localize("AActors.General.SaveImage")}</button></div>`;
  }

  async generateImage(prompt, actorInput) {
    const safePrompt = await prepareImagePromptForGeneration(prompt);
    if (actorInput) {
      actorInput.imagePrompt = safePrompt;
    }
    const result = await generateOpenRouterImage(safePrompt);
    actorInput.imageSrc = result.imageSrc;
    actorInput.imageBase64 = result.imageBase64;
  }
}
