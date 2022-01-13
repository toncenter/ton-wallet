import Modal from 'components/Modal';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { selectBalance, selectPopupState, setPopup } from 'store/app/appSlice';
import { useCallback, useEffect, useRef } from 'react';
import { PopupEnum } from '../../enums/popupEnum';
import * as TonWeb from 'tonweb';

function SendModal() {
    const dispatch = useAppDispatch();
    const balance = useAppSelector(selectBalance);
    const { address } = useAppSelector(selectPopupState);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(()=> {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const changeHandler = useCallback((event) => {
        dispatch(setPopup({popup: PopupEnum.send, state: {
            address: event.target.value,
        }}));
    }, [dispatch]);

    const closeHandler = useCallback(() => {
        dispatch(setPopup({popup: PopupEnum.void}));
    }, [dispatch]);

    return (
        <Modal>
            <div id="send" className="popup">
                <div className="popup-title">Send TON</div>

                <div className="input-label">Recipient wallet address</div>
                <input ref={inputRef}
                       id="toWalletInput"
                       type="text"
                       placeholder="Enter wallet address"
                       value={address}
                       onChange={changeHandler}
                />

                <div className="popup-grey-text">
                    Copy the 48-letter wallet address of the
                    recipient here or ask them to send you a
                    ton:// link
                </div>

                <div style={{'position': 'relative', 'width': '100%'}}>
                    <div className="input-label">Amount</div>
                    <div id="sendBalance">Balance: {TonWeb.utils.fromNano(balance)} 💎</div>
                </div>

                <input id="amountInput" type="number" placeholder="0.0"/>
                <input id="commentInput" type="text" placeholder="Comment (optional)"/>

                <button id="send_btn" className="btn-blue">Send TON</button>

                <button id="send_closeBtn"
                        className="popup-close-btn"
                        onClick={closeHandler}
                />
            </div>
        </Modal>
    )
}

export default SendModal;
