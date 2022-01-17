import { ChangeEvent, useCallback, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import TgsPlayer from 'components/TgsPlayer';
import { useAppDispatch } from 'store/hooks';
import { savePrivateKey } from 'store/app/appThunks';
import { setScreen } from 'store/app/appSlice';
import { ScreenEnum } from 'enums/screenEnum';

function CreatePasswordPage() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [submitted, setSubmitted] = useState(false);
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');

    const showScreen = useCallback(
        (screen: ScreenEnum) => {
            setSubmitted(true);
            if (password && password === repeatPassword) {
                dispatch(
                    savePrivateKey({
                        payload: password,
                        onSuccess: () => dispatch(setScreen(screen)),
                    }),
                );
            }
        },
        [dispatch, password, repeatPassword],
    );

    const onChangePasswordHandler = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setPassword(event.target.value);
    }, []);

    const onChangeRepeatPasswordHandler = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setRepeatPassword(event.target.value);
    }, []);

    return (
        <div id="createPassword" className="screen">
            <div className="middle">
                <TgsPlayer
                    name="createPassword"
                    src="assets/lottie/lock.tgs"
                    width={120}
                    height={120}
                    className="screen-lottie"
                />

                <div className="screen-title">{t('Secure Password')}</div>

                <div className="screen-text">
                    <Trans>
                        Please choose a secure password
                        <br />
                        for confirming your payments
                    </Trans>
                </div>

                <div style={{ marginTop: '54px' }}>
                    <input
                        id="createPassword_input"
                        className={!password && submitted ? 'error' : ''}
                        placeholder={t('Enter your password')}
                        type="password"
                        value={password}
                        onChange={onChangePasswordHandler}
                    />
                </div>
                <div>
                    <input
                        id="createPassword_repeatInput"
                        className={password !== repeatPassword && submitted ? 'error' : ''}
                        placeholder={t('Repeat your password')}
                        type="password"
                        value={repeatPassword}
                        onChange={onChangeRepeatPasswordHandler}
                    />
                </div>

                <div>
                    <button
                        id="createPassword_continueBtn"
                        className="btn-blue screen-btn"
                        style={{ marginTop: '38px', marginBottom: '20px' }}
                        onClick={showScreen.bind(null, ScreenEnum.readyToGo)}
                    >
                        {t('Continue')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CreatePasswordPage;
