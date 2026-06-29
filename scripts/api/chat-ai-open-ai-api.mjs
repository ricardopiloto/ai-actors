import { Constants } from "../constants.mjs";
import ActorAiOpenAiApi from "./actor-ai-open-ai-api.mjs";
import AiSettings from "./ai-settings.mjs";
import { LlmProviders } from "./providers.mjs";
import { getImageApi } from "./image-provider.mjs";
import ActorAi from "../actor-ai.mjs";
import ActorAiImagePopup from "../actor-ai-image-popup.mjs";
import { onClick, querySelector } from "../compat.mjs";

export default class ChatAiOpenAiApi {

  static chatMessagesHistory = [];
  static spinnerHtml = `<div style="text-align: center;"><img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pgo8IURPQ1RUUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICBodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPgo8c3ZnIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4bWw6c3BhY2U9InByZXNlcnZlIiBzdHlsZT0iZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3N0cm9rZS1taXRlcmxpbWl0OjEuNDE0MjE7IiB4PSIwcHgiIHk9IjBweCI+CiAgICA8ZGVmcz4KICAgICAgICA8c3R5bGUgdHlwZT0idGV4dC9jc3MiPjwhW0NEQVRBWwogICAgICAgICAgICBALXdlYmtpdC1rZXlmcmFtZXMgc3BpbiB7CiAgICAgICAgICAgICAgZnJvbSB7CiAgICAgICAgICAgICAgICAtd2Via2l0LXRyYW5zZm9ybTogcm90YXRlKDBkZWcpCiAgICAgICAgICAgICAgfQogICAgICAgICAgICAgIHRvIHsKICAgICAgICAgICAgICAgIC13ZWJraXQtdHJhbnNmb3JtOiByb3RhdGUoLTM1OWRlZykKICAgICAgICAgICAgICB9CiAgICAgICAgICAgIH0KICAgICAgICAgICAgQGtleWZyYW1lcyBzcGluIHsKICAgICAgICAgICAgICBmcm9tIHsKICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogcm90YXRlKDBkZWcpCiAgICAgICAgICAgICAgfQogICAgICAgICAgICAgIHRvIHsKICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogcm90YXRlKC0zNTlkZWcpCiAgICAgICAgICAgICAgfQogICAgICAgICAgICB9CiAgICAgICAgICAgIHN2ZyB7CiAgICAgICAgICAgICAgICAtd2Via2l0LXRyYW5zZm9ybS1vcmlnaW46IDUwJSA1MCU7CiAgICAgICAgICAgICAgICAtd2Via2l0LWFuaW1hdGlvbjogc3BpbiAxLjVzIGxpbmVhciBpbmZpbml0ZTsKICAgICAgICAgICAgICAgIC13ZWJraXQtYmFja2ZhY2UtdmlzaWJpbGl0eTogaGlkZGVuOwogICAgICAgICAgICAgICAgYW5pbWF0aW9uOiBzcGluIDEuNXMgbGluZWFyIGluZmluaXRlOwogICAgICAgICAgICB9CiAgICAgICAgXV0+PC9zdHlsZT4KICAgIDwvZGVmcz4KICAgIDxnIGlkPSJvdXRlciI+CiAgICAgICAgPGc+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0yMCwwQzIyLjIwNTgsMCAyMy45OTM5LDEuNzg4MTMgMjMuOTkzOSwzLjk5MzlDMjMuOTkzOSw2LjE5OTY4IDIyLjIwNTgsNy45ODc4MSAyMCw3Ljk4NzgxQzE3Ljc5NDIsNy45ODc4MSAxNi4wMDYxLDYuMTk5NjggMTYuMDA2MSwzLjk5MzlDMTYuMDA2MSwxLjc4ODEzIDE3Ljc5NDIsMCAyMCwwWiIgc3R5bGU9ImZpbGw6YmxhY2s7Ii8+CiAgICAgICAgPC9nPgogICAgICAgIDxnPgogICAgICAgICAgICA8cGF0aCBkPSJNNS44NTc4Niw1Ljg1Nzg2QzcuNDE3NTgsNC4yOTgxNSA5Ljk0NjM4LDQuMjk4MTUgMTEuNTA2MSw1Ljg1Nzg2QzEzLjA2NTgsNy40MTc1OCAxMy4wNjU4LDkuOTQ2MzggMTEuNTA2MSwxMS41MDYxQzkuOTQ2MzgsMTMuMDY1OCA3LjQxNzU4LDEzLjA2NTggNS44NTc4NiwxMS41MDYxQzQuMjk4MTUsOS45NDYzOCA0LjI5ODE1LDcuNDE3NTggNS44NTc4NiwxMS41MDYxWiIgc3R5bGU9ImZpbGw6cmdiKDIxMCwyMTAsMjEwKTsiLz4KICAgICAgICA8L2c+CiAgICAgICAgPGc+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0yMCwzMi4wMTIyQzIyLjIwNTgsMzIuMDEyMiAyMy45OTM5LDMzLjgwMDMgMjMuOTkzOSwzNi4wMDYxQzIzLjk5MzksMzguMjExOSAyMi4yMDU4LDQwIDIwLDQwQzE3Ljc5NDIsNDAgMTYuMDA2MSwzOC4yMTE5IDE2LjAwNjEsMzYuMDA2MUMxNi4wMDYxLDMzLjgwMDMgMTcuNzk0MiwzMi4wMTIyIDIwLDMyLjAxMjJaIiBzdHlsZT0iZmlsbDpyZ2IoMTMwLDEzMCwxMzApOyIvPgogICAgICAgIDwvZz4KICAgICAgICA8Zz4KICAgICAgICAgICAgPHBhdGggZD0iTTI4LjQ5MzksMjguNDkzOUMzMC4wNTM2LDI2LjkzNDIgMzIuNTgyNCwyNi45MzQyIDM0LjE0MjEsMjguNDkzOUMzNS43MDE5LDMwLjA1MzYgMzUuNzAxOSwzMi41ODI0IDM0LjE0MjEsMzQuMTQyMUMzMi41ODI0LDM1LjcwMTkgMzAuMDUzNiwzNS43MDE5IDI4LjQ5MzksMzQuMTQyMUMyNi45MzQyLDMyLjU4MjQgMjYuOTM0MiwzMC4wNTM2IDI4LjQ5MzksMjguNDkzOVoiIHN0eWxlPSJmaWxsOnJnYigxMDEsMTAxLDEwMSk7Ii8+CiAgICAgICAgPC9nPgogICAgICAgIDxnPgogICAgICAgICAgICA8cGF0aCBkPSJNMy45OTM5LDE2LjAwNjFDNi4xOTk2OCwxNi4wMDYxIDcuOTg3ODEsMTcuNzk0MiA3Ljk4NzgxLDIwQzcuOTg3ODEsMjIuMjA1OCA2LjE5OTY4LDIzLjk5MzkgMy45OTM5LDIzLjk5MzlDMS43ODgxMywyMy45OTM5IDAsMjIuMjA1OCAwLDIwQzAsMTcuNzk0MiAxLjc4ODEzLDE2LjAwNjEgMy45OTM5LDE2LjAwNjFaIiBzdHlsZT0iZmlsbDpyZ2IoMTg3LDE4NywxODcpOyIvPgogICAgICAgIDwvZz4KICAgICAgICA8Zz4KICAgICAgICAgICAgPHBhdGggZD0iTTUuODU3ODYsMjguNDkzOUM3LjQxNzU4LDI2LjkzNDIgOS45NDYzOCwyNi45MzQyIDExLjUwNjEsMjguNDkzOUMxMy4wNjU4LDMwLjA1MzYgMTMuMDY1OCwzMi41ODI0IDExLjUwNjEsMzQuMTQyMUM5Ljk0NjM4LDM1LjcwMTkgNy40MTc1OCwzNS43MDE5IDUuODU3ODYsMzQuMTQyMUM0LjI5ODE1LDMyLjU4MjQgNC4yOTgxNSwzMC4wNTM2IDUuODU3ODYsMjguNDkzOVoiIHN0eWxlPSJmaWxsOnJnYigxNjQsMTY0LDE2NCk7Ii8+CiAgICAgICAgPC9nPgogICAgICAgIDxnPgogICAgICAgICAgICA8cGF0aCBkPSJNMzYuMDA2MSwxNi4wMDYxQzM4LjIxMTksMTYuMDA2MSA0MCwxNy43OTQyIDQwLDIwQzQwLDIyLjIwNTggMzguMjExOSwyMy45OTM5IDM2LjAwNjEsMjMuOTkzOUMzMy44MDAzLDIzLjk5MzkgMzIuMDEyMiwyMi4yMDU4IDMyLjAxMjIsMjBDMzIuMDEyMiwxNy43OTQyIDMzLjgwMDMsMTYuMDA2MSAzNi4wMDYxLDE2LjAwNjFaIiBzdHlsZT0iZmlsbDpyZ2IoNzQsNzQsNzQpOyIvPgogICAgICAgIDwvZz4KICAgICAgICA8Zz4KICAgICAgICAgICAgPHBhdGggZD0iTTI4LjQ5MzksNS44NTc4NkMzMC4wNTM2LDQuMjk4MTUgMzIuNTgyNCw0LjI5ODE1IDM0LjE0MjEsNS44NTc4NkMzNS43MDE5LDcuNDE3NTggMzUuNzAxOSw5Ljk0NjM4IDM0LjE0MjEsMTEuNTA2MUMzMi41ODI0LDEzLjA2NTggMzAuMDUzNiwxMy4wNjU4IDI4LjQ5MzksMTEuNTA2MUMyNi45MzQyLDkuOTQ2MzggMjYuOTM0Miw3LjQxNzU4IDI4LjQ5MzksNS44NTc4NloiIHN0eWxlPSJmaWxsOnJnYig1MCw1MCw1MCk7Ii8+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4K" style="border: none;"></div>`;

