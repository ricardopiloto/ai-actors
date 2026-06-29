import { Constants } from "./constants.mjs";
import { HandlebarsApplication, WFRP_IMAGE_POPOUT_CLASSES } from "./applications/handlebars-application.mjs";

export default class ActorAiImagePopup extends HandlebarsApplication {
  static DEFAULT_OPTIONS = {
    id: "actor-ai-image-popup",
    classes: WFRP_IMAGE_POPOUT_CLASSES,
    tag: "div",
    window: {
      title: "AActors.General.ImagePopup",
      icon: "fa-solid fa-image",
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
      root: true,
      scrollable: [""],
    },
  };

  constructor(options = {}) {
    super(options);
    this.image = options.image ?? "";
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return foundry.utils.mergeObject(context, {
      image: this.image,
    });
  }
}
