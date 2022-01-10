import { useLayoutEffect, useRef } from 'react';
import lottie, { AnimationItem } from 'lottie-web';
import pako from 'pako';

interface TgsPlayerProps {
    name: string;
    src: string;
    width: number;
    height: number;
    className?: string;
    style?: Record<string, string>
}

function TgsPlayer({name, src, width, height, className, style}: TgsPlayerProps) {
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const element = ref.current;
        let lottieInstance: AnimationItem;
        const canvas = document.createElement('canvas');
        const xmlHttp = new XMLHttpRequest();
        xmlHttp.responseType = 'arraybuffer';
        xmlHttp.onreadystatechange = function () {
            if (xmlHttp.readyState === 4) {
                if (xmlHttp.status === 200) {
                    canvas.setAttribute('width', `${width * window.devicePixelRatio}`);
                    canvas.setAttribute('height', `${height * window.devicePixelRatio}`);
                    canvas.style.width = width + 'px';
                    canvas.style.height = height + 'px';
                    element?.appendChild(canvas);
                    const ctx = canvas.getContext('2d');

                    const animationData = JSON.parse(new TextDecoder('utf-8').decode(pako.inflate(xmlHttp.response)));
                    lottieInstance = lottie.loadAnimation({
                        renderer: 'canvas' as any,
                        loop: name === 'processing' || name === 'start' || name === 'about',
                        autoplay: false,
                        animationData,
                        rendererSettings: {
                            context: ctx,
                            scaleMode: 'noScale',
                            clearCanvas: true
                        },
                    } as any);
                    ctx?.clearRect(0, 0, 1000, 1000);
                    lottieInstance.play();
                }
            }
        };
        xmlHttp.open("GET", src, true);
        xmlHttp.send(null);
        return () => {
            if (lottieInstance) {
                lottieInstance.stop();
            }
            element?.removeChild(canvas)
        }
    }, [width, height, name, src])

    return (
        <div className={className} style={style} ref={ref}/>
    )
}

export default TgsPlayer;
