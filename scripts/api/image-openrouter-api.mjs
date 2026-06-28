import { Constants } from "../constants.mjs";
import {
  DEFAULT_OPENROUTER_IMAGE_MODEL,
  generateOpenRouterImage,
  OpenRouterSettings,
} from "./openrouter-image.mjs";

export default class ImageOpenRouterApi {
  static apiKeyKey = OpenRouterSettings.apiKeyKey;
  static modelKey = OpenRouterSettings.modelKey;
  static siteUrlKey = OpenRouterSettings.siteUrlKey;
  static appNameKey = OpenRouterSettings.appNameKey;

  static registerSettings() {
    game.settings.register(Constants.ID, ImageOpenRouterApi.apiKeyKey, {
      name: "AActors.Settings.Image.openrouterApiKey.Name",
      hint: "AActors.Settings.Image.openrouterApiKey.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: "",
    });

    game.settings.register(Constants.ID, ImageOpenRouterApi.modelKey, {
      name: "AActors.Settings.Image.openrouterImageModel.Name",
      hint: "AActors.Settings.Image.openrouterImageModel.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: DEFAULT_OPENROUTER_IMAGE_MODEL,
    });

    game.settings.register(Constants.ID, ImageOpenRouterApi.siteUrlKey, {
      name: "AActors.Settings.Image.openrouterSiteUrl.Name",
      hint: "AActors.Settings.Image.openrouterSiteUrl.Hint",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: "",
    });

    game.settings.register(Constants.ID, ImageOpenRouterApi.appNameKey, {
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
    const result = await generateOpenRouterImage(prompt);
    actorInput.imageSrc = result.imageSrc;
    actorInput.imageBase64 = result.imageBase64;
  }
}
