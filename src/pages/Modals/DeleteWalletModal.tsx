import { useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import Modal from 'components/Modal';
import { disconnect, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';
import { useAppDispatch } from 'store/hooks';

function DeleteWalletModal() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();

    const disconnectHandler = useCallback(() => {
        dispatch(disconnect());
    }, [dispatch]);

    const closeHandler = useCallback(() => {
        dispatch(setPopup({ popup: PopupEnum.void }));
    }, [dispatch]);

    return (
        <Modal>
            <div id="delete" className="popup" style={{ paddingBottom: '10px' }}>
                <div className="popup-title">{t('Delete Wallet')}</div>
                <div className="popup-black-text">
                    <Trans>
                        This will disconnect the wallet from this
                        <br />
                        app. You will be able to restore your
                        <br />
                        wallet using <b>24 secret words</b> - or import
                        <br />
                        another wallet.
                    </Trans>
                </div>
                <div className="popup-black-text" style={{ marginTop: '20px' }}>
                    <Trans>
                        Wallets are located in the decentralized
                        <br />
                        TON Blockchain. If you want the wallet to
                        <br />
                        be deleted simply transfer all the TON
                        <br />
                        from it and leave it empty.
                    </Trans>
                </div>

                <div className="popup-footer">
                    <button id="delete_cancelBtn" className="btn-lite" onClick={closeHandler}>
                        {t('CANCEL')}
                    </button>
                    <button id="delete_okBtn" className="btn-lite btn-lite-red" onClick={disconnectHandler}>
                        {t('DISCONNECT')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default DeleteWalletModal;
