/** @returns {object | undefined} */
export function getWfrpUtility() {
  return game.wfrp4e?.utility ?? globalThis.warhammer?.utility;
}

/**
 * @param {string} type WFRP item type, e.g. "career" or "talent"
 * @returns {Promise<object[]>}
 */
export async function findWfrpItems(type) {
  const utility = getWfrpUtility();
  if (!utility) {
    ui.notifications.error("WFRP4e system is required for AI NPC generation.");
    return [];
  }

  if (typeof utility.findAllItems === "function") {
    if (type === "career") {
      return utility.findAllItems(type, null, true, [
        "system.careergroup.value",
        "system.level.value",
        "system.class.value",
      ]);
    }
    return utility.findAllItems(type);
  }

  if (typeof utility.findAll === "function") {
    return utility.findAll(type);
  }

  return game.items.filter((item) => item.type === type).map((item) => ({
    name: item.name,
    uuid: item.uuid,
    flags: item.flags,
  }));
}

/**
 * @param {string} name
 * @returns {Promise<object|null>}
 */
export async function findWfrpCareer(name) {
  const utility = getWfrpUtility();
  if (!utility?.findItem) return null;
  return (await utility.findItem(name, "career")) ?? null;
}

/**
 * @param {string} name
 * @returns {Promise<object|null>}
 */
export async function findWfrpTalent(name) {
  const utility = getWfrpUtility();
  if (!utility?.findTalent) return null;
  try {
    return await utility.findTalent(name);
  } catch {
    return null;
  }
}

/**
 * @param {string} speciesString e.g. "Human" or "Dwarf (Karak Azul)"
 * @returns {{ speciesKey: string, subspeciesKey: string }}
 */
export function resolveWfrpSpecies(speciesString = "") {
  const utility = getWfrpUtility();
  let species = speciesString.trim();
  let subspecies = "";
  const match = species.match(/^(.+?)\s*\((.+)\)\s*$/);

  if (match) {
    species = match[1].trim();
    subspecies = match[2].trim();
  }

  const speciesKey = utility?.findKey?.(species, game.wfrp4e.config.species) ?? species;
  let subspeciesKey = "";

  if (subspecies && game.wfrp4e.config.subspecies?.[speciesKey]) {
    for (const key of Object.keys(game.wfrp4e.config.subspecies[speciesKey])) {
      if (game.wfrp4e.config.subspecies[speciesKey][key].name === subspecies) {
        subspeciesKey = key;
        break;
      }
    }
    if (!subspeciesKey) {
      subspeciesKey = subspecies;
    }
  }

  return { speciesKey, subspeciesKey };
}

/** @returns {Promise<object[]>} */
export async function getWfrpNpcInitialItems() {
  const utility = getWfrpUtility();
  if (!utility) {
    return [];
  }

  const basicSkills = await utility.allBasicSkills() ?? [];
  const moneyItems = (await utility.allMoneyItems() ?? [])
    .map((item) => {
      foundry.utils.setProperty(item, "system.quantity.value", 0);
      return item;
    })
    .sort((a, b) => ((a.system.coinValue?.value ?? 0) >= (b.system.coinValue?.value ?? 0) ? -1 : 1));

  return basicSkills.concat(moneyItems);
}
