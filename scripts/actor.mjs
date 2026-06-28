import ActorAiInput from './actor-ai-input.mjs';
import ChatAiOpenAiApi from './api/chat-ai-open-ai-api.mjs';
import './api/ai-settings.mjs';
import { Constants } from './constants.mjs';
import { isV13Plus } from './compat.mjs';

export { Constants };

function openActorAiInput() {
    if (!Constants.mainInput) {
        Constants.mainInput = new ActorAiInput({ inputData: { userId: game.user?.id } });
    }
    Constants.mainInput.render(true);
}

function isGm() {
    return game.user?.isGM ?? false;
}

function isActorDirectory(app) {
    return app?.constructor?.name === 'ActorDirectory';
}

function getActorDirectoryRoot(app, element) {
    if (element instanceof HTMLElement) return element;
    if (app?.element instanceof HTMLElement) return app.element;
    return element?.[0] ?? element?.get?.(0) ?? null;
}

function injectActorDirectoryButton(app, element) {
    if (!isGm()) return;

    const root = getActorDirectoryRoot(app, element);
    if (!root) return;

    if (root.querySelector('.create-actor-ai-actor')) return;

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

    Hooks.on('renderActorDirectory', (app, element) => {
        injectActorDirectoryButton(app, element);
    });

    Hooks.on('renderApplicationV2', (app, element) => {
        if (isActorDirectory(app)) {
            injectActorDirectoryButton(app, element);
        }
    });
}

function registerLegacyActorDirectoryButton() {
    Hooks.on('renderActorDirectory', (_app, html) => {
        if (!isGm()) return;
        const directoryHeader = html.find('.header-actions.action-buttons.flexrow');
        const createActor = game.i18n.localize('AActors.General.Create');

        if (!directoryHeader.find('.create-actor-ai-actor').length) {
            directoryHeader.append(
                `<button type="button" class="create-actor-ai-actor" title="${createActor}"><i class="fa-solid fa-hat-wizard"></i> ${createActor}</button>`
            );
        }

        html.on('click', '.create-actor-ai-actor', () => openActorAiInput());
    });
}

Hooks.once('init', () => {
    game.settings.register(Constants.ID, Constants.imageFolderLocation, {
        name: `AActors.Settings.${Constants.imageFolderLocation}.Name`,
        default: "ai-images",
        type: String,
        scope: "world",
        config: true,
        restricted: true,
        hint: `AActors.Settings.${Constants.imageFolderLocation}.Hint`
    });

    if (isV13Plus()) {
        registerActorDirectoryButton();
    } else {
        registerLegacyActorDirectoryButton();
    }
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
});

Hooks.on('changeSidebarTab', (tab) => {
    if (tab !== 'actors' || !isGm()) return;
    requestAnimationFrame(() => {
        const actorDirectory = ui.sidebar?.tabs?.actors;
        if (actorDirectory?.element) {
            injectActorDirectoryButton(actorDirectory, actorDirectory.element);
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

Hooks.on('renderChatLog', (_log, html) => {
    ChatAiOpenAiApi.chatListeners(html);
});
