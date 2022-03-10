if(!window.importScripts) {
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
}

importScripts(
    '/libs/tonweb-0.0.33.js',
    '/libs/tonweb-mnemonic-1.0.1.js',
    '/js/Controller.js',
);
