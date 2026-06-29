import AiSettings from "./ai-settings.mjs";
import ImageOpenAiApi from "./image-open-ai-api.mjs";
import ImageOpenRouterApi from "./image-openrouter-api.mjs";

export function getImageApi() {
  return AiSettings.getImageApi();
}

export { ImageOpenAiApi, ImageOpenRouterApi };
