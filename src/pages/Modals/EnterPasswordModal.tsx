import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import TgsPlayer from 'components/TgsPlayer';
import Modal from 'components/Modal';
import { selectMyMnemonicEncryptedWords, selectPopupState, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { decrypt } from 'utils/cryptUtils';

function EnterPasswordModal() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { onSuccess } = useAppSelector(selectPopupState);
    const myMnemonicEncryptedWords = useAppSelector(selectMyMnemonicEncryptedWords);
    const [password, setPassword] = useState('');
    const [hasPasswordError, setHasPasswordError] = useState(false);

    const changePasswordHandler = useCallback((event) => {
        setPassword(event.target.value)
    }, []);

    const nextHandler = useCallback(async () => {
        try {
            const words = await decrypt(myMnemonicEncryptedWords, password);
            dispatch(setPopup({
                popup: PopupEnum.void, state: {
                    myMnemonicWords: words.split(',')
                }
            }));
            onSuccess && onSuccess(dispatch, words.split(','));
        } catch (e) {
            return setHasPasswordError(true);
        }
    }, [dispatch, onSuccess, myMnemonicEncryptedWords, password]);

    const closeHandler = useCallback(() => {
        dispatch(setPopup({popup: PopupEnum.void}));
    }, [dispatch]);

    return (
        <Modal>
            <div id="enterPassword" className="popup" style={{'paddingBottom': '10px'}}>
                <div className="popup-title">{t('Password')}</div>

                <TgsPlayer name="enterPassword" src="assets/lottie/lock.tgs" width={150} height={150}/>
                <input id="enterPassword_input"
                       placeholder={t('Enter your password')}
                       type="password"
                       style={{'textAlign': 'center', 'width': '200px', 'marginLeft': '40px', 'fontSize': '15px'}}
                       className={hasPasswordError ? 'error' : ''}
                       value={password}
                       onChange={changePasswordHandler}
                />

                <div className="popup-footer">
                    <button id="enterPassword_cancelBtn"
                            className="btn-lite"
                            onClick={closeHandler}
                    >
                        {t('CANCEL')}
                    </button>
                    <button id="enterPassword_okBtn"
                            className="btn-lite"
                            onClick={nextHandler}
                    >
                        {t('NEXT')}
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export default EnterPasswordModal;
