import { useCallback, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import * as TonWeb from 'tonweb';

import Modal from 'components/Modal';
import { selectIsLedger, selectPopupState, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import TonAddress from 'components/TonAddress';
import { getFees, walletSend } from 'store/app/appThunks';
import { AppDispatch } from 'store/store';

function SendConfirmModal() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const isLedger = useAppSelector(selectIsLedger);
    const { address, amount, comment, fee } = useAppSelector(selectPopupState);

    useEffect(() => {
        dispatch(
            getFees({
                payload: {
                    address,
                    comment,
                    amount,
                },
            }),
        );
    }, [dispatch, address, comment, amount]);

    useEffect(() => {
        if (isLedger && fee && Number(fee) !== 0) {
            dispatch(
                walletSend({
                    payload: {
                        address,
                        comment,
                        amount,
                    },
                }),
            );
        }
    }, [dispatch, isLedger, fee, address, comment, amount]);

    const sendHandler = useCallback(() => {
        dispatch(
            setPopup({
                popup: PopupEnum.enterPassword,
                state: {
                    onSuccess: (dispatch: AppDispatch, words: string[]) => {
                        dispatch(
                            setPopup({
                                popup: PopupEnum.processing,
                            }),
                        );
                        dispatch(
                            walletSend({
                                payload: {
                                    address,
                                    comment,
                                    amount,
                                    words,
                                },
                            }),
                        );
                    },
                },
            }),
        );
    }, [dispatch, address, comment, amount]);

    const closeHandler = useCallback(() => {
        dispatch(setPopup({ popup: PopupEnum.void }));
    }, [dispatch]);

    return (
        <Modal>
            <div id="sendConfirm" className="popup" style={{ paddingBottom: '10px' }}>
                <div className="popup-title">{t('Confirmation')}</div>
                <div className="popup-black-text">
                    <Trans>
                        Do you want to send{' '}
                        <b id="sendConfirmAmount">
                            {{ amount: TonWeb.utils.fromNano(new TonWeb.utils.BN(amount)) }} TON
                        </b>{' '}
                        to:
                    </Trans>
                </div>

                <TonAddress id="sendConfirmAddr" address={address} />

                <div id="sendConfirmFee" className="popup-grey-text" style={{ textAlign: 'center' }}>
                    <Trans>Fee: ~{{ fee: TonWeb.utils.fromNano(new TonWeb.utils.BN(fee)) }} TON</Trans>
                </div>

                <div className="popup-grey-text" style={{ textAlign: 'center' }}>
                    <Trans>
                        Note: Your comment will not be <b>encrypted</b>
                    </Trans>
                </div>
                {!isLedger && <button id="sendConfirm_closeBtn" className="popup-close-btn" onClick={closeHandler} />}
                {!isLedger && (
                    <div className="popup-footer">
                        <button id="sendConfirm_cancelBtn" className="btn-lite" onClick={closeHandler}>
                            {t('CANCEL')}
                        </button>
                        <button id="sendConfirm_okBtn" className="btn-lite" onClick={sendHandler}>
                            {t('SEND TON')}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default SendConfirmModal;
