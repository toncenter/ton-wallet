import QRCodeImpl from 'easyqrcodejs';
import { useLayoutEffect, useRef } from 'react';

interface QRCodeProps {
    options: {
        text: string,
        width: number,
        height: number,
        logo: string,
        logoWidth: number,
        logoHeight: number,
        correctLevel: number,
    }
}

function QRCode({options}: QRCodeProps) {
    const qrCodeRef = useRef<HTMLInputElement>(null);

    useLayoutEffect(() => {
        let qrcode: QRCodeImpl;
        if (qrCodeRef.current) {
            qrcode = new QRCodeImpl(qrCodeRef.current, options)
        }
        return () => {
            if (qrcode) {
                qrcode.clear()
            }
        }
    }, [options])

    return (
        <div className="qr-container">
            <div ref={qrCodeRef} id="qr" />
        </div>
    )
}

export default QRCode;
