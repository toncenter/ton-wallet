import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Modal from 'components/Modal';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { selectPopupState, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';
import TonAddress from 'components/TonAddress';
import { AppDispatch } from 'store/store';
import { rawSign } from 'store/app/appThunks';

function SignConfirmModal() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { hexToSign } = useAppSelector(selectPopupState);

    const signData = useMemo(() => {
        return hexToSign.length > 48 ? hexToSign.substring(0, 47) + '…' : hexToSign;
    }, [hexToSign]);

    const signHandler = useCallback(() => {
        dispatch(
            setPopup({
                popup: PopupEnum.enterPassword,
                state: {
                    onSuccess: (dispatch: AppDispatch, words: string[]) => {
                        dispatch(
                            setPopup({
                                popup: PopupEnum.void,
                            }),
                        );
                        dispatch(
                            rawSign({
                                payload: {
                                    words,
                                    hexToSign,
                                },
                            }),
                        );
                    },
                },
            }),
        );
    }, [dispatch, hexToSign]);

    const closeHandler = useCallback(() => {
        dispatch(
            setPopup({
                popup: PopupEnum.void,
                state: {
                    signature: {
                        value: '',
                        successed: false,
                    },
                },
            }),
        );
    }, [dispatch]);

    return (
        <Modal>
            <div id="signConfirm" className="popup" style={{ paddingBottom: '10px' }}>
                <div className="popup-title">{t('Confirmation')}</div>
                <div className="popup-black-text">{t('Do you want to sign:')}</div>

                <TonAddress id="signConfirmData" address={signData} />

                <div className="popup-grey-text" style={{ textAlign: 'center', fontWeight: 'bold', color: '#D74D4D' }}>
                    {t('Signing custom data is very dangerous. Use only if you know what you are doing.')}
                </div>

                <button id="signConfirm_closeBtn" className="popup-close-btn" onClick={closeHandler} />

                <div className="popup-footer">
                    <button id="signConfirm_cancelBtn" className="btn-lite" onClick={closeHandler}>
                        {t('CANCEL')}
                    </button>
                    <button id="signConfirm_okBtn" className="btn-lite" onClick={signHandler}>
                        {t('SIGN')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default SignConfirmModal;
