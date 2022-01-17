import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import QRCodeImpl from 'easyqrcodejs';

import Modal from 'components/Modal';
import QRCode from 'components/QRCode';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { selectIsLedger, selectPopupState, setNotification, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';
import { copyToClipboard } from 'utils/domUtils';
import TonAddress from 'components/TonAddress';
import { showAddressOnDevice } from 'store/app/appThunks';

function ReceiveModal() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const isLedger = useAppSelector(selectIsLedger);
    const { address } = useAppSelector(selectPopupState);

    const shareAddressHandler = useCallback(() => {
        const result = copyToClipboard(address);
        dispatch(setNotification(result ? t('Wallet address copied to clipboard') : t("Can't copy link")));
    }, [dispatch, t, address]);

    const shareTransferLinkHandler = useCallback(() => {
        const result = copyToClipboard('ton://transfer/' + address);
        dispatch(setNotification(result ? t('Transfer link copied to clipboard') : t("Can't copy link")));
    }, [dispatch, t, address]);

    const createInvoiceHandler = useCallback(() => {
        dispatch(
            setPopup({
                popup: PopupEnum.invoice,
                state: {
                    address,
                },
            }),
        );
    }, [dispatch, address]);

    const showAddressHandler = useCallback(() => {
        dispatch(setNotification(t('Please check the address on your device')));
        dispatch(showAddressOnDevice());
    }, [dispatch, t]);

    const closeHandler = useCallback(() => {
        dispatch(setPopup({ popup: PopupEnum.void }));
    }, [dispatch]);

    return (
        <Modal>
            <div id="receive" className="popup">
                <div className="popup-title">{t('Receive TON')}</div>
                <div className="popup-text">{t('Share this address to receive TON.')}</div>

                <QRCode
                    options={{
                        text: 'ton://transfer/' + address,
                        width: 185 * window.devicePixelRatio,
                        height: 185 * window.devicePixelRatio,
                        logo: 'assets/gem@large.png',
                        logoWidth: 44 * window.devicePixelRatio,
                        logoHeight: 44 * window.devicePixelRatio,
                        correctLevel: QRCodeImpl.CorrectLevel.L,
                    }}
                />

                <TonAddress address={address} className={'my-addr'} onSelect={shareAddressHandler} />

                {isLedger && (
                    <button
                        id="receive_showAddressOnDeviceBtn"
                        className="btn-lite btn-lite-first"
                        onClick={showAddressHandler}
                    >
                        {t('Show Address on Device')}
                    </button>
                )}

                <button id="receive_invoiceBtn" className="btn-lite" onClick={createInvoiceHandler}>
                    {t('Create Invoice')}
                </button>

                <button id="receive_shareBtn" className="btn-blue" onClick={shareTransferLinkHandler}>
                    {t('Share Wallet Address')}
                </button>

                <button id="receive_closeBtn" className="popup-close-btn" onClick={closeHandler} />
            </div>
        </Modal>
    );
}

export default ReceiveModal;
