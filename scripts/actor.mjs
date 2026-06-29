import ActorAiInput from './actor-ai-input.mjs';
import ChatAiOpenAiApi from './api/chat-ai-open-ai-api.mjs';
import { isSystemSupported } from './api/system-adapter-factory.mjs';
import { processChatAiMessage, registerChatAiCommands } from './chat-ai-commands.mjs';
import './api/ai-settings.mjs';
import './api/settings-ui.mjs';
import { Constants } from './constants.mjs';

export { Constants };

function openActorAiInput() {
    if (!isSystemSupported()) {
        ui.notifications.error(game.i18n.format("AActors.Errors.UnsupportedSystem", { system: game.system.id }));
        return;
    }
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
    registerChatAiCommands();
});

Hooks.once('ready', () => {
    if (!isSystemSupported()) {
        ui.notifications.warn(game.i18n.format("AActors.Errors.UnsupportedSystemHint", { system: game.system.id }));
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
    if (processChatAiMessage(message, chatData) === false) {
        return false;
    }
    return true;
});
