/** @returns {boolean} */
export function isV13Plus() {
  return foundry.utils.isNewerVersion(game.version ?? "0", "12.999");
}

/**
 * Bind a delegated click listener on a root element (HTMLElement or legacy jQuery).
 * @param {HTMLElement | JQuery} root
 * @param {string} selector
 * @param {(event: Event, target: Element) => void | Promise<void>} handler
 */
export function onClick(root, selector, handler) {
  const element = root instanceof HTMLElement ? root : root?.[0] ?? root?.get?.(0);
  if (!element) return;

  element.addEventListener("click", (event) => {
    const target = event.target.closest(selector);
    if (!target || !element.contains(target)) return;
    handler(event, target);
  });
}

/**
 * @param {HTMLElement | JQuery} root
 * @param {string} selector
 * @returns {Element | null}
 */
export function querySelector(root, selector) {
  const element = root instanceof HTMLElement ? root : root?.[0] ?? root?.get?.(0);
  return element?.querySelector(selector) ?? null;
}

/**
 * @param {HTMLElement | JQuery} root
 * @param {string} selector
 * @returns {Element[]}
 */
export function querySelectorAll(root, selector) {
  const element = root instanceof HTMLElement ? root : root?.[0] ?? root?.get?.(0);
  return element ? [...element.querySelectorAll(selector)] : [];
}

/**
 * @param {string} type WFRP item type, e.g. "career" or "talent"
 * @returns {Promise<object[]>}
 */
export async function findWfrpItems(type) {
  const utility = game.wfrp4e?.utility ?? globalThis.warhammer?.utility;
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

/** @returns {object | undefined} */
export function getWfrpUtility() {
  return game.wfrp4e?.utility ?? globalThis.warhammer?.utility;
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
 * Resolve a display species string to WFRP4e config keys.
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

/**
 * Basic skills and currency items added to new WFRP4e actors (matches getInitialItems without prompt).
 * @returns {Promise<object[]>}
 */
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

/**
 * @returns {{ name: string, value: string }[]}
 */
export function getActorFolders() {
  const folders = [];
  const stack = [...game.folders.filter((folder) => folder.type === "Actor" && folder.depth === 1)];

  while (stack.length > 0) {
    const folder = stack.pop();
    const depthString = "-- ".repeat(Math.max(0, folder.depth - 1));
    folders.push({ name: depthString + folder.name, value: folder.id });

    if (folder.children?.length > 0) {
      stack.push(...folder.children.map((child) => child.folder ?? child));
    }
  }

  return Array.from(new Map(folders.map((option) => [option.value, option])).values());
}
