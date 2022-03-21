if(typeof importScripts !== 'function') {
    const injectScript = path => {
        return new Promise(resolve => {
            const scriptTag = document.createElement('script');
            scriptTag.setAttribute('src', path);
            scriptTag.addEventListener('load', resolve);
            document.body.appendChild(scriptTag);
        });
    };

    window.importScripts = async (...scripts) => {
        for (const path of scripts) {
            await injectScript(path);
        }
    };
} else {
    chrome.runtime.onInstalled.addListener(async () => {
        for (const cs of chrome.runtime.getManifest().content_scripts) {
            for (const tab of await chrome.tabs.query({ url: cs.matches })) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id, allFrames: true },
                    files: cs.js,
                });
            }
        }
    });
}

importScripts(
    '/libs/tonweb.min.js',
    '/libs/tonweb-mnemonic.min.js',
    '/js/Controller.js',
);
