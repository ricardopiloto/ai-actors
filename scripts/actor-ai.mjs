import ActorAiOpenAiApi from "./api/actor-ai-open-ai-api.mjs";
import ActorAiImagePopup from "./actor-ai-image-popup.mjs";
import WfrpOpenAiDetailsApi from "./api/wfrp-open-ai-details.mjs";
import AiSettings from "./api/ai-settings.mjs";
import { Constants } from "./constants.mjs";
import { getImageApi } from "./api/image-provider.mjs";
import "./api/ai-settings.mjs";
import InputModel from "./model/input-model.mjs";
import { getActorFolders } from "./compat.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

export default class ActorAi extends HandlebarsApplication {
  static DEFAULT_OPTIONS = {
    id: "actor-ai",
    classes: ["actor-ai", "themed", "theme-light", "wfrp4e", "sheet"],
    tag: "form",
    window: {
      title: "AActors.General.SaveActorForm",
      resizable: true,
      contentClasses: ["standard-form"],
    },
    position: {
      width: 700,
      height: 700,
    },
    form: {
      submitOnChange: false,
      closeOnSubmit: false,
    },
    actions: {
      save: ActorAi.#onSave,
      generate: ActorAi.#onGenerate,
      upscale: ActorAi.#onUpscale,
      previewImage: ActorAi.#onPreviewImage,
    },
  };

  static PARTS = {
    content: {
      template: Constants.TEMPLATES.ACTOR,
    },
  };

  static async saveImageToFileSystem(input, path) {
    if (!path.includes(".png")) {
      path = `${path}.png`;
    }

    let myBlob = input;
    if (input.constructor.name !== "Blob") {
      const byteCharacters = atob(input);
      const byteArray = new Uint8Array([...byteCharacters].map((char) => char.charCodeAt(0)));
      myBlob = new Blob([byteArray], { type: "image/png" });
    }

    const imageFile = new File([myBlob], path, { type: myBlob.type });
    const folder = game.settings.get(Constants.ID, Constants.imageFolderLocation);

    try {
      await foundry.applications.apps.FilePicker.createDirectory("data", folder);
    } catch {}

    return foundry.applications.apps.FilePicker.upload("data", folder, imageFile, {}, { notify: true });
  }

  constructor(options = {}) {
    super(options);
    this.actor = null;
    this.actorInput = options.actorInput ?? {};
    this.api = new ActorAiOpenAiApi();
    this.apiDetails = new WfrpOpenAiDetailsApi();
    this.apiImage = getImageApi();

    this.context = {
      init: true,
      stage: "init",
      stageDescription: this.api.initialMessage,
    };
  }

  async _prepareContext() {
    const data = {
      context: this.context,
      folders: [
        { name: game.i18n.localize("AActors.General.SelectFolder"), value: "0" },
        ...getActorFolders(),
      ],
      actorInput: this.actorInput,
      folder: this.actorInput.folder ?? "0",
      owner: true,
      editable: true,
      enrichedHtml: await TextEditor.enrichHTML(this.actorInput.html ?? "", {
        secrets: true,
      }),
    };

    if (!this.apiInput) {
      this.apiInput = new InputModel(this.actorInput.textInput ?? "");
    }

    if (this.context.init) {
      this.context.init = false;
      this.#runGenerationPipeline();
    }

    return data;
  }

  async #runGenerationPipeline() {
    try {
      AiSettings.assertLlmConfigured();
    } catch (error) {
      this.context.stage = "error";
      this.context.stageDescription = error.message;
      await this.render(true);
      ui.notifications.error(error.message);
      return;
    }

