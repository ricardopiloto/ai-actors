import { Constants } from "./constants.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

export default class ActorAiImagePopup extends HandlebarsApplication {
  static DEFAULT_OPTIONS = {
    id: "actor-ai-image-popup",
    classes: ["actor-ai", "themed", "theme-light"],
    tag: "div",
    window: {
      title: "AActors.General.ImagePopup",
      resizable: true,
    },
    position: {
      width: 600,
      height: 400,
    },
  };

  static PARTS = {
    content: {
      template: Constants.TEMPLATES.IMAGEPOPUP,
    },
  };

  constructor(options = {}) {
    super(options);
    this.image = options.image ?? "";
  }

  async _prepareContext() {
    return {
      image: this.image,
    };
  }
}
