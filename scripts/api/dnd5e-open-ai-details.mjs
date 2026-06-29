import SystemAdapter from "./system-adapter.mjs";
import {
  CR_AVERAGE_HP,
  matchSrdName,
  normalizeChallengeRating,
  normalizeCreatureType,
  normalizeSize,
  SRD_CHALLENGE_RATINGS,
  SRD_CLASSES,
  SRD_CREATURE_TYPES,
  SRD_FEATS,
  SRD_SKILLS,
} from "./dnd5e-srd.mjs";

const SKILL_KEY_MAP = {
  Acrobatics: "acr",
  "Animal Handling": "ani",
  Arcana: "arc",
  Athletics: "ath",
  Deception: "dec",
  History: "his",
  Insight: "ins",
  Intimidation: "itm",
  Investigation: "inv",
  Medicine: "med",
  Nature: "nat",
  Perception: "prc",
  Performance: "prf",
  Persuasion: "per",
  Religion: "rel",
  "Sleight of Hand": "slt",
  Stealth: "ste",
  Survival: "sur",
};

export default class Dnd5eSystemAdapter extends SystemAdapter {
  get stages() {
    return [
      { stage: "abilityScores", message: game.i18n.localize("AActors.DND5E.StageAbilityScores") },
      { stage: "roleProfile", message: game.i18n.localize("AActors.DND5E.StageRoleProfile") },
      { stage: "featsAndSkills", message: game.i18n.localize("AActors.DND5E.StageFeatsAndSkills") },
    ];
  }

