/**
 *  `localStorage` polyfill for Chrome Extension environment
 */

export default self.localStorage || {
    /**
     * @param key   {string}
     * @param value {string}
     * @return {Promise<void>}
     */
    setItem(key, value) {
        return chrome.storage.local.set({[key]: value});
    },

    /**
     * @param key   {string}
     * @return {Promise<string | null>}
     */
    getItem(key) {
        return chrome.storage.local.get(key)
            .then(({[key]: value}) => value);
    },

    /**
     * @param key   {string}
     * @return {Promise<void>}
     */
    removeItem(key) {
        return chrome.storage.local.remove(key);
    },

    /**
     * @return {Promise<void>}
     */
    clear() {
        return chrome.storage.local.clear();
    },
};
