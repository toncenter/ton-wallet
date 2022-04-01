const unclearedKeys = [
    'windowState',
    'locale',
    'isTestnet',
    'isDebug'
];

/**
 * localStorage polyfill for chromium-based browsers extension environment
 */
const storage = self.localStorage || {
    setItem(key, value) {
        return chrome.storage.local.set({[key]: value});
    },

    getItem(key) {
        return chrome.storage.local.get(key)
            .then(({[key]: value}) => value);
    },

    removeItem(key) {
        return chrome.storage.local.remove(key);
    },

    clear() {
        return chrome.storage.local.clear();
    }
};

const clearStorage = async () => {
    const saved = {};
    for (let key of unclearedKeys) saved[key] = await storage.getItem(key);

    await storage.clear();

    for (const [key, value] of Object.entries(saved)) {
        await storage.setItem(key, value);
    }
};

export { storage, clearStorage }
