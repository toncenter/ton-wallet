import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import Modal from 'components/Modal';
import { useAppDispatch } from 'store/hooks';
import { setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';

function ConnectLedgerModal() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();

    const closeHandler = useCallback(() => {
        dispatch(
            setPopup({
                popup: PopupEnum.void,
            }),
        );
    }, [dispatch]);

    return (
        <Modal>
            <div id="connectLedger" className="popup" style={{ paddingBottom: '10px' }}>
                <div className="popup-title">{t('Connect Ledger')}</div>
                <div className="popup-black-text">{t('Please use Edge/Google Chrome v89 or later.')}</div>
                <div className="popup-black-text" style={{ marginTop: '20px' }}>
                    {t('Turn off Ledger Live.')}
                </div>
                <div className="popup-black-text" style={{ marginTop: '20px' }}>
                    {t('If it does not connect, then try reconnecting the device.')}
                </div>

                <div className="popup-footer">
                    <button id="connectLedger_cancelBtn" className="btn-lite" onClick={closeHandler}>
                        {t('OK')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default ConnectLedgerModal;
