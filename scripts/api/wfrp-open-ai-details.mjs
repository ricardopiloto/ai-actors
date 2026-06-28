import InputModel from "../model/input-model.mjs";
import { findWfrpItems, getWfrpNpcInitialItems, getWfrpUtility, resolveWfrpSpecies } from "../compat.mjs";

export default class WfrpOpenAiDetailsApi {
  
  static careers = null;
  static talents = null;

  get stages() {
    return [
      {stage: "characteristics", message: game.i18n.localize("AActors.WFRP.StageCharacteristics")},
      {stage: "careers", message: game.i18n.localize("AActors.WFRP.StageCareers")},
      {stage: "talents", message: game.i18n.localize("AActors.WFRP.StageTalents")}
    ];
  }

  async updateStageInputModel(stage, inputModel, actorInput) {
    if (WfrpOpenAiDetailsApi.careers === null) {
      WfrpOpenAiDetailsApi.careers = await findWfrpItems("career");
    }
    if (WfrpOpenAiDetailsApi.talents === null) {
      WfrpOpenAiDetailsApi.talents = await findWfrpItems("talent");
    }

    if (stage.stage === "characteristics") { 
      const statisticsQuery = game.i18n.localize("AActors.WFRP.StageCharacteristicsPrompt");
      inputModel.TextPrompt += "\n" + statisticsQuery;
      inputModel.JsonFormat.npc = inputModel.JsonFormat.npc || {};
      inputModel.JsonFormat.npc.characteristics = inputModel.JsonFormat.npc.characteristics || {};
      inputModel.JsonFormat.npc.characteristics.weaponSkill = 0;
      inputModel.JsonFormat.npc.characteristics.ballisticSkill = 0;
      inputModel.JsonFormat.npc.characteristics.strength = 0;
      inputModel.JsonFormat.npc.characteristics.toughness = 0;
      inputModel.JsonFormat.npc.characteristics.initiative = 0;
      inputModel.JsonFormat.npc.characteristics.agility = 0;
      inputModel.JsonFormat.npc.characteristics.dexterity = 0;
      inputModel.JsonFormat.npc.characteristics.intelligence = 0;
      inputModel.JsonFormat.npc.characteristics.willPower = 0;
      inputModel.JsonFormat.npc.characteristics.fellowship = 0;
      inputModel.JsonFormat.npc.name = "";
      inputModel.JsonFormat.npc.details = inputModel.JsonFormat.npc.details || {};
      inputModel.JsonFormat.npc.details.species = "";
      inputModel.JsonFormat.npc.details.gender = "";
      inputModel.JsonFormat.npc.details.age = "";
      inputModel.JsonFormat.npc.details.height = "";
      inputModel.JsonFormat.npc.details.weight = "";
      inputModel.JsonFormat.npc.details.hair = "";
      inputModel.JsonFormat.npc.details.eyes = "";
    } else if (stage.stage === "careers") {
      const careersMessage = game.i18n.localize("AActors.WFRP.StageCareersPrompt").replaceAll('<<noOfCareers>>', actorInput.noOfCareers);
      inputModel.TextPrompt += "\n" + careersMessage;
      inputModel.JsonFormat.npc = inputModel.JsonFormat.npc || {};
      inputModel.JsonFormat.npc.careers = ["career name"];
    } else if (stage.stage === "talents") {
      const talentsMessage = game.i18n.localize("AActors.WFRP.StageTalentsPrompt").replaceAll('<<noOfTalents>>', actorInput.noOfTalents);
      inputModel.TextPrompt += "\n" + talentsMessage;
      inputModel.JsonFormat.npc = inputModel.JsonFormat.npc || {};
      inputModel.JsonFormat.npc.talents = ["talent name"];
    }
  }

