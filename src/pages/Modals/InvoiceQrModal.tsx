import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import QRCodeImpl from 'easyqrcodejs';

import Modal from 'components/Modal';
import QRCode from 'components/QRCode';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { selectPopupState, setNotification, setPopup } from 'store/app/appSlice';
import { copyToClipboard } from 'utils/domUtils';
import { PopupEnum } from 'enums/popupEnum';

function InvoiceQrModal() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { amount, invoiceLink } = useAppSelector(selectPopupState);

    const shareTransferLinkHandler = useCallback(() => {
        const result = copyToClipboard(invoiceLink);
        dispatch(setNotification(result ? t('Transfer link copied to clipboard') : t("Can't copy link")));
    }, [dispatch, t, invoiceLink]);

    const closeHandler = useCallback(() => {
        dispatch(setPopup({ popup: PopupEnum.invoice }));
    }, [dispatch]);

    return (
        <Modal>
            <div id="invoiceQr" className="popup">
                <div className="popup-title">{t('Invoice QR')}</div>

                <QRCode
                    options={{
                        text: invoiceLink,
                        width: 185 * window.devicePixelRatio,
                        height: 185 * window.devicePixelRatio,
                        logo: 'assets/gem@large.png',
                        logoWidth: 44 * window.devicePixelRatio,
                        logoHeight: 44 * window.devicePixelRatio,
                        correctLevel: QRCodeImpl.CorrectLevel.L,
                    }}
                />

                <div className="input-label">{t('Expected Amount')}</div>

                <div id="invoiceQrAmount" className="popup-black-text">
                    {amount}
                </div>

                <button id="invoiceQr_shareBtn" className="btn-blue" onClick={shareTransferLinkHandler}>
                    {t('Share QR Code')}
                </button>

                <button id="invoiceQr_closeBtn" className="popup-close-btn" onClick={closeHandler} />
            </div>
        </Modal>
    );
}

export default InvoiceQrModal;
