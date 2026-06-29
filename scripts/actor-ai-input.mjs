import { Constants } from "./constants.mjs";
import ActorAi from "./actor-ai.mjs";
import AiSettings from "./api/ai-settings.mjs";
import { getSystemAdapter, isSystemSupported } from "./api/system-adapter-factory.mjs";
import { buildSystemFieldContext, collectInputFieldValues } from "./api/system-adapter.mjs";
import { getApplicationForm, HandlebarsApplication, scheduleAutoFit, WFRP_DIALOG_CLASSES } from "./applications/handlebars-application.mjs";

const INPUT_AUTO_FIT = {
  minWidth: 420,
  minHeight: 200,
  measureSelector: ".actor-ai",
};

export default class ActorAiInput extends HandlebarsApplication {
  static DEFAULT_OPTIONS = {
    id: "actor-ai-input",
    classes: WFRP_DIALOG_CLASSES,
    tag: "form",
    window: {
      title: "AActors.General.PrepareInputForm",
      icon: "fa-solid fa-hat-wizard",
      resizable: true,
    },
    position: {
      width: 500,
      height: 200,
    },
    form: {
      submitOnChange: false,
      closeOnSubmit: false,
    },
    actions: {
      send: ActorAiInput.#onSend,
    },
  };

  static PARTS = {
    form: {
      template: Constants.TEMPLATES.INPUT,
      root: true,
    },
  };

  constructor(options = {}) {
    super(options);
    this.inputData = options.inputData ?? { userId: game.userId };
    this.systemAdapter = getSystemAdapter();
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return foundry.utils.mergeObject(context, {
      description: this.inputData.textInput ?? "",
      complexity: this.inputData.complexity ?? "",
      systemFields: buildSystemFieldContext(this.systemAdapter, this.inputData),
    });
  }

  _onRender(context, options) {
    super._onRender(context, options);
    scheduleAutoFit(this, INPUT_AUTO_FIT);
    const form = getApplicationForm(this);
    const npcType = form?.querySelector('[name="npcType"]');
    if (npcType && !npcType.dataset.aiActorsBound) {
      npcType.dataset.aiActorsBound = "true";
      npcType.addEventListener("change", () => ActorAiInput.#onRefreshFields.call(this));
    }
  }

  static #onRefreshFields(_event, _target) {
    const form = getApplicationForm(this);
    this.inputData.textInput = form?.querySelector('[name="description"]')?.value ?? "";
    this.inputData.complexity = form?.querySelector('[name="complexity"]')?.value ?? "";
    foundry.utils.mergeObject(this.inputData, collectInputFieldValues(this.systemAdapter, form));
    this.render(false);
  }

  static #onSend(_event, _target) {
    if (!isSystemSupported()) {
      ui.notifications.error(game.i18n.format("AActors.Errors.UnsupportedSystem", { system: game.system.id }));
      return;
    }

    try {
      AiSettings.assertLlmConfigured();
    } catch (error) {
      ui.notifications.error(error.message);
      return;
    }

    const form = getApplicationForm(this);
    this.inputData.textInput = form?.querySelector('[name="description"]')?.value ?? "";
    this.inputData.complexity = form?.querySelector('[name="complexity"]')?.value ?? "";
    foundry.utils.mergeObject(this.inputData, collectInputFieldValues(this.systemAdapter, form));

    const payload = foundry.utils.mergeObject(this.inputData);
    this.close();
    new ActorAi({ actorInput: payload }).render(true);
  }
}
