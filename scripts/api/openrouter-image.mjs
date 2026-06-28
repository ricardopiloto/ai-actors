import AiSettings from "./ai-settings.mjs";

export const OPENROUTER_IMAGES_URL = "https://openrouter.ai/api/v1/images";
export const DEFAULT_OPENROUTER_IMAGE_MODEL = "black-forest-labs/flux.2-pro";

export const OpenRouterSettings = {
  apiKeyKey: "openrouterApiKey",
  modelKey: "openrouterImageModel",
  siteUrlKey: "openrouterSiteUrl",
  appNameKey: "openrouterAppName",
};

export function getOpenRouterCredentials() {
  const apiKey = AiSettings.getStringSetting(OpenRouterSettings.apiKeyKey);
  const model = AiSettings.getStringSetting(OpenRouterSettings.modelKey) || DEFAULT_OPENROUTER_IMAGE_MODEL;
  const siteUrl = AiSettings.getStringSetting(OpenRouterSettings.siteUrlKey);
  const appName = AiSettings.getStringSetting(OpenRouterSettings.appNameKey);

  if (!apiKey) {
    throw new Error(game.i18n.localize("AActors.Errors.OpenRouterConfigMissing"));
  }

  return { apiKey, model, siteUrl, appName };
}

export async function generateOpenRouterImage(prompt) {
  const { apiKey, model, siteUrl, appName } = getOpenRouterCredentials();

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (siteUrl) {
    headers["HTTP-Referer"] = siteUrl;
  }
  if (appName) {
    headers["X-Title"] = appName;
  }

  const response = await fetch(OPENROUTER_IMAGES_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      prompt,
      output_format: "png",
    }),
  });

  if (!response.ok) {
    let details = "";
    try {
      const json = await response.json();
      details = json.error?.message ?? json.error ?? JSON.stringify(json);
    } catch {
      details = await response.text();
    }
    throw new Error(game.i18n.format("AActors.Errors.OpenRouterImageFailed", {
      model,
      details,
    }));
  }

  const result = await response.json();
  const image = result.data?.[0];

  if (!image?.b64_json) {
    throw new Error(game.i18n.format("AActors.Errors.OpenRouterImageFailed", {
      model,
      details: game.i18n.localize("AActors.Errors.OpenRouterImageEmpty"),
    }));
  }

  const mimeType = image.media_type ?? "image/png";

  return {
    imageSrc: `data:${mimeType};base64,${image.b64_json}`,
    imageBase64: image.b64_json,
  };
}
