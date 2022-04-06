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
    '/libs/tonweb.min.js',
    '/libs/tonweb-mnemonic.min.js',
    '/js/Controller.js',
);
