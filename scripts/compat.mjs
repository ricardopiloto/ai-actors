/** @returns {boolean} */
export function isV13Plus() {
  return foundry.utils.isNewerVersion(game.version ?? "0", "12.999");
}

/**
 * Bind a delegated click listener on a root element (HTMLElement or legacy jQuery).
 * @param {HTMLElement | JQuery} root
 * @param {string} selector
 * @param {(event: Event, target: Element) => void | Promise<void>} handler
 */
export function onClick(root, selector, handler) {
  const element = root instanceof HTMLElement ? root : root?.[0] ?? root?.get?.(0);
  if (!element) return;

  element.addEventListener("click", (event) => {
    const target = event.target.closest(selector);
    if (!target || !element.contains(target)) return;
    handler(event, target);
  });
}

/**
 * @param {HTMLElement | JQuery} root
 * @param {string} selector
 * @returns {Element | null}
 */
export function querySelector(root, selector) {
  const element = root instanceof HTMLElement ? root : root?.[0] ?? root?.get?.(0);
  return element?.querySelector(selector) ?? null;
}

/**
 * @param {HTMLElement | JQuery} root
 * @param {string} selector
 * @returns {Element[]}
 */
export function querySelectorAll(root, selector) {
  const element = root instanceof HTMLElement ? root : root?.[0] ?? root?.get?.(0);
  return element ? [...element.querySelectorAll(selector)] : [];
}

/**
 * @returns {{ name: string, value: string }[]}
 */
export function getActorFolders() {
  const folders = [];
  const stack = [...game.folders.filter((folder) => folder.type === "Actor" && folder.depth === 1)];

  while (stack.length > 0) {
    const folder = stack.pop();
    const depthString = "-- ".repeat(Math.max(0, folder.depth - 1));
    folders.push({ name: depthString + folder.name, value: folder.id });

    if (folder.children?.length > 0) {
      stack.push(...folder.children.map((child) => child.folder ?? child));
    }
  }

  return Array.from(new Map(folders.map((option) => [option.value, option])).values());
}

/**
 * Build chat message data for a private (whisper) message, compatible with Foundry v13 and v14.
 * @param {object} chatData base chat data from the chat hook or command handler
 * @param {object} [overrides]
 * @returns {object}
 */
export function buildWhisperMessageData(chatData = {}, overrides = {}) {
  const data = foundry.utils.mergeObject(
    {
      speaker: chatData.speaker,
      user: chatData.user ?? game.user?.id,
    },
    overrides,
    { inplace: false },
  );

  if (CONST.CHAT_MESSAGE_STYLES) {
    data.style = CONST.CHAT_MESSAGE_STYLES.OTHER;
    delete data.type;
  } else {
    data.type = CONST.CHAT_MESSAGE_TYPES.WHISPER;
  }

  return data;
}
