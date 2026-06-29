import ChatAiOpenAiApi from "./api/chat-ai-open-ai-api.mjs";
import { buildWhisperMessageData } from "./compat.mjs";

const VIRTUAL_COMMANDS = new Set(["ai", "img", "gpt-reset"]);

const WHISPER_COMMAND_RE = /^\/w(?:hisper)?\s+(\[(?:[^\]]+)\]|[^\s]+)(?:\s+([\s\S]*))?$/i;
const DIRECT_COMMAND_RE = /^\/(ai|img)(?:\s+([\s\S]*))?$/i;

/**
 * @param {string} message
 * @returns {{ command: string, text: string, otherRecipients: string[] } | null}
 */
export function parseChatAiCommand(message) {
  let match = message.match(WHISPER_COMMAND_RE);
  if (match) {
    const recipients = match[1].replace(/[[\]]/g, "").split(",").map((name) => name.trim()).filter(Boolean);
    const text = (match[2] ?? "").trim();
    const command = recipients.find((name) => VIRTUAL_COMMANDS.has(name.toLowerCase()));
    if (!command) return null;

    return {
      command: command.toLowerCase(),
      text,
      otherRecipients: recipients.filter((name) => name.toLowerCase() !== command.toLowerCase()),
    };
  }

  match = message.match(DIRECT_COMMAND_RE);
  if (!match) return null;

  return {
    command: match[1].toLowerCase(),
    text: (match[2] ?? "").trim(),
    otherRecipients: [],
  };
}

/**
 * @param {object} chatData
 * @param {string[]} [otherRecipients]
 * @returns {foundry.documents.User[]}
 */
function resolveWhisperUsers(chatData, otherRecipients = []) {
  const sender = game.users.get(chatData.user) ?? game.user;
  if (!sender) return [];

  /** @type {foundry.documents.User[]} */
  const users = [sender];

  for (const alias of otherRecipients) {
    if (VIRTUAL_COMMANDS.has(alias.toLowerCase())) continue;
    for (const user of ChatMessage.getWhisperRecipients(alias)) {
      if (user?.id && !users.some((entry) => entry.id === user.id)) {
        users.push(user);
      }
    }
  }

  return users;
}

/**
 * @param {foundry.documents.User[]} users
 * @returns {boolean}
 */
function assertWhisperPermission(users) {
  const sender = game.user;
  if (!sender) return false;

  if (users.some((user) => !user.isGM && user.id !== sender.id) && !sender.can("MESSAGE_WHISPER")) {
    ui.notifications.error(game.i18n.localize("ERROR.CantWhisper"));
    return false;
  }

  return true;
}

/**
 * @param {string} command
 * @param {string} text
 * @param {object} chatData
 * @param {string[]} [otherRecipients]
 */
export function handleChatAiCommand(command, text, chatData, otherRecipients = []) {
  const users = resolveWhisperUsers(chatData, otherRecipients);
  if (!users.length) {
    ui.notifications.error(game.i18n.localize("ERROR.NoTargetUsersForWhisper"));
    return;
  }

  if (!assertWhisperPermission(users)) {
    return;
  }

  const whisper = users.map((user) => user.id);
  const chatAi = new ChatAiOpenAiApi();

  if (command === "ai") {
    ChatMessage.create(buildWhisperMessageData(chatData, {
      whisper,
      sound: CONFIG.sounds.notification,
      content: `<span>To: AI</span><br>${text.replace(/\n/g, "<br>")}`,
    }));

    const postData = chatAi.prepareBasicPrompt();
    ChatMessage.create(buildWhisperMessageData(chatData, {
      content: "...",
      whisper,
    })).then((responseMessage) => {
      chatAi.generateChatResponse(postData, text, responseMessage).catch((error) => {
        console.error(error);
        ui.notifications.error(error.message);
        responseMessage.update({ content: `<p class="notification error">${error.message}</p>` });
      });
    });

    return;
  }

  if (command === "gpt-reset") {
    chatAi.resetChatMessagesHistory();
    ui.notifications.info(game.i18n.localize("AActors.Chat.HistoryReset"));
    return;
  }

  if (command === "img") {
    ChatMessage.create(buildWhisperMessageData(chatData, {
      content: ChatAiOpenAiApi.spinnerHtml,
      whisper,
    })).then((responseMessage) => {
      chatAi.generateChatImage(text, responseMessage).catch((error) => {
        console.error(error);
        ui.notifications.error(error.message);
        responseMessage.update({ content: `<p class="notification error">${error.message}</p>` });
      });
    });
  }
}

/**
 * @param {string} message
 * @param {object} chatData
 * @returns {boolean} true = continue default chat processing
 */
export function processChatAiMessage(message, chatData) {
  const parsed = parseChatAiCommand(message);
  if (!parsed) return true;

  handleChatAiCommand(parsed.command, parsed.text, chatData, parsed.otherRecipients);
  return false;
}

/**
 * Intercept the core whisper command so virtual targets (ai, img, gpt-reset) are not resolved as users.
 * @param {typeof foundry.applications.sidebar.tabs.ChatLog} ChatLog
 */
function patchWhisperCommand(ChatLog) {
  const patchEntry = (entry) => {
    if (!entry?.fn || entry.__aiActorsPatched) return;
    const originalFn = entry.fn;
    entry.fn = async function (command, match, chatData, createOptions) {
      const message = typeof match?.input === "string" ? match.input : match?.[0];
      if (typeof message === "string") {
        const parsed = parseChatAiCommand(message);
        if (parsed) {
          handleChatAiCommand(parsed.command, parsed.text, chatData, parsed.otherRecipients);
          return false;
        }
      }
      return originalFn.call(this, command, match, chatData, createOptions);
    };
    entry.__aiActorsPatched = true;
  };

  for (const key of ["whisper", "w"]) {
    patchEntry(ChatLog.CHAT_COMMANDS[key]);
  }
}

/**
 * Register Foundry v14 CHAT_COMMANDS so /whisper ai|img is handled before core whisper resolution.
 */
export function registerChatAiCommands() {
  const ChatLog = foundry.applications?.sidebar?.tabs?.ChatLog;
  if (!ChatLog?.CHAT_COMMANDS) return;

  patchWhisperCommand(ChatLog);

  const bind = (command) => async function (_name, match, chatData) {
    const text = (match[1] ?? "").trim();
    handleChatAiCommand(command, text, chatData);
    return false;
  };

  ChatLog.CHAT_COMMANDS["aiactors-whisper-ai"] = {
    rgx: /^\/w(?:hisper)?\s+(?:\[ai\]|ai)(?:\s+([\s\S]*))?$/i,
    fn: bind("ai"),
  };

  ChatLog.CHAT_COMMANDS["aiactors-whisper-img"] = {
    rgx: /^\/w(?:hisper)?\s+(?:\[img\]|img)(?:\s+([\s\S]*))?$/i,
    fn: bind("img"),
  };

  ChatLog.CHAT_COMMANDS["aiactors-whisper-reset"] = {
    rgx: /^\/w(?:hisper)?\s+(?:\[gpt-reset\]|gpt-reset)\s*$/i,
    fn: async (_name, _match, chatData) => {
      handleChatAiCommand("gpt-reset", "", chatData);
      return false;
    },
  };

  ChatLog.CHAT_COMMANDS["aiactors-direct-ai"] = {
    rgx: /^\/ai(?:\s+([\s\S]*))?$/i,
    fn: bind("ai"),
  };

  ChatLog.CHAT_COMMANDS["aiactors-direct-img"] = {
    rgx: /^\/img(?:\s+([\s\S]*))?$/i,
    fn: bind("img"),
  };
}
