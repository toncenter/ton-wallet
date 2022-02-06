/**
 *  `localStorage` polyfill for Chrome Extension environment
 */

module.exports = self.localStorage || {
    setItem(key, value) {
        return chrome.storage.local.set({ [key]: value });
    },

    getItem(key) {
        return chrome.storage.local.get(key)
            .then(({ [key]: value }) => value);
    },

    removeItem(key) {
        return chrome.storage.local.remove(key);
    },

    clear() {
        return chrome.storage.local.clear();
    },
};