  async normalizeResponse(actorInput) {
    let npc = actorInput.npc;
    let originalCareers = foundry.utils.deepClone(npc.careers) ?? [];
    npc.careers = [];
    let originalTalents = foundry.utils.deepClone(npc.talents) ?? [];
    npc.talents = [];

    let modifier = 'Math.floor(Math.random() * 20)';
    
    npc.characteristics.weaponSkill = eval(modifier) + Number(npc.characteristics.weaponSkill);
    npc.characteristics.ballisticSkill = eval(modifier) + Number(npc.characteristics.ballisticSkill);
    npc.characteristics.strength = eval(modifier) + Number(npc.characteristics.strength);
    npc.characteristics.toughness = eval(modifier) + Number(npc.characteristics.toughness);
    npc.characteristics.initiative = eval(modifier) + Number(npc.characteristics.initiative);
    npc.characteristics.agility = eval(modifier) + Number(npc.characteristics.agility);
    npc.characteristics.dexterity = eval(modifier) + Number(npc.characteristics.dexterity);
    npc.characteristics.intelligence = eval(modifier) + Number(npc.characteristics.intelligence);
    npc.characteristics.willPower = eval(modifier) + Number(npc.characteristics.willPower);
    npc.characteristics.fellowship = eval(modifier) + Number(npc.characteristics.fellowship);

    if (parseInt(npc.details.height)) {
      npc.details.height = Math.floor(Math.random() * 20 - 10) + parseInt(npc.details.height) + " cm"
    }
    if (parseInt(npc.details.weight)) {
      npc.details.weight = Math.floor(Math.random() * 20 - 10) + parseInt(npc.details.weight) + " kg"
    }
    if (parseInt(npc.details.age)) {
      npc.details.age = Math.floor(Math.random() * 20 - 10) + parseInt(npc.details.age);
    }

    for (let career of originalCareers) {
      const match = WfrpOpenAiDetailsApi.#resolveCareerMatch(WfrpOpenAiDetailsApi.careers, career);
      if (match) {
        npc.careers.push(match);
      } else {
        npc.careers.push({ name: career, uuid: null, originalName: career });
      }
    }

    for (let talent of originalTalents) {
      const match = WfrpOpenAiDetailsApi.#resolveTalentMatch(WfrpOpenAiDetailsApi.talents, talent);
      if (match) {
        npc.talents.push(match);
      } else {
        npc.talents.push({ name: talent, uuid: null, originalName: talent });
      }
    }
  }

  prettyPrintNpc(actorInput) {
    let npc = actorInput.npc;
    let html = ``;
    html += `<h1>${npc.name}</h1>`;
    html += `<hr>`;
    html += `
    <div class="ability-block">
        <table style="height:34px" border="1">
            <tbody>
                <tr style="height:17px">
                    <td style="height:17px;width:60px;text-align:center">${game.i18n.localize("AActors.WFRP.WS")}</td>
                    <td style="height:17px;width:60px;text-align:center">${game.i18n.localize("AActors.WFRP.BS")}</td>
                    <td style="height:17px;width:60px;text-align:center">${game.i18n.localize("AActors.WFRP.S")}</td>
                    <td style="height:17px;width:61px;text-align:center">${game.i18n.localize("AActors.WFRP.T")}</td>
                    <td style="height:17px;width:61px;text-align:center">${game.i18n.localize("AActors.WFRP.I")}</td>
                    <td style="height:17px;width:61px;text-align:center">${game.i18n.localize("AActors.WFRP.Ag")}</td>
                    <td style="height:17px;width:61px;text-align:center">${game.i18n.localize("AActors.WFRP.Dex")}</td>
                    <td style="height:17px;width:61px;text-align:center">${game.i18n.localize("AActors.WFRP.Int")}</td>
                    <td style="height:17px;width:61px;text-align:center">${game.i18n.localize("AActors.WFRP.WP")}</td>
                    <td style="height:17px;width:61px;text-align:center">${game.i18n.localize("AActors.WFRP.Fel")}</td>
                </tr>
                    <tr style="height:17px">                        
                    <td style="height:17px;width:60px;text-align:center">${npc.characteristics?.weaponSkill}</td>
                    <td style="height:17px;width:60px;text-align:center">${npc.characteristics?.ballisticSkill}</td>
                    <td style="height:17px;width:61px;text-align:center">${npc.characteristics?.strength}</td>
                    <td style="height:17px;width:61px;text-align:center">${npc.characteristics?.toughness}</td>
                    <td style="height:17px;width:61px;text-align:center">${npc.characteristics?.initiative}</td>
                    <td style="height:17px;width:61px;text-align:center">${npc.characteristics?.agility}</td>
                    <td style="height:17px;width:61px;text-align:center">${npc.characteristics?.dexterity}</td>
                    <td style="height:17px;width:61px;text-align:center">${npc.characteristics?.intelligence}</td>
                    <td style="height:17px;width:61px;text-align:center">${npc.characteristics?.willPower}</td>
                    <td style="height:17px;width:60px;text-align:center">${npc.characteristics?.fellowship}</td>
                </tr>
            </tbody>
        </table>
    </div>
    <hr>
    `;

    html += `<p><strong>${game.i18n.localize("AActors.WFRP.Species")}:</strong> ${npc.details.species}, <strong>${game.i18n.localize("AActors.WFRP.Gender")}:</strong> ${npc.details.gender}</strong>, <strong>${game.i18n.localize("AActors.WFRP.Age")}:</strong> ${npc.details.age}</p>`;
    html += `<p><strong>${game.i18n.localize("AActors.WFRP.Height")}:</strong> ${npc.details.height}, <strong>${game.i18n.localize("AActors.WFRP.Weight")}:</strong> ${npc.details.weight} <strong>${game.i18n.localize("AActors.WFRP.Eyes")}:</strong> ${npc.details.eyes}, <strong>${game.i18n.localize("AActors.WFRP.Hair")}:</strong> ${npc.details.hair} </p>`;
    html += `<p><strong>${game.i18n.localize("AActors.WFRP.Description")}:</strong></p>`
    html += `<p>${actorInput.description.appearance}</p><hr>`;
    html += `<p>${actorInput.description.personality}</p><hr>`;
    html += `<p>${actorInput.description.biography}</p><hr>`;
    html += `<p>${actorInput.description.motivations}</p><hr>`;
    html += `<p>${actorInput.description.specificTraits}</p><hr>`;
    html += `</p>`;

    html += `<p><strong>${game.i18n.localize("AActors.WFRP.Careers")}:</strong><ul>`;
    if (npc.careers) {
      for (let i of npc.careers) {
        if (i.uuid) {
          html += `<li><a class="content-link" draggable="true" data-id="null" data-uuid="${i.uuid}" data-tooltip=""><i class="fas fa-unlink"></i>${i.name}</a> [${i.originalName}]</li>`;
        } else {
          html += `<li>${i.name}</li>`;
        }
      }
    }
    html += `</ul></p>`;
    html += `<p><strong>${game.i18n.localize("AActors.WFRP.Talents")}:</strong><ul>`;
    if (npc.talents) {
        for (let i of npc.talents) {
          if (i.uuid) {
            html += `<li><a class="content-link" draggable="true" data-id="null" data-uuid="${i.uuid}" data-tooltip=""><i class="fas fa-unlink"></i>${i.name}</a>[${i.originalName}]</li>`;
          } else {
            html += `<li>${i.name}</li>`;
          }
      }
    }
    html += `</ul></p>`;
    return html;
  }
    