  get inputFields() {
    const crOptions = SRD_CHALLENGE_RATINGS.map((value) => ({
      value,
      label: value,
    }));
    const typeOptions = SRD_CREATURE_TYPES.map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1),
    }));

    return [
      {
        name: "npcType",
        type: "select",
        label: "AActors.DND5E.NpcType",
        default: "character",
        options: [
          { value: "character", label: "AActors.DND5E.NpcTypeCharacter" },
          { value: "creature", label: "AActors.DND5E.NpcTypeCreature" },
        ],
      },
      {
        name: "classLevel",
        type: "number",
        label: "AActors.DND5E.ClassLevel",
        default: "",
        placeholder: "AActors.DND5E.ClassLevelPlaceholder",
        showWhen: { field: "npcType", equals: "character" },
      },
      {
        name: "challengeRating",
        type: "select",
        label: "AActors.DND5E.ChallengeRating",
        default: "1",
        showWhen: { field: "npcType", equals: "creature" },
        options: crOptions,
      },
      {
        name: "creatureType",
        type: "select",
        label: "AActors.DND5E.CreatureType",
        default: "humanoid",
        showWhen: { field: "npcType", equals: "creature" },
        options: typeOptions,
      },
      {
        name: "noOfFeats",
        type: "number",
        label: "AActors.DND5E.NoOfFeats",
        default: 1,
      },
      {
        name: "noOfSkills",
        type: "number",
        label: "AActors.DND5E.NoOfSkills",
        default: 2,
      },
    ];
  }

  async updateStageInputModel(stage, inputModel, actorInput) {
    inputModel.JsonFormat.npc = inputModel.JsonFormat.npc || {};

    if (stage.stage === "abilityScores") {
      inputModel.TextPrompt += `\n${game.i18n.localize("AActors.DND5E.StageAbilityScoresPrompt")}`;
      inputModel.JsonFormat.npc.name = "";
      inputModel.JsonFormat.npc.abilityScores = {
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
      };
      inputModel.JsonFormat.npc.details = {
        race: "Human",
        gender: "",
        age: 35,
        size: "med",
        alignment: "unaligned",
        speed: 30,
      };
    } else if (stage.stage === "roleProfile") {
      if (actorInput.npcType === "creature") {
        inputModel.TextPrompt += `\n${game.i18n.localize("AActors.DND5E.StageCreaturePrompt")}`;
        inputModel.JsonFormat.npc.creature = {
          type: actorInput.creatureType ?? "humanoid",
          challengeRating: actorInput.challengeRating ?? "1",
          armorClass: 12,
          hitPoints: CR_AVERAGE_HP[actorInput.challengeRating ?? "1"] ?? 22,
        };
      } else {
        const classLevel = Dnd5eSystemAdapter.#resolveClassLevel(actorInput);
        actorInput.classLevel = classLevel;
        inputModel.TextPrompt += `\n${game.i18n.localize("AActors.DND5E.StageClassPrompt")
          .replaceAll("<<classList>>", SRD_CLASSES.join(", "))
          .replaceAll("<<classLevel>>", String(classLevel))}`;
        inputModel.JsonFormat.npc.character = {
          class: "Fighter",
          level: classLevel,
        };
      }
    } else if (stage.stage === "featsAndSkills") {
      inputModel.TextPrompt += `\n${game.i18n.localize("AActors.DND5E.StageFeatsAndSkillsPrompt")
        .replaceAll("<<noOfFeats>>", String(actorInput.noOfFeats ?? 1))
        .replaceAll("<<noOfSkills>>", String(actorInput.noOfSkills ?? 2))
        .replaceAll("<<featList>>", SRD_FEATS.join(", "))
        .replaceAll("<<skillList>>", SRD_SKILLS.join(", "))}`;
      inputModel.JsonFormat.npc.feats = ["Alert"];
      inputModel.JsonFormat.npc.skills = ["Perception", "Insight"];
    }
  }

  async normalizeResponse(actorInput) {
    const npc = actorInput.npc ?? {};
    actorInput.npc = npc;

    const scores = npc.abilityScores ?? {};
    const roll = () => Math.floor(Math.random() * 3) - 1;

    for (const key of ["str", "dex", "con", "int", "wis", "cha"]) {
      const base = Number(scores[key] ?? 10);
      scores[key] = Math.max(3, Math.min(20, base + roll()));
    }
    npc.abilityScores = scores;

    if (npc.details) {
      npc.details.size = normalizeSize(npc.details.size);
      if (parseInt(npc.details.age)) {
        npc.details.age = Math.floor(Math.random() * 10 - 5) + parseInt(npc.details.age);
      }
    }

    if (actorInput.npcType === "creature" || npc.creature) {
      npc.creature ??= {};
      npc.creature.type = normalizeCreatureType(npc.creature.type ?? actorInput.creatureType);
      npc.creature.challengeRating = normalizeChallengeRating(
        npc.creature.challengeRating ?? actorInput.challengeRating,
      );
      npc.creature.armorClass = Math.max(8, Number(npc.creature.armorClass ?? 12));
      const crHp = CR_AVERAGE_HP[npc.creature.challengeRating] ?? 22;
      npc.creature.hitPoints = Math.max(1, Number(npc.creature.hitPoints ?? crHp));
    }

    if (actorInput.npcType === "character" || npc.character) {
      npc.character ??= {};
      npc.character.class = matchSrdName(npc.character.class, SRD_CLASSES) ?? "Fighter";
      const fallbackLevel = Dnd5eSystemAdapter.#resolveClassLevel(actorInput);
      npc.character.level = Math.max(1, Math.min(20, Number(npc.character.level ?? fallbackLevel)));
    }

    const originalFeats = [...(npc.feats ?? [])];
    npc.feats = [];
    for (const feat of originalFeats) {
      const name = typeof feat === "string" ? feat : feat?.name;
      const matched = matchSrdName(name, SRD_FEATS);
      if (matched) npc.feats.push(matched);
    }

    const originalSkills = [...(npc.skills ?? [])];
    npc.skills = [];
    for (const skill of originalSkills) {
      const name = typeof skill === "string" ? skill : skill?.name;
      const matched = matchSrdName(name, SRD_SKILLS);
      if (matched) npc.skills.push(matched);
    }
  }

  prettyPrintNpc(actorInput) {
    const npc = actorInput.npc ?? {};
    const scores = npc.abilityScores ?? {};
    let html = `<h1>${npc.name ?? ""}</h1><hr>`;

    html += `<div class="ability-block"><table border="1"><tbody>`;
    html += `<tr>${["STR", "DEX", "CON", "INT", "WIS", "CHA"].map((label) =>
      `<td style="text-align:center;width:60px">${label}</td>`).join("")}</tr>`;
    html += `<tr>${["str", "dex", "con", "int", "wis", "cha"].map((key) =>
      `<td style="text-align:center">${scores[key] ?? ""}</td>`).join("")}</tr>`;
    html += `</tbody></table></div><hr>`;

    html += `<p><strong>${game.i18n.localize("AActors.DND5E.Race")}:</strong> ${npc.details?.race ?? ""}, `;
    html += `<strong>${game.i18n.localize("AActors.DND5E.Gender")}:</strong> ${npc.details?.gender ?? ""}, `;
    html += `<strong>${game.i18n.localize("AActors.DND5E.Age")}:</strong> ${npc.details?.age ?? ""}</p>`;

    if (actorInput.npcType === "creature" && npc.creature) {
      html += `<p><strong>${game.i18n.localize("AActors.DND5E.CreatureType")}:</strong> ${npc.creature.type}, `;
      html += `<strong>${game.i18n.localize("AActors.DND5E.ChallengeRating")}:</strong> ${npc.creature.challengeRating}, `;
      html += `<strong>${game.i18n.localize("AActors.DND5E.ArmorClass")}:</strong> ${npc.creature.armorClass}, `;
      html += `<strong>${game.i18n.localize("AActors.DND5E.HitPoints")}:</strong> ${npc.creature.hitPoints}</p>`;
    } else if (npc.character) {
      html += `<p><strong>${game.i18n.localize("AActors.DND5E.Class")}:</strong> ${npc.character.class} `;
      html += `<strong>${game.i18n.localize("AActors.DND5E.Level")}:</strong> ${npc.character.level}</p>`;
    }

    html += `<p><strong>${game.i18n.localize("AActors.DND5E.Description")}:</strong></p>`;
    for (const key of ["appearance", "personality", "biography", "motivations", "specificTraits"]) {
      if (actorInput.description?.[key]) {
        html += `<p>${actorInput.description[key]}</p><hr>`;
      }
    }

    if (npc.feats?.length) {
      html += `<p><strong>${game.i18n.localize("AActors.DND5E.Feats")}:</strong><ul>`;
      for (const feat of npc.feats) html += `<li>${feat}</li>`;
      html += `</ul></p>`;
    }

    if (npc.skills?.length) {
      html += `<p><strong>${game.i18n.localize("AActors.DND5E.Skills")}:</strong><ul>`;
      for (const skill of npc.skills) html += `<li>${skill}</li>`;
      html += `</ul></p>`;
    }

    return html;
  }

  async prepareActorData(actorInput) {
    const npc = actorInput.npc ?? {};
    const model = game.model?.Actor?.npc ?? game.model?.Actor?.character ?? {};
    const system = foundry.utils.duplicate(model);
    const scores = npc.abilityScores ?? {};

    Dnd5eSystemAdapter.#ensureAbility(system, "str", scores.str);
    Dnd5eSystemAdapter.#ensureAbility(system, "dex", scores.dex);
    Dnd5eSystemAdapter.#ensureAbility(system, "con", scores.con);
    Dnd5eSystemAdapter.#ensureAbility(system, "int", scores.int);
    Dnd5eSystemAdapter.#ensureAbility(system, "wis", scores.wis);
    Dnd5eSystemAdapter.#ensureAbility(system, "cha", scores.cha);

    system.attributes ??= {};
    system.attributes.movement ??= { walk: 30, units: "ft" };
    system.attributes.movement.walk = Number(npc.details?.speed ?? 30);

    system.traits ??= {};
    system.traits.size = normalizeSize(npc.details?.size);

    system.details ??= {};
    system.details.race = npc.details?.race ?? "";
    system.details.alignment = npc.details?.alignment ?? "unaligned";
    system.details.type ??= { value: "humanoid", subtype: "", swarm: "", custom: "" };

    if (actorInput.npcType === "creature" && npc.creature) {
      system.details.type.value = npc.creature.type;
      system.details.cr = Dnd5eSystemAdapter.#crToNumber(npc.creature.challengeRating);
      system.attributes.ac ??= { flat: null, calc: "default", formula: "" };
      system.attributes.ac.flat = Number(npc.creature.armorClass ?? 12);
      system.attributes.hp ??= { value: 10, max: 10, temp: 0, tempmax: 0, formula: "" };
      system.attributes.hp.max = Number(npc.creature.hitPoints ?? 10);
      system.attributes.hp.value = system.attributes.hp.max;
    } else if (npc.character) {
      const level = Number(npc.character.level ?? 1);
      const conMod = Dnd5eSystemAdapter.#abilityMod(scores.con);
      const hitDie = Dnd5eSystemAdapter.#hitDieForClass(npc.character.class);
      const hp = hitDie + conMod + Math.max(0, level - 1) * (Math.floor(hitDie / 2) + 1 + conMod);
      system.attributes.hp ??= { value: hp, max: hp, temp: 0, tempmax: 0, formula: "" };
      system.attributes.hp.max = Math.max(1, hp);
      system.attributes.hp.value = system.attributes.hp.max;
      system.details.cr = level;
    }

    const biography = [
      actorInput.description?.appearance,
      actorInput.description?.personality,
      actorInput.description?.biography,
      actorInput.description?.motivations,
      actorInput.description?.specificTraits,
    ]
      .filter(Boolean)
      .map((paragraph) => `<p>${paragraph}</p>`)
      .join("<hr>");

    system.details.biography ??= { value: "", public: "" };
    system.details.biography.value = biography;

    Dnd5eSystemAdapter.#applySkillProficiencies(system, npc.skills ?? []);

    return {
      name: npc.name ?? "Unnamed NPC",
      type: "npc",
      system,
    };
  }

  async prepareActorItemsData(actorInput) {
    const npc = actorInput.npc ?? {};
    const items = [];

    if (actorInput.npcType !== "creature" && npc.character?.class) {
      items.push(Dnd5eSystemAdapter.#createClassItem(npc.character.class, npc.character.level));
    }

    for (const featName of npc.feats ?? []) {
      items.push(Dnd5eSystemAdapter.#createFeatItem(featName));
    }

    return items;
  }

  static #ensureAbility(system, key, value) {
    system.abilities ??= {};
    system.abilities[key] ??= { value: 10, proficient: 0, max: 10, bonuses: { check: "", save: "" } };
    system.abilities[key].value = Number(value ?? 10);
    system.abilities[key].max = system.abilities[key].value;
  }

  static #abilityMod(score) {
    return Math.floor((Number(score ?? 10) - 10) / 2);
  }

  static #hitDieForClass(className) {
    const d10 = ["Fighter", "Paladin", "Ranger"];
    const d8 = ["Cleric", "Druid", "Monk", "Rogue", "Bard", "Warlock"];
    const d6 = ["Wizard", "Sorcerer"];
    if (d10.includes(className)) return 10;
    if (d8.includes(className)) return 8;
    if (d6.includes(className)) return 6;
    return 8;
  }

  static #crToNumber(cr) {
    if (cr === "1/8") return 0.125;
    if (cr === "1/4") return 0.25;
    if (cr === "1/2") return 0.5;
    const num = parseFloat(cr);
    return Number.isFinite(num) ? num : 1;
  }

  static #applySkillProficiencies(system, skillNames) {
    system.skills ??= {};
    for (const skillName of skillNames) {
      const key = SKILL_KEY_MAP[skillName];
      if (!key) continue;
      system.skills[key] ??= { value: 1, ability: "dex", bonuses: { check: "", passive: "" } };
      system.skills[key].value = 1;
    }
  }

  static #createClassItem(className, level) {
    if (game.model?.Item?.class) {
      const system = foundry.utils.duplicate(game.model.Item.class);
      if (system.levels != null) system.levels = Number(level ?? 1);
      return {
        name: className,
        type: "class",
        img: "icons/svg/item-bag.svg",
        system,
      };
    }
    return {
      name: className,
      type: "class",
      img: "icons/svg/item-bag.svg",
      system: { levels: Number(level ?? 1) },
    };
  }

  static #createFeatItem(name) {
    if (game.model?.Item?.feat) {
      return {
        name,
        type: "feat",
        img: "icons/svg/item-bag.svg",
        system: foundry.utils.duplicate(game.model.Item.feat),
      };
    }
    return { name, type: "feat", img: "icons/svg/item-bag.svg" };
  }

  /** @param {string} text */
  static #parseLevelFromDescription(text = "") {
    const patterns = [
      /\blevel\s*[:=]?\s*(\d{1,2})\b/i,
      /\blvl\.?\s*[:=]?\s*(\d{1,2})\b/i,
      /\b(\d{1,2})(?:st|nd|rd|th)\s*level\b/i,
      /\bn[ií]vel\s*[:=]?\s*(\d{1,2})\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match) continue;
      const level = parseInt(match[1], 10);
      if (level >= 1 && level <= 20) return level;
    }

    return null;
  }

  /**
   * Level from description, else explicit form value, else 1.
   * @param {object} actorInput
   * @returns {number}
   */
  static #resolveClassLevel(actorInput) {
    const fromDescription = Dnd5eSystemAdapter.#parseLevelFromDescription(actorInput.textInput ?? "");
    if (fromDescription != null) return fromDescription;

    const fromForm = Number(actorInput.classLevel);
    if (Number.isFinite(fromForm) && fromForm >= 1 && fromForm <= 20) {
      return Math.floor(fromForm);
    }

    return 1;
  }
}
