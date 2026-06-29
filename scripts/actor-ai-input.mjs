import { Constants } from "./constants.mjs";
import ActorAi from "./actor-ai.mjs";
import AiSettings from "./api/ai-settings.mjs";
import { getApplicationForm, HandlebarsApplication, WFRP_DIALOG_CLASSES } from "./applications/handlebars-application.mjs";

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
      height: 350,
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
      scrollable: [""],
    },
  };

  constructor(options = {}) {
    super(options);
    this.inputData = options.inputData ?? { userId: game.userId };
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return foundry.utils.mergeObject(context, {
      description: this.inputData.textInput ?? "",
      complexity: this.inputData.complexity ?? "",
      noOfCareers: this.inputData.noOfCareers ?? "",
      noOfTalents: this.inputData.noOfTalents ?? "",
    });
  }

  static #onSend(_event, _target) {
    try {
      AiSettings.assertLlmConfigured();
    } catch (error) {
      ui.notifications.error(error.message);
      return;
    }

    const form = getApplicationForm(this);
    this.inputData.textInput = form?.querySelector('[name="description"]')?.value ?? "";
    this.inputData.complexity = form?.querySelector('[name="complexity"]')?.value ?? "";
    this.inputData.noOfCareers = Number(form?.querySelector('[name="noOfCareers"]')?.value ?? 0);
    this.inputData.noOfTalents = Number(form?.querySelector('[name="noOfTalents"]')?.value ?? 0);

    const payload = foundry.utils.deepClone(this.inputData);
    this.close();
    new ActorAi({ actorInput: payload }).render(true);
  }
}
