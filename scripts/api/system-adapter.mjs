/**
 * Contract for rule-system-specific NPC generation (Strategy / Adapter pattern).
 */
export default class SystemAdapter {
  /** @returns {{ stage: string, message: string }[]} */
  get stages() {
    throw new Error("not implemented");
  }

  /**
   * Extra form fields shown on the input dialog for this system.
   * @returns {SystemInputField[]}
   */
  get inputFields() {
    throw new Error("not implemented");
  }

  /** @param {{ stage: string, message: string }} stage */
  async updateStageInputModel(stage, inputModel, actorInput) {
    throw new Error("not implemented");
  }

  /** @param {object} actorInput */
  async normalizeResponse(actorInput) {
    throw new Error("not implemented");
  }

  /** @param {object} actorInput */
  prettyPrintNpc(actorInput) {
    throw new Error("not implemented");
  }

  /** @param {object} actorInput */
  async prepareActorData(actorInput) {
    throw new Error("not implemented");
  }

  /** @param {object} actorInput */
  async prepareActorItemsData(actorInput) {
    throw new Error("not implemented");
  }

  /** @returns {Record<string, unknown>} */
  getItemCreateOptions() {
    return {};
  }

  /** @param {Actor} actor */
  async afterActorCreated(_actor) {}
}

/**
 * @typedef {object} SystemInputField
 * @property {string} name
 * @property {"text"|"number"|"select"} type
 * @property {string} label i18n key
 * @property {string|number} [default]
 * @property {{ value: string, label: string }[]} [options] option labels are i18n keys when prefixed with AActors
 * @property {{ field: string, equals: string }} [showWhen]
 * @property {boolean} [stacked]
 * @property {string} [placeholder] i18n key
 */

/**
 * @param {SystemAdapter} adapter
 * @param {Record<string, unknown>} inputData
 * @returns {object[]}
 */
export function buildSystemFieldContext(adapter, inputData = {}) {
  return adapter.inputFields.map((field) => {
    const visible = !field.showWhen
      || inputData[field.showWhen.field] === field.showWhen.equals;

    const options = field.options?.map((option) => ({
      value: option.value,
      label: option.label.startsWith("AActors.")
        ? game.i18n.localize(option.label)
        : option.label,
    }));

    return {
      ...field,
      label: game.i18n.localize(field.label),
      placeholder: field.placeholder ? game.i18n.localize(field.placeholder) : "",
      value: inputData[field.name] ?? field.default ?? "",
      options,
      visible,
      stacked: field.stacked ?? field.type === "text",
    };
  });
}

/**
 * @param {SystemAdapter} adapter
 * @param {HTMLFormElement | HTMLElement | null} form
 * @returns {Record<string, unknown>}
 */
export function collectInputFieldValues(adapter, form) {
  const values = {};

  for (const field of adapter.inputFields) {
    const element = form?.querySelector(`[name="${field.name}"]`);
    if (!element) continue;

    if (field.type === "number") {
      const raw = element.value?.trim() ?? "";
      values[field.name] = raw === "" ? "" : Number(raw);
    } else {
      values[field.name] = element.value ?? field.default ?? "";
    }
  }

  return values;
}
