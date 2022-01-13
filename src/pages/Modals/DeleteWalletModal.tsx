import { useCallback } from 'react';

import Modal from 'components/Modal';
import { disconnect, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';
import { useAppDispatch } from 'store/hooks';

function DeleteWalletModal() {
    const dispatch = useAppDispatch();

    const disconnectHandler = useCallback(() => {
        dispatch(disconnect());
    }, [dispatch])

    const closeHandler = useCallback(() => {
        dispatch(setPopup({popup: PopupEnum.void}));
    }, [dispatch]);

    return (
        <Modal>
            <div id="delete" className="popup" style={{"paddingBottom": "10px"}}>
                <div className="popup-title">Delete Wallet</div>
                <div className="popup-black-text">
                    This will disconnect the wallet from this<br/>
                    app. You will be able to restore your<br/>
                    wallet using <b>24 secret words</b> - or import<br/>
                    another wallet.
                </div>
                <div className="popup-black-text" style={{"marginTop": "20px"}}>
                    Wallets are located in the decentralized<br/>
                    TON Blockchain. If you want the wallet to<br/>
                    be deleted simply transfer all the TON<br/>
                    from it and leave it empty.
                </div>

                <div className="popup-footer">
                    <button id="delete_cancelBtn"
                            className="btn-lite"
                            onClick={closeHandler}
                    >
                        CANCEL
                    </button>
                    <button id="delete_okBtn"
                            className="btn-lite btn-lite-red"
                            onClick={disconnectHandler}
                    >
                        DISCONNECT
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export default DeleteWalletModal;
