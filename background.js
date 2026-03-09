const MENU_PARENT_ID = "perplexity-actions";
const MENU_EDITABLE_ID = "perplexity-editable";
const MENU_INSTANT_ID = "perplexity-instant";
const PERPLEXITY_HOME_URL = "https://www.perplexity.ai/";
const PERPLEXITY_SEARCH_URL = "https://www.perplexity.ai/search?q=";
const pendingPromptsByTabId = new Map();

function createMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_PARENT_ID,
      title: "Perplexity",
      contexts: ["selection", "page"]
    });

    chrome.contextMenus.create({
      id: MENU_EDITABLE_ID,
      parentId: MENU_PARENT_ID,
      title: "[Edit] Fill prompt on Perplexity",
      contexts: ["selection", "page"]
    });

    chrome.contextMenus.create({
      id: MENU_INSTANT_ID,
      parentId: MENU_PARENT_ID,
      title: "[Go] Search on Perplexity now",
      contexts: ["selection", "page"]
    });
  });
}

function buildPromptFromContext(info, tab) {
  const selectedText = (info.selectionText || "").trim();
  if (selectedText) {
    return selectedText;
  }

  const pageUrl = (info.pageUrl || "").trim();
  if (pageUrl && !pageUrl.startsWith("chrome://")) {
    return pageUrl;
  }

  const tabUrl = (tab && tab.url ? tab.url : "").trim();
  if (tabUrl && !tabUrl.startsWith("chrome://")) {
    return tabUrl;
  }

  return "";
}

chrome.runtime.onInstalled.addListener(createMenus);
chrome.runtime.onStartup.addListener(createMenus);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const prompt = buildPromptFromContext(info, tab);

  if (info.menuItemId === MENU_INSTANT_ID) {
    if (!prompt) {
      chrome.tabs.create({ url: PERPLEXITY_HOME_URL });
      return;
    }

    const url = `${PERPLEXITY_SEARCH_URL}${encodeURIComponent(prompt)}`;
    chrome.tabs.create({ url });
    return;
  }

  if (info.menuItemId !== MENU_EDITABLE_ID) {
    return;
  }

  chrome.tabs.create({ url: PERPLEXITY_HOME_URL }, (newTab) => {
    if (newTab && typeof newTab.id === "number" && prompt) {
      pendingPromptsByTabId.set(newTab.id, prompt);
    }
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  pendingPromptsByTabId.delete(tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") {
    return;
  }

  const prompt = pendingPromptsByTabId.get(tabId);
  if (!prompt) {
    return;
  }

  if (!tab.url || !tab.url.startsWith(PERPLEXITY_HOME_URL)) {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: async (value) => {
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const isEditable = (element) => {
          if (!element) return false;
          if (element.matches("textarea") || element.matches("input[type='text']")) {
            return !element.disabled && !element.readOnly;
          }
          return element.isContentEditable;
        };

        const findInput = () => {
          const selectors = [
            "textarea",
            "input[type='text']",
            "div[contenteditable='true']"
          ];

          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              if (!isEditable(element)) continue;

              const rect = element.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) continue;

              return element;
            }
          }

          return null;
        };

        let input = null;
        for (let i = 0; i < 50; i += 1) {
          input = findInput();
          if (input) break;
          await sleep(200);
        }

        if (!input) {
          return false;
        }

        input.focus();

        if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
          const proto = Object.getPrototypeOf(input);
          const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
          if (descriptor && descriptor.set) {
            descriptor.set.call(input, value);
          } else {
            input.value = value;
          }
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.setSelectionRange(value.length, value.length);
          return true;
        }

        if (input.isContentEditable) {
          input.textContent = value;
          input.dispatchEvent(
            new InputEvent("input", {
              bubbles: true,
              data: value,
              inputType: "insertText"
            })
          );
          return true;
        }

        return false;
      },
      args: [prompt]
    });
  } finally {
    pendingPromptsByTabId.delete(tabId);
  }
});