  static #resolveTalentMatch(talents, talentName) {
    const query = talentName.trim();
    const queryLower = query.toLowerCase();
    const queryBase = query.split("(")[0].trim().toLowerCase();

    let matches = talents.filter((talent) =>
      talent.name === query
      || talent.flags?.babele?.originalName === query
      || talent.name.toLowerCase() === queryLower
      || talent.name.toLowerCase().startsWith(`${queryBase} (`)
      || talent.flags?.babele?.originalName?.toLowerCase() === queryLower
    );

    if (!matches.length) {
      matches = talents
        .map((talent) => ({
          talent,
          index: talent.flags?.babele?.originalName
            ? Math.min(
              WfrpOpenAiDetailsApi.levenshtein(talent.name, query),
              WfrpOpenAiDetailsApi.levenshtein(talent.flags.babele.originalName, query),
            )
            : WfrpOpenAiDetailsApi.levenshtein(talent.name, query),
        }))
        .filter((entry) => entry.index < 10)
        .sort((a, b) => a.index - b.index)
        .map((entry) => entry.talent);
    }

    if (!matches.length) {
      return null;
    }

    const exact = matches.find((talent) => talent.name.toLowerCase() === queryLower);
    const pick = exact ?? matches[0];

    return {
      name: pick.name,
      uuid: pick.uuid,
      originalName: query,
    };
  }

  static #createFallbackTalent(name) {
    const system = foundry.utils.duplicate(game.model.Item.talent);
    return {
      name,
      type: "talent",
      img: "systems/wfrp4e/icons/blank.png",
      system,
    };
  }

  static #resolveCareerMatch(careers, careerName) {
    const query = careerName.trim();
    const queryLower = query.toLowerCase();

    let matches = careers.filter((career) =>
      career.name === query
      || career.flags?.babele?.originalName === query
      || career.name.toLowerCase() === queryLower
      || career.system?.careergroup?.value?.toLowerCase() === queryLower
    );

    if (!matches.length) {
      matches = careers
        .map((career) => ({
          career,
          index: career.flags?.babele?.originalName
            ? Math.min(
              WfrpOpenAiDetailsApi.levenshtein(career.name, query),
              WfrpOpenAiDetailsApi.levenshtein(career.flags.babele.originalName, query),
            )
            : WfrpOpenAiDetailsApi.levenshtein(career.name, query),
        }))
        .filter((entry) => entry.index < 10)
        .sort((a, b) => a.index - b.index)
        .map((entry) => entry.career);
    }

    if (!matches.length) {
      return null;
    }

    const tierOne = matches.filter((career) => Number(career.system?.level?.value ?? 1) === 1);
    const pick = tierOne[0] ?? matches[0];

    return {
      name: pick.name,
      uuid: pick.uuid,
      originalName: query,
    };
  }

  static #createFallbackCareer(name, isCurrent) {
    const system = foundry.utils.duplicate(game.model.Item.career);
    system.current.value = isCurrent;
    return {
      name,
      type: "career",
      img: "systems/wfrp4e/icons/blank.png",
      system,
    };
  }

  static #careerItemData(careerDocument, isCurrent) {
    const itemData = careerDocument.toObject();
    delete itemData._id;
    itemData.system.current = itemData.system.current ?? { value: false };
    itemData.system.current.value = isCurrent;
    return itemData;
  }

  static #characteristicBonus(value) {
    return Math.floor(Number(value) / 10);
  }

  /**
   * WFRP4e max wounds by size (avg: SB + 2×TB + WPB).
   * @param {{ s: number, t: number, wp: number }} stats
   * @param {string} size
   * @returns {number}
   */
  static #computeWoundsFromCharacteristics(stats, size = "avg") {
    const sb = WfrpOpenAiDetailsApi.#characteristicBonus(stats.s);
    const tb = WfrpOpenAiDetailsApi.#characteristicBonus(stats.t);
    const wpb = WfrpOpenAiDetailsApi.#characteristicBonus(stats.wp);

    switch (size) {
      case "tiny":
        return 1 + tb;
      case "ltl":
        return tb;
      case "sml":
        return (2 * tb) + wpb;
      case "lrg":
        return 2 * (sb + (2 * tb) + wpb);
      case "enor":
        return 4 * (sb + (2 * tb) + wpb);
      case "mnst":
        return 8 * (sb + (2 * tb) + wpb);
      case "avg":
      default:
        return sb + (2 * tb) + wpb;
    }
  }

  static #ensureAutoCalcSettings(system) {
    system.settings ??= {};
    system.settings.equipPoints ??= 2;
    system.settings.autoCalc ??= {};
    const autoCalc = system.settings.autoCalc;
    autoCalc.run ??= true;
    autoCalc.walk ??= true;
    autoCalc.wounds ??= true;
    autoCalc.criticals ??= true;
    autoCalc.corruption ??= true;
    autoCalc.encumbrance ??= true;
    autoCalc.size ??= true;
  }

  static #applyWounds(system, characteristics) {
    const size = system.details?.size?.value ?? "avg";
    const wounds = WfrpOpenAiDetailsApi.#computeWoundsFromCharacteristics(
      {
        s: characteristics.strength,
        t: characteristics.toughness,
        wp: characteristics.willPower,
      },
      size,
    );

    system.status ??= {};
    system.status.wounds ??= { value: wounds, max: wounds };
    system.status.wounds.max = wounds;
    system.status.wounds.value = wounds;

    const tb = WfrpOpenAiDetailsApi.#characteristicBonus(characteristics.toughness);
    system.status.criticalWounds ??= { value: 0, max: tb };
    system.status.criticalWounds.max = tb;
  }

  static #setDetailValue(details, field, value) {
    if (!details[field]) {
      details[field] = { value: "" };
    }
    details[field].value = value ?? "";
  }

  async prepareActorData(actorInput) {
    const npc = actorInput.npc;
    const system = foundry.utils.duplicate(game.model.Actor.npc);
    const characteristics = npc.characteristics ?? {};

    system.characteristics.ws.initial = characteristics.weaponSkill;
    system.characteristics.bs.initial = characteristics.ballisticSkill;
    system.characteristics.s.initial = characteristics.strength;
    system.characteristics.t.initial = characteristics.toughness;
    system.characteristics.i.initial = characteristics.initiative;
    system.characteristics.ag.initial = characteristics.agility;
    system.characteristics.dex.initial = characteristics.dexterity;
    system.characteristics.int.initial = characteristics.intelligence;
    system.characteristics.wp.initial = characteristics.willPower;
    system.characteristics.fel.initial = characteristics.fellowship;

    WfrpOpenAiDetailsApi.#ensureAutoCalcSettings(system);
    WfrpOpenAiDetailsApi.#applyWounds(system, characteristics);

    const { speciesKey, subspeciesKey } = resolveWfrpSpecies(npc.details?.species ?? "");
    if (!system.details.species) {
      system.details.species = { value: "", subspecies: "" };
    }
    system.details.species.value = speciesKey;
    system.details.species.subspecies = subspeciesKey;
    WfrpOpenAiDetailsApi.#setDetailValue(system.details, "gender", npc.details?.gender);
    WfrpOpenAiDetailsApi.#setDetailValue(system.details, "haircolour", npc.details?.hair);
    WfrpOpenAiDetailsApi.#setDetailValue(system.details, "eyecolour", npc.details?.eyes);
    WfrpOpenAiDetailsApi.#setDetailValue(system.details, "age", npc.details?.age);
    WfrpOpenAiDetailsApi.#setDetailValue(system.details, "height", npc.details?.height);
    WfrpOpenAiDetailsApi.#setDetailValue(system.details, "weight", npc.details?.weight);

    const utility = getWfrpUtility();
    const move = utility?.speciesMovement?.(speciesKey, subspeciesKey);
    if (move) {
      if (!system.details.move) {
        system.details.move = { value: 4, walk: 0, run: 0 };
      }
      system.details.move.value = move;
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

    WfrpOpenAiDetailsApi.#setDetailValue(system.details, "biography", biography);

    return {
      name: npc.name,
      type: "npc",
      system,
    };
  }

  async prepareActorItemsData(actorInput) {
    const npc = actorInput.npc;
    const careers = [];
    const talents = [];

    for (const [index, careerRef] of (npc.careers ?? []).entries()) {
      const isCurrent = index === 0;

      if (careerRef.uuid) {
        const career = await fromUuid(careerRef.uuid);
        if (career) {
          careers.push(WfrpOpenAiDetailsApi.#careerItemData(career, isCurrent));
          continue;
        }
      }

      ui.notifications.warn(`Career "${careerRef.name}" was not found in compendiums; creating a blank career entry.`);
      careers.push(WfrpOpenAiDetailsApi.#createFallbackCareer(careerRef.name, isCurrent));
    }

    for (const talentRef of npc.talents ?? []) {
      if (talentRef.uuid) {
        const talent = await fromUuid(talentRef.uuid);
        if (talent) {
          const itemData = talent.toObject();
          delete itemData._id;
          talents.push(itemData);
          continue;
        }
      }

      ui.notifications.warn(`Talent "${talentRef.name}" was not found in compendiums; creating a blank talent entry.`);
      talents.push(WfrpOpenAiDetailsApi.#createFallbackTalent(talentRef.name));
    }

    const initialItems = await getWfrpNpcInitialItems();
    for (const item of initialItems) {
      delete item._id;
    }

    return initialItems.concat(careers, talents);
  }
  
  static levenshtein(s, t) {
    if (s === t) {
        return 0;
    }
    var n = s.length, m = t.length;
    if (n === 0 || m === 0) {
        return n + m;
    }
    var x = 0, y, a, b, c, d, g, h, k;
    var p = new Array(n);
    for (y = 0; y < n;) {
        p[y] = ++y;
    }

    for (; (x + 3) < m; x += 4) {
        var e1 = t.charCodeAt(x);
        var e2 = t.charCodeAt(x + 1);
        var e3 = t.charCodeAt(x + 2);
        var e4 = t.charCodeAt(x + 3);
        c = x;
        b = x + 1;
        d = x + 2;
        g = x + 3;
        h = x + 4;
        for (y = 0; y < n; y++) {
            k = s.charCodeAt(y);
            a = p[y];
            if (a < c || b < c) {
                c = (a > b ? b + 1 : a + 1);
            }
            else {
                if (e1 !== k) {
                    c++;
                }
            }

            if (c < b || d < b) {
                b = (c > d ? d + 1 : c + 1);
            }
            else {
                if (e2 !== k) {
                    b++;
                }
            }

            if (b < d || g < d) {
                d = (b > g ? g + 1 : b + 1);
            }
            else {
                if (e3 !== k) {
                    d++;
                }
            }

            if (d < g || h < g) {
                g = (d > h ? h + 1 : d + 1);
            }
            else {
                if (e4 !== k) {
                    g++;
                }
            }
            p[y] = h = g;
            g = d;
            d = b;
            b = c;
            c = a;
        }
    }

    for (; x < m;) {
        var e = t.charCodeAt(x);
        c = x;
        d = ++x;
        for (y = 0; y < n; y++) {
            a = p[y];
            if (a < c || d < c) {
                d = (a > d ? d + 1 : a + 1);
            }
            else {
                if (e !== s.charCodeAt(y)) {
                    d = c + 1;
                }
                else {
                    d = c;
                }
            }
            p[y] = d;
            c = a;
        }
        h = d;
    }

    return h;
  }
}