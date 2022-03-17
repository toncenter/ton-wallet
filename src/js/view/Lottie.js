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
            if (xmlHttp.readyState === 4) {
                if (xmlHttp.status === 200) {
                    const canvas = document.createElement('canvas');
                    canvas.setAttribute('width', w * window.devicePixelRatio);
                    canvas.setAttribute('height', h * window.devicePixelRatio);
                    canvas.style.width = w + 'px';
                    canvas.style.height = h + 'px';
                    div.appendChild(canvas);
                    const ctx = canvas.getContext('2d');

                    const animationData = JSON.parse(new TextDecoder('utf-8').decode(pako.inflate(xmlHttp.response)));
                    lotties[name] = {
                        ctx: ctx,
                        player: lottie.loadAnimation({
                            renderer: 'canvas',
                            loop: name === 'processing' || name === 'start' || name === 'about',
                            autoplay: false,
                            animationData,
                            rendererSettings: {
                                context: ctx,
                                scaleMode: 'noScale',
                                clearCanvas: true
                            },
                        })
                    };
                    ctx.clearRect(0, 0, 1000, 1000);
                    resolve();
                } else {
                    reject();
                }
            }
        };
        xmlHttp.open("GET", url, true);
        xmlHttp.send(null);
    });
}

async function initLotties() {
    const divs = $$('tgs-player');
    const promises = [];
    for (let i = 0; i < divs.length; i++) {
        const p = initLottie(divs[i]);
        promises.push(p);
    }
    await Promise.all(promises);
}

export {initLotties, lotties};