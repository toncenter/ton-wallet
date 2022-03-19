import {$$} from "./Utils.js";

var lotties = {};

function initLottie(div) {
    return new Promise((resolve, reject) => {
        const url = div.getAttribute('src');
        const name = div.getAttribute('data-name');
        const w = Number(div.getAttribute('width'));
        const h = Number(div.getAttribute('height'));

        const xmlHttp = new XMLHttpRequest();
        xmlHttp.responseType = 'arraybuffer';
        xmlHttp.onreadystatechange = function () {
            if (xmlHttp.readyState !== 4) return;
            if (xmlHttp.status !== 200) return reject();

            lotties[name] = lottie.loadAnimation({
                container: div,
                renderer: 'svg',
                loop: name === 'processing' || name === 'start' || name === 'about',
                autoplay: false,
                animationData: JSON.parse(
                    new TextDecoder('utf-8').decode(pako.inflate(xmlHttp.response))
                )
            });

            resolve();
        };
        xmlHttp.open("GET", url, true);
        xmlHttp.send(null);
    });
}

async function initLotties() {
    const divs = $$('tgs-player');
    for (let i = 0; i < divs.length; i++) {
        await initLottie(divs[i]);
    }
}

function toggleLottie(lottie, visible) {
    if (!lottie) return;

    if (visible) lottie.play();
    else lottie.stop();
}

export {initLotties, toggleLottie, lotties};
