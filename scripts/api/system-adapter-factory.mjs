import WfrpSystemAdapter from "./wfrp-open-ai-details.mjs";
import Dnd5eSystemAdapter from "./dnd5e-open-ai-details.mjs";

const ADAPTERS = {
  wfrp4e: WfrpSystemAdapter,
  dnd5e: Dnd5eSystemAdapter,
};

export function isSystemSupported() {
  return game.system.id in ADAPTERS;
}

export function getSystemAdapter() {
  const AdapterClass = ADAPTERS[game.system.id];
  if (!AdapterClass) {
    throw new Error(
      game.i18n.format("AActors.Errors.UnsupportedSystem", { system: game.system.id }),
    );
  }
  return new AdapterClass();
}
