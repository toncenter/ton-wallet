import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import TgsPlayer from 'components/TgsPlayer';
import Modal from 'components/Modal';
import { selectIsTestnet, selectMyMnemonicEncryptedWords, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { decrypt } from 'utils/cryptUtils';
import { saveWords } from 'store/app/appThunks';

function ChangePasswordModal() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const isTestnet = useAppSelector(selectIsTestnet);
    const myMnemonicEncryptedWords = useAppSelector(selectMyMnemonicEncryptedWords);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [hasOldPasswordError, setHasOldPasswordError] = useState(false);
    const [hasNewPasswordError, setHasNewPasswordError] = useState(false);
    const [hasRepeatPasswordError, setHasRepeatPasswordError] = useState(false);

    const changeOldPasswordHandler = useCallback((event) => {
        setOldPassword(event.target.value);
        setHasOldPasswordError(false);
    }, []);

    const changeNewPasswordHandler = useCallback((event) => {
        setNewPassword(event.target.value);
        setHasNewPasswordError(false);
    }, []);

    const changeRepeatPasswordHandler = useCallback((event) => {
        setRepeatPassword(event.target.value);
        setHasOldPasswordError(false);
    }, []);

    const saveHandler = useCallback(async () => {
        let words;
        try {
            words = await decrypt(myMnemonicEncryptedWords, oldPassword);
        } catch (e) {
            return setHasOldPasswordError(true);
        }
        if (newPassword.length === 0 && !isTestnet) {
            setHasNewPasswordError(true);
            return;
        }
        if (newPassword !== repeatPassword) {
            setHasRepeatPasswordError(true);
            return;
        }
        dispatch(
            saveWords({
                payload: {
                    words: words.split(','),
                    password: newPassword,
                },
                onSuccess: () => dispatch(setPopup({ popup: PopupEnum.void })),
            }),
        );
    }, [dispatch, oldPassword, newPassword, repeatPassword, myMnemonicEncryptedWords, isTestnet]);

    const closeHandler = useCallback(() => {
        dispatch(setPopup({ popup: PopupEnum.void }));
    }, [dispatch]);

    return (
        <Modal>
            <div id="changePassword" className="popup" style={{ paddingBottom: '10px' }}>
                <div className="popup-title">{t('Change Password')}</div>

                <TgsPlayer name="changePassword" src="assets/lottie/lock.tgs" width={150} height={150} />

                <input
                    id="changePassword_oldInput"
                    placeholder={t('Enter your old password')}
                    type="password"
                    style={{ textAlign: 'center', width: '200px', marginLeft: '40px', fontSize: '15px' }}
                    className={hasOldPasswordError ? 'error' : ''}
                    onChange={changeOldPasswordHandler}
                />
                <input
                    id="changePassword_newInput"
                    placeholder={t('Enter a new password')}
                    type="password"
                    style={{
                        textAlign: 'center',
                        width: '200px',
                        marginLeft: '40px',
                        fontSize: '15px',
                        marginTop: '20px',
                    }}
                    className={hasNewPasswordError ? 'error' : ''}
                    onChange={changeNewPasswordHandler}
                />
                <input
                    id="changePassword_repeatInput"
                    placeholder={t('Repeat the new password')}
                    type="password"
                    style={{ textAlign: 'center', width: '200px', marginLeft: '40px', fontSize: '15px' }}
                    className={hasRepeatPasswordError ? 'error' : ''}
                    onChange={changeRepeatPasswordHandler}
                />

                <div className="popup-footer">
                    <button id="changePassword_cancelBtn" className="btn-lite" onClick={closeHandler}>
                        {t('CANCEL')}
                    </button>
                    <button id="changePassword_okBtn" className="btn-lite" onClick={saveHandler}>
                        {t('SAVE')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default ChangePasswordModal;
