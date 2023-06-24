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
}

importScripts(
    '/libs/aes-js-3.1.2.js',
    '/libs/noble-ed25519-1.7.3.js',
    '/libs/tonweb.min.js',
    '/libs/tonweb-mnemonic.min.js',
    '/js/Controller.js',
);
