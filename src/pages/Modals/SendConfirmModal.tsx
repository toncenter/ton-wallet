import { useCallback, useEffect } from 'react';

import Modal from 'components/Modal';
import { selectPopupState, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import TonAddress from 'components/TonAddress';
import { getFees, walletSend } from 'store/app/appThunks';
import * as TonWeb from 'tonweb';

function SendConfirmModal() {
    const dispatch = useAppDispatch();
    const { address, amount, comment, fee } = useAppSelector(selectPopupState);

    useEffect(() => {
       dispatch(getFees({
           payload: {
               address,
               comment,
               amount
           }
       }))
    }, [dispatch, address, comment, amount]);

    const sendHandler = useCallback(() => {
        dispatch(setPopup({
            popup: PopupEnum.enterPassword, state: {
                onSuccess: (words: string[]) => {
                    dispatch(setPopup({
                        popup: PopupEnum.processing,
                    }));
                    dispatch(walletSend({
                        payload: {
                            address,
                            comment,
                            amount,
                            words,
                        }
                    }))
                }
            }
        }));
    }, [dispatch, address, comment, amount]);

    const closeHandler = useCallback(() => {
        dispatch(setPopup({popup: PopupEnum.void}));
    }, [dispatch]);

    return (
        <Modal>
            <div id="sendConfirm" className="popup" style={{"paddingBottom": "10px"}}>
                <div className="popup-title">Confirmation</div>
                <div className="popup-black-text">Do you want to send <b id="sendConfirmAmount">{TonWeb.utils.fromNano(new TonWeb.utils.BN(amount))} TON</b> to:</div>

                <TonAddress id="sendConfirmAddr" address={address} />

                <div id="sendConfirmFee" className="popup-grey-text" style={{'textAlign': 'center'}}>Fee: ~{TonWeb.utils.fromNano(new TonWeb.utils.BN(fee))} TON</div>

                <div className="popup-grey-text" style={{"textAlign": "center"}}>
                    Note: Your comment will not be <b>encrypted</b>
                </div>

                <button id="sendConfirm_closeBtn"
                        className="popup-close-btn"
                        onClick={closeHandler}
                />

                <div className="popup-footer">
                    <button id="sendConfirm_cancelBtn"
                            className="btn-lite"
                            onClick={closeHandler}
                    >
                        CANCEL
                    </button>
                    <button id="sendConfirm_okBtn"
                            className="btn-lite"
                            onClick={sendHandler}
                    >
                        SEND TON
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export default SendConfirmModal
