import AiSettings from "./ai-settings.mjs";
import ImageMidJourneyApi from "./image-mj-api.mjs";
import ImageOpenAiApi from "./image-open-ai-api.mjs";
import ImageOpenRouterApi from "./image-openrouter-api.mjs";

export function getImageApi() {
  return AiSettings.getImageApi();
}

export function isMidjourneyImageApi(api) {
  return api instanceof ImageMidJourneyApi;
}

export { ImageMidJourneyApi, ImageOpenAiApi, ImageOpenRouterApi };