    try {
      await this.refresh({ stage: "initial", message: game.i18n.localize("AActors.OpenAI.InitialMessage") });

      const postData = this.api.prepareBasicPrompt();
      for (const stage of this.apiDetails.stages) {
        await this.apiDetails.updateStageInputModel(stage, this.apiInput, this.actorInput);
      }
      await this.api.updateInputModelWithImagePrompt(this.apiInput, this.actorInput);

      const systemPrompt = game.settings.get(Constants.ID, ActorAiOpenAiApi.systemPromptKey);
      let noOfSentences = 10;
      switch (this.actorInput.complexity) {
        case "simple":
          noOfSentences = 5;
          break;
        case "medium":
          noOfSentences = 10;
          break;
        case "complex":
          noOfSentences = 20;
          break;
      }

      const technicalPrompt = game.i18n
        .localize("AActors.OpenAI.TechnicalSystemPrompt")
        .replaceAll("<<noOfSentences>>", noOfSentences.toString())
        .replaceAll("<<noOfSentencesHalved>>", Math.ceil(noOfSentences / 2).toString());
      const jsonInput = JSON.stringify(this.apiInput.JsonFormat);

      postData.messages = [
        { role: "system", content: `${systemPrompt}\n${technicalPrompt}\n${jsonInput}` },
      ];

      const actorInput = await this.api.generateDescription(postData, this.apiInput, this.actorInput);
      await this.apiDetails.normalizeResponse(actorInput);
      this.actorInput = foundry.utils.mergeObject(this.actorInput, actorInput);
      this.actorInput.html = this.apiDetails.prettyPrintNpc(this.actorInput);

      await this.refresh({ stage: "image", message: game.i18n.localize("AActors.OpenAI.StageImage") });
      await this.#tryGenerateImage(this.actorInput.imagePrompt);
      await this.refresh({ stage: "final", message: "" });
    } catch (error) {
      console.error(error);
      this.context.stage = "error";
      this.context.stageDescription = error.message;
      await this.render(true);
      ui.notifications.error(error.message);
    }
  }

  async #tryGenerateImage(prompt) {
    if (!prompt) {
      return;
    }

    try {
      await this.apiImage.generateImage(prompt, this.actorInput);
    } catch (error) {
      console.warn(error);
      ui.notifications.warn(
        error.message ?? game.i18n.localize("AActors.Notifications.ImageGenerationSkipped"),
      );
    }
  }

  async refresh(stage) {
    this.context.stage = stage.stage;
    this.context.stageDescription = stage.message;
    await this.render(true);
  }

  static #onPreviewImage(_event, _target) {
    new ActorAiImagePopup({ image: this.actorInput.imageSrc }).render(true);
  }

  static async #onGenerate(_event, _target) {
    const prompt = this.element.querySelector('[name="actorInput.imagePrompt"]')?.value ?? "";
    this.actorInput.imagePrompt = prompt;

    await this.refresh({ stage: "image", message: game.i18n.localize("AActors.OpenAI.StageImage") });
    await this.#tryGenerateImage(prompt);
    await this.refresh({ stage: "final", message: "" });
  }

  static async #onUpscale(event, target) {
    const messageId = target.closest("[data-message-id]")?.dataset.messageId;
    const upscaleCustomId = target.dataset.customId;

    await this.refresh({ stage: "image", message: game.i18n.localize("AActors.OpenAI.StageImage") });

    const response = await this.apiImage.upscale(messageId, upscaleCustomId);
    delete this.actorInput.upscale;
    delete this.actorInput.messageId;
    delete this.actorInput.upscalers;
    this.actorInput = foundry.utils.mergeObject(this.actorInput, response.actorInput);

    await this.refresh({ stage: "final", message: "" });
  }

  static async #onSave(_event, _target) {
    const folderUuid = this.element.querySelector('[name="folder"]')?.value;
    const folder = folderUuid && folderUuid !== "0" ? game.folders.get(folderUuid) : null;
    const actorData = await this.apiDetails.prepareActorData(this.actorInput);

    if (folder) {
      actorData.folder = folder.id;
    }

    if (this.actorInput.imageBase64 != null) {
      let nameString = actorData.name.replace(/\s+/g, "");
      nameString += `-${(Math.random() + 1).toString(36).substring(3)}`;
      const newImg = await ActorAi.saveImageToFileSystem(this.actorInput.imageBase64, nameString);
      actorData.img = newImg.path;
    }

    const items = await this.apiDetails.prepareActorItemsData(this.actorInput);
    const actor = await Actor.create(actorData, { skipItems: true });

    if (items.length > 0) {
      await actor.createEmbeddedDocuments("Item", items, { skipSpecialisationChoice: true });
    }

    if (typeof actor.system.computeWounds === "function") {
      const wounds = actor.system.computeWounds();
      await actor.update({
        "system.status.wounds.max": wounds,
        "system.status.wounds.value": wounds,
      });
    }

    actor.sheet.render(true);
  }
}
