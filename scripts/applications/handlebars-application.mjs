const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

/** WFRP4e dialog classes — matches CareerSelector and other system apps. */
export const WFRP_DIALOG_CLASSES = ["warhammer", "standard-form", "actor-ai", "actor-ai-auto-fit", "item-dialog"];

/** WFRP4e image preview classes — matches system image-popout styling. */
export const WFRP_IMAGE_POPOUT_CLASSES = ["warhammer", "standard-form", "actor-ai", "actor-ai-auto-fit", "image-popout"];

/**
 * @typedef {object} AutoFitOptions
 * @property {number} [minWidth]
 * @property {number} [minHeight]
 * @property {number} [maxWidth]
 * @property {number} [maxHeight]
 * @property {string} [measureSelector] element whose scroll size drives the fit
 * @property {boolean} [fitWidth] whether to adjust width (default true)
 * @property {boolean} [fitHeight] whether to adjust height (default true)
 */

/**
 * Resize the application window to fit its content without changing child component sizes.
 * @param {ApplicationV2} app
 * @param {AutoFitOptions} [options]
 */
export function fitApplicationToContent(app, options = {}) {
  const element = app.element;
  if (!element || app.minimized) return;

  const {
    minWidth = 360,
    minHeight = 180,
    maxWidth = Math.floor(window.innerWidth * 0.92),
    maxHeight = Math.floor(window.innerHeight * 0.92),
    measureSelector = ".actor-ai, .actor-ai-image-popup",
    fitWidth = true,
    fitHeight = true,
  } = options;

  const windowContent = element.querySelector(".window-content");
  const measureTarget = element.querySelector(measureSelector) ?? windowContent;
  if (!windowContent || !measureTarget) return;

  element.classList.remove("actor-ai-constrained");

  const header = element.querySelector(".window-header");
  const headerHeight = header?.offsetHeight ?? 0;
  const contentStyle = getComputedStyle(windowContent);
  const padX = parseFloat(contentStyle.paddingLeft) + parseFloat(contentStyle.paddingRight);
  const padY = parseFloat(contentStyle.paddingTop) + parseFloat(contentStyle.paddingBottom);
  const borderY = parseFloat(contentStyle.borderTopWidth) + parseFloat(contentStyle.borderBottomWidth);

  const contentWidth = Math.ceil(measureTarget.scrollWidth + padX);
  const contentHeight = Math.ceil(measureTarget.scrollHeight + padY);

  const targetWidth = fitWidth
    ? Math.min(maxWidth, Math.max(minWidth, contentWidth))
    : app.position.width;
  const bodyHeight = fitHeight
    ? Math.min(maxHeight - headerHeight - borderY, Math.max(minHeight - headerHeight - borderY, contentHeight))
    : app.position.height - headerHeight - borderY;
  const targetHeight = fitHeight
    ? Math.min(maxHeight, Math.max(minHeight, headerHeight + bodyHeight + borderY))
    : app.position.height;

  const naturalTotalHeight = headerHeight + contentHeight + padY + borderY;
  if (fitHeight && naturalTotalHeight > targetHeight + 1) {
    element.classList.add("actor-ai-constrained");
  }

  const { width, height } = app.position;
  if (Math.abs(width - targetWidth) <= 2 && Math.abs(height - targetHeight) <= 2) {
    return;
  }

  app.setPosition({
    width: targetWidth,
    height: targetHeight,
  });
}

/**
 * @param {ApplicationV2} app
 * @param {AutoFitOptions} [options]
 */
export function scheduleAutoFit(app, options = {}) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => fitApplicationToContent(app, options));
  });
}

/**
 * @param {ApplicationV2} app
 * @param {AutoFitOptions} [options]
 */
export function bindImageAutoFit(app, options = {}) {
  const img = app.element?.querySelector(".actor-ai-image");
  if (!img) {
    scheduleAutoFit(app, options);
    return;
  }

  const refit = () => scheduleAutoFit(app, options);
  if (img.complete) {
    refit();
  } else {
    img.addEventListener("load", refit, { once: true });
  }
}

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
