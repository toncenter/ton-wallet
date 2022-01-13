import { ReactNode, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';

import { useAppDispatch } from 'store/hooks';
import { setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';

interface ModalProps {
    children: ReactNode;
    onClose?: Function;
}

function Modal({ children, onClose }: ModalProps) {
    const dispatch = useAppDispatch();

    const el = useMemo(() => {
        const element = document.createElement("div");
        element.setAttribute('id', 'modal');
        element.addEventListener('mousedown', (event) => {
            if(event.target === event.currentTarget) {
                dispatch(setPopup({popup: PopupEnum.void}));
                onClose && onClose();
            }
        });
        return element;
    }, [dispatch, onClose]);

    useEffect(() => {
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
