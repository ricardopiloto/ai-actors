import { Constants } from "./constants.mjs";
import ActorAi from "./actor-ai.mjs";
import AiSettings from "./api/ai-settings.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

export default class ActorAiInput extends HandlebarsApplication {
  static DEFAULT_OPTIONS = {
    id: "actor-ai-input",
    classes: ["actor-ai", "themed", "theme-light", "wfrp4e", "sheet"],
    tag: "form",
    window: {
      title: "AActors.General.PrepareInputForm",
      resizable: true,
      contentClasses: ["standard-form"],
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
    content: {
      template: Constants.TEMPLATES.INPUT,
    },
  };

  constructor(options = {}) {
    super(options);
    this.inputData = options.inputData ?? { userId: game.userId };
  }

  async _prepareContext() {
    return {
      description: this.inputData.textInput ?? "",
      complexity: this.inputData.complexity ?? "",
      noOfCareers: this.inputData.noOfCareers ?? "",
      noOfTalents: this.inputData.noOfTalents ?? "",
    };
  }

  static #onSend(_event, _target) {
    try {
      AiSettings.assertLlmConfigured();
    } catch (error) {
      ui.notifications.error(error.message);
      return;
    }

    const form = this.element;
    this.inputData.textInput = form.querySelector('[name="description"]')?.value ?? "";
    this.inputData.complexity = form.querySelector('[name="complexity"]')?.value ?? "";
    this.inputData.noOfCareers = Number(form.querySelector('[name="noOfCareers"]')?.value ?? 0);
    this.inputData.noOfTalents = Number(form.querySelector('[name="noOfTalents"]')?.value ?? 0);

    const payload = foundry.utils.deepClone(this.inputData);
    new ActorAi({ actorInput: payload }).render(true);
  }
}
