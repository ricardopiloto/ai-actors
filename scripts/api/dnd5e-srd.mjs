/** SRD-only reference lists — no compendium lookup. */

export const SRD_CLASSES = [
  "Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk",
  "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard",
];

export const SRD_SKILLS = [
  "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
  "History", "Insight", "Intimidation", "Investigation", "Medicine",
  "Nature", "Perception", "Performance", "Persuasion", "Religion",
  "Sleight of Hand", "Stealth", "Survival",
];

export const SRD_FEATS = [
  "Alert", "Archery", "Athlete", "Actor", "Charger", "Crossbow Expert",
  "Defensive Duelist", "Dual Wielder", "Dungeon Delver", "Durable",
  "Elemental Adept", "Grappler", "Great Weapon Master", "Healer",
  "Heavily Armored", "Heavy Armor Master", "Inspiring Leader", "Keen Mind",
  "Lightly Armored", "Linguist", "Lucky", "Mage Slayer", "Magic Initiate",
  "Martial Adept", "Medium Armor Master", "Mobile", "Mounted Combatant",
  "Observant", "Polearm Master", "Resilient", "Ritual Caster",
  "Savage Attacker", "Sentinel", "Sharpshooter", "Shield Master", "Skilled",
  "Skulker", "Spell Sniper", "Tavern Brawler", "Tough", "War Caster",
  "Weapon Master",
];

export const SRD_CREATURE_TYPES = [
  "aberration", "beast", "celestial", "construct", "dragon", "elemental",
  "fey", "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead",
];

export const SRD_CHALLENGE_RATINGS = [
  "0", "1/8", "1/4", "1/2", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22",
  "23", "24", "25", "26", "27", "28", "29", "30",
];

export const SRD_SIZES = ["tiny", "sm", "med", "lg", "huge", "grg"];

/** Approximate average HP by CR (DMG-style simplification). */
export const CR_AVERAGE_HP = {
  "0": 4, "1/8": 7, "1/4": 11, "1/2": 16,
  "1": 22, "2": 32, "3": 45, "4": 62, "5": 84,
  "6": 112, "7": 146, "8": 186, "9": 232, "10": 284,
  "11": 342, "12": 406, "13": 476, "14": 552, "15": 634,
  "16": 722, "17": 816, "18": 916, "19": 1022, "20": 1134,
};

/**
 * @param {string} name
 * @param {string[]} list
 * @returns {string|null}
 */
export function matchSrdName(name, list) {
  if (name == null) return null;
  const query = String(name).trim();
  if (!query) return null;

  const queryLower = query.toLowerCase();
  const exact = list.find((entry) => entry.toLowerCase() === queryLower);
  if (exact) return exact;

  const partial = list.find((entry) => entry.toLowerCase().includes(queryLower)
    || queryLower.includes(entry.toLowerCase()));
  return partial ?? null;
}

/**
 * @param {string} cr
 * @returns {string}
 */
export function normalizeChallengeRating(cr) {
  const text = String(cr ?? "1").trim();
  if (SRD_CHALLENGE_RATINGS.includes(text)) return text;
  const num = parseFloat(text);
  if (Number.isFinite(num) && num >= 0 && num <= 30) {
    return String(Math.floor(num));
  }
  return "1";
}

/**
 * @param {string} type
 * @returns {string}
 */
export function normalizeCreatureType(type) {
  const text = String(type ?? "humanoid").trim().toLowerCase();
  return SRD_CREATURE_TYPES.find((entry) => entry === text) ?? "humanoid";
}

/**
 * @param {string} size
 * @returns {string}
 */
export function normalizeSize(size) {
  const text = String(size ?? "med").trim().toLowerCase();
  if (SRD_SIZES.includes(text)) return text;
  const aliases = {
    small: "sm", medium: "med", large: "lg", gargantuan: "grg",
  };
  return aliases[text] ?? "med";
}
