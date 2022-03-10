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
    '/libs/tonweb.js',
    '/libs/tonweb-mnemonic.js',
    '/js/Controller.js',
);
