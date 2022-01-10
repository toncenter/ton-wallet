import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
    children: React.ReactNode;
    onClose: Function;
}

function Modal({ children, onClose }: ModalProps) {
    const el = React.useMemo(() => {
        const element = document.createElement("div");
        element.setAttribute('id', 'modal');
        element.addEventListener('click', (event) => {
            event.preventDefault();
            if(event.target === event.currentTarget) {
                onClose();
            }
        });
        return element;
    }, [onClose]);

    React.useEffect(() => {
        const target = document.body;
        target.appendChild(el);
        return () => {
            target.removeChild(el);
        };
    }, [el]);

    return ReactDOM.createPortal((
        <>{children}</>
    ), el);
}

export default Modal;