  prepareBasicPrompt() {
    const config = AiSettings.getLlmConfig();
    const data = {
      model: config.model,
      max_tokens: game.settings.get(Constants.ID, ActorAiOpenAiApi.maxTokensKey),
      temperature: game.settings.get(Constants.ID, ActorAiOpenAiApi.temperatureKey),
      stream: true,
    };

    if (config.provider === LlmProviders.OPENAI) {
      data.frequency_penalty = game.settings.get(Constants.ID, ActorAiOpenAiApi.frequencyPenaltyKey);
      data.presence_penalty = game.settings.get(Constants.ID, ActorAiOpenAiApi.presencePenaltyKey);
      data.top_p = game.settings.get(Constants.ID, ActorAiOpenAiApi.topPKey);
    }

    return data;
  }

  resetChatMessagesHistory() {
    ChatAiOpenAiApi.chatMessagesHistory = [];
  }

  async generateChatResponse(postData, prompt, chatMessage) {
    const config = AiSettings.assertLlmConfigured();
    const systemPrompt = game.settings.get(Constants.ID, ActorAiOpenAiApi.systemPromptKey);

    const historyLength = game.settings.get(Constants.ID, ActorAiOpenAiApi.historyLength);
    if (historyLength === 0) {
      ChatAiOpenAiApi.chatMessagesHistory = [];
    } else {
      ChatAiOpenAiApi.chatMessagesHistory = ChatAiOpenAiApi.chatMessagesHistory.slice(-historyLength * 2);
    }

    const inputMessage = { role: "user", content: prompt };
    ChatAiOpenAiApi.chatMessagesHistory.push(inputMessage);

    if (config.provider === LlmProviders.ANTHROPIC) {
      const messages = ChatAiOpenAiApi.chatMessagesHistory
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({ role: message.role, content: message.content }));

      const response = await fetch(config.url, {
        method: "POST",
        headers: {
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: postData.max_tokens,
          temperature: postData.temperature,
          system: systemPrompt,
          messages,
        }),
      });

