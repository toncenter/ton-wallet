import QRCodeImpl from 'easyqrcodejs';

import Modal from 'components/Modal';
import QRCode from 'components/QRCode';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { selectIsLedger, selectPopupState, setNotification, setPopup } from 'store/app/appSlice';
import React, { useCallback } from 'react';
import { PopupEnum } from 'enums/popupEnum';
import { copyToClipboard } from 'utils/domUtils';
import TonAddress from 'components/TonAddress';

function ReceiveModal() {
    const dispatch = useAppDispatch();
    const isLedger = useAppSelector(selectIsLedger)
    const { address } = useAppSelector(selectPopupState);

    const shareAddressHandler = useCallback(() => {
        const result = copyToClipboard(address);
        dispatch(setNotification(result ? 'Wallet address copied to clipboard' : 'Can\'t copy link'));
    }, [dispatch, address]);

    const shareTransferLinkHandler = useCallback(() => {
        const result = copyToClipboard('ton://transfer/' + address);
        dispatch(setNotification(result ? 'Transfer link copied to clipboard' : 'Can\'t copy link'));
    }, [dispatch, address]);

    const createInvoiceHandler = useCallback(() => {
        dispatch(setPopup({popup: PopupEnum.invoice, state: {
                address
        }}));
    }, [dispatch, address]);

    const closeHandler = useCallback(() => {
        dispatch(setPopup({popup: PopupEnum.void}));
    }, [dispatch]);

    return (
        <Modal>
            <div id="receive" className="popup">
                <div className="popup-title">Receive TON</div>
                <div className="popup-text">Share this address to receive TON.
                </div>

                <QRCode options={{
                    text: 'ton://transfer/' + address,
                    width: 185 * window.devicePixelRatio,
                    height: 185 * window.devicePixelRatio,
                    logo: "assets/gem@large.png",
                    logoWidth: 44 * window.devicePixelRatio,
                    logoHeight: 44 * window.devicePixelRatio,
                    correctLevel: QRCodeImpl.CorrectLevel.L
                }}/>

                <TonAddress address={address} className={"my-addr"} onSelect={shareAddressHandler}/>

                {
                    isLedger &&
                  <button id="receive_showAddressOnDeviceBtn" className="btn-lite btn-lite-first">
                    Show Address on Device
                  </button>
                }

                <button id="receive_invoiceBtn"
                        className="btn-lite"
                        onClick={createInvoiceHandler}
                >
                    Create Invoice
                </button>

                <button id="receive_shareBtn"
                        className="btn-blue"
                        onClick={shareTransferLinkHandler}
                >
                    Share Wallet Address
                </button>

                <button id="receive_closeBtn"
                        className="popup-close-btn"
                        onClick={closeHandler}
                />
            </div>
        </Modal>
    )
}

export default ReceiveModal;
