import ActorAiInput from './actor-ai-input.mjs';
import ChatAiOpenAiApi from './api/chat-ai-open-ai-api.mjs';
import './api/ai-settings.mjs';
import './api/settings-ui.mjs';
import { Constants } from './constants.mjs';

export { Constants };

function openActorAiInput() {
    new ActorAiInput({ inputData: { userId: game.user?.id } }).render(true);
}

function isGm() {
    return game.user?.isGM ?? false;
}

function isActorDirectory(app) {
    return app?.constructor?.name === 'ActorDirectory';
}

function isChatLog(app) {
    return app?.constructor?.name === 'ChatLog';
}

function getApplicationRoot(_app, element) {
    if (element instanceof HTMLElement) return element;
    return element?.[0] ?? element?.get?.(0) ?? null;
}

function registerActorDirectoryButton() {
    Hooks.on('getHeaderControlsActorDirectory', (_app, controls) => {
        if (!isGm()) return;

        controls.unshift({
            action: 'createActorAi',
            icon: 'fa-solid fa-hat-wizard',
            label: 'AActors.General.Create',
            visible: true,
            onClick: () => openActorAiInput(),
        });
    });

    Hooks.on('renderApplicationV2', (app, element) => {
        if (isActorDirectory(app)) {
            injectActorDirectoryFallback(app, element);
        }
        if (isChatLog(app)) {
            ChatAiOpenAiApi.chatListeners(element);
        }
    });
}

function injectActorDirectoryFallback(app, element) {
    if (!isGm()) return;

    const root = getApplicationRoot(app, element);
    if (!root || root.querySelector('.create-actor-ai-actor')) return;

    const headerActions = root.querySelector('[data-application-part="header"] .header-actions')
        ?? root.querySelector('.directory-header .header-actions')
        ?? root.querySelector('.header-actions');
    if (!headerActions) return;

    const createActor = game.i18n.localize('AActors.General.Create');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'create-actor-ai-actor create-entry';
    button.title = createActor;
    button.innerHTML = `<i class="fa-solid fa-hat-wizard" inert></i><span>${createActor}</span>`;
    button.addEventListener('click', (event) => {
        event.preventDefault();
        openActorAiInput();
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'action-buttons flexrow create-actor-ai-actions';
    wrapper.appendChild(button);
    headerActions.insertAdjacentElement('afterend', wrapper);
}

Hooks.once('init', () => {
    registerActorDirectoryButton();
});

Hooks.once('ready', () => {
    if (game.system.id !== 'wfrp4e') {
        ui.notifications.warn('AI Generated NPCs is designed for the WFRP4e system.');
    }

    if (!isGm()) return;

    const actorDirectory = ui.sidebar?.tabs?.actors;
    if (actorDirectory?.rendered) {
        actorDirectory.render(false);
    }

    const chatLog = ui.chat;
    if (chatLog?.rendered && chatLog.element) {
        ChatAiOpenAiApi.chatListeners(chatLog.element);
    }
});

Hooks.on('changeSidebarTab', (tab) => {
    if (tab !== 'actors' || !isGm()) return;
    requestAnimationFrame(() => {
        const actorDirectory = ui.sidebar?.tabs?.actors;
        if (actorDirectory?.element) {
            injectActorDirectoryFallback(actorDirectory, actorDirectory.element);
        }
    });
});

Hooks.on('chatMessage', (chatLog, message, chatData) => {
	const reWhisper = new RegExp(/^(\/w(?:hisper)?\s)(\[(?:[^\]]+)\]|(?:[^\s]+))\s*([^]*)/, "i");
	const match = message.match(reWhisper);
	if (match) {
		const gpt = 'ai';
		const userAliases = match[2].replace(/[[\]]/g, "").split(",").map(n => n.trim());
		const question = match[3].trim();
        const chatAi = new ChatAiOpenAiApi();
        const users = userAliases
        .filter(n => n.toLowerCase() !== gpt)
        .reduce((arr, n) => arr.concat(ChatMessage.getWhisperRecipients(n)), [game.user]);

		if (userAliases.some(u => u.toLowerCase() === gpt)) {

			if (!users.length) throw new Error(game.i18n.localize("ERROR.NoTargetUsersForWhisper"));
			if (users.some(u => !u.isGM && u.id != game.user.id) && !game.user.can("MESSAGE_WHISPER")) {
				throw new Error(game.i18n.localize("ERROR.CantWhisper"));
			}

			chatData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER;
			chatData.whisper = users.map(u => u.id);
			chatData.sound = CONFIG.sounds.notification;
            const toGptHtml = '<span>To: AI</span><br>';
            chatData.content = `${toGptHtml}${question.replace(/\n/g, "<br>")}`;
            ChatMessage.create(chatData);

            let postData = chatAi.prepareBasicPrompt();

			chatData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER;
			chatData.whisper = users.map(u => u.id);
            ChatMessage.create({ content: "...", type: CONST.CHAT_MESSAGE_TYPES.WHISPER, whisper: users.map(u => u.id) })
                .then(responseMessage => chatAi.generateChatResponse(postData, question, responseMessage));
			return false;
		}
        if (userAliases.some(u => u.toLowerCase() === 'gpt-reset')) {
            chatAi.resetChatMessagesHistory();
			return false;
        }
        if (userAliases.some(u => u.toLowerCase() === 'img')) {
            ChatMessage.create({ content: ChatAiOpenAiApi.spinnerHtml, type: CONST.CHAT_MESSAGE_TYPES.WHISPER, whisper: users.map(u => u.id)})
                .then(responseMessage => chatAi.generateChatImage(question, responseMessage));
            return false;
        }
	}
	return true;
});
