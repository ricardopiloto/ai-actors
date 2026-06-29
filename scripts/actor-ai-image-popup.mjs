import { Constants } from "./constants.mjs";
import { HandlebarsApplication, bindImageAutoFit, WFRP_IMAGE_POPOUT_CLASSES } from "./applications/handlebars-application.mjs";

const IMAGE_AUTO_FIT = {
  minWidth: 320,
  minHeight: 280,
  measureSelector: ".actor-ai-image-popup",
};

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
      height: 280,
    },
  };

  static PARTS = {
    content: {
      template: Constants.TEMPLATES.IMAGEPOPUP,
      root: true,
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

  _onRender(context, options) {
    super._onRender(context, options);
    bindImageAutoFit(this, IMAGE_AUTO_FIT);
  }
}