      if (!response.ok) {
        let details = "";
        try {
          details = JSON.stringify(await response.json());
        } catch {
          details = await response.text();
        }
        throw new Error(`LLM API error (${response.status}): ${details}`);
      }

      const responseData = await response.json();
      const textMessage = responseData.content?.[0]?.text ?? "";
      ChatAiOpenAiApi.chatMessagesHistory.push({ role: "assistant", content: textMessage });
      await chatMessage.update({ content: textMessage });
      return textMessage;
    }

    postData.messages = [{ role: "system", content: systemPrompt }];
    for (const message of ChatAiOpenAiApi.chatMessagesHistory.slice(0, -1)) {
      postData.messages.push(message);
    }
    postData.messages.push(inputMessage);

    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      let details = "";
      try {
        details = JSON.stringify(await response.json());
      } catch {
        details = await response.text();
      }
      throw new Error(`LLM API error (${response.status}): ${details}`);
    }

    if (!response.body[Symbol.asyncIterator]) {
      response.body[Symbol.asyncIterator] = () => {
        const reader = response.body.getReader();
        return { next: () => reader.read() };
      };
    }

    const textDecoderStream = new TextDecoderStream();
    const stream = response.body.pipeThrough(textDecoderStream);

    if (!stream[Symbol.asyncIterator]) {
      stream[Symbol.asyncIterator] = () => {
        const reader = stream.getReader();
        return { next: () => reader.read() };
      };
    }

    let textMessage = "";
    for await (const brokenChunk of stream) {
      const chunk = brokenChunk.toString().replaceAll("data: ", "").replace("[DONE]", "").trim();
      try {
        const parsed = JSON.parse(chunk);
        const content = parsed.choices?.[0]?.delta?.content;
        textMessage += content ?? "";
        await chatMessage.update({ content: textMessage });
      } catch {
        try {
          const modifiedChunk = `[${chunk.replaceAll(/}\s*{/g, "},{")}]`;
          const parsedArray = JSON.parse(modifiedChunk);
          for (const entry of parsedArray) {
            const content = entry.choices?.[0]?.delta?.content;
            if (content) textMessage += content;
          }
          await chatMessage.update({ content: textMessage });
        } catch (error) {
          console.warn(chunk);
          ui.notifications.error("Error parsing LLM stream response.");
          console.error(error);
        }
      }
    }

    ChatAiOpenAiApi.chatMessagesHistory.push({ role: "assistant", content: textMessage });
    return textMessage;
  }

  async generateChatImage(prompt, chatMessage) {
    const apiImage = getImageApi();
    const dummyActorInput = {};
    await apiImage.generateImage(prompt, dummyActorInput);
    const imgHtml = apiImage.imageHtml.replace("<<img>>", dummyActorInput.imageSrc);
    await chatMessage.update({ content: imgHtml });
  }

  static #listenersBound = new WeakSet();

  static chatListeners(root) {
    const element = root instanceof HTMLElement ? root : root?.[0] ?? root?.get?.(0);
    if (!element || ChatAiOpenAiApi.#listenersBound.has(element)) return;
    ChatAiOpenAiApi.#listenersBound.add(element);

    onClick(element, ".actor-ai-img-gen", (_event, target) => {
      const src = target.getAttribute("src");
      new ActorAiImagePopup({ image: src }).render(true);
    });

    onClick(element, ".ai-image-copy", async (_event, target) => {
      const container = target.closest(".ai-image, .message-content, .chat-message");
      const img = querySelector(container ?? element, "img");
      if (!img?.src) return;

      const input = await fetch(img.src).then((response) => response.blob());
      await navigator.clipboard.write([
        new ClipboardItem({
          [input.type]: input,
        }),
      ]);
    });

    onClick(element, ".ai-image-save", async (_event, target) => {
      const container = target.closest(".ai-image, .message-content, .chat-message");
      const img = querySelector(container ?? element, "img");
      if (!img?.src) return;

      const input = await fetch(img.src).then((response) => response.blob());
      let nameString = "ai-image";
      nameString += `-${(Math.random() + 1).toString(36).substring(3)}`;
      nameString += ".png";
      await ActorAi.saveImageToFileSystem(input, nameString);
    });
  }
}
