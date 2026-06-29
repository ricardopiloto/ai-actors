const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

/** WFRP4e dialog classes — matches CareerSelector and other system apps. */
export const WFRP_DIALOG_CLASSES = ["warhammer", "standard-form", "actor-ai", "item-dialog"];

/** WFRP4e image preview classes — matches system image-popout styling. */
export const WFRP_IMAGE_POPOUT_CLASSES = ["warhammer", "standard-form", "actor-ai", "image-popout"];

/**
 * @param {ApplicationV2} app
 * @returns {HTMLFormElement | HTMLElement | null}
 */
export function getApplicationForm(app) {
  return app.form ?? app.element?.querySelector("form") ?? app.element ?? null;
}

/**
 * @param {ApplicationV2} app
 * @param {string} selector
 * @returns {Element | null}
 */
export function queryInApplication(app, selector) {
  return getApplicationForm(app)?.querySelector(selector) ?? null;
}
