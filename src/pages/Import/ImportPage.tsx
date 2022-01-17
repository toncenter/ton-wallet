import React, { useCallback, useState } from 'react';
import * as tonWebMnemonic from 'tonweb-mnemonic';
import { Trans, useTranslation } from 'react-i18next';

import MnemonicWordInput from 'components/MnemonicWordInput';
import { useAppDispatch } from 'store/hooks';
import { importWallet } from 'store/app/appThunks';
import { setScreen } from 'store/app/appSlice';
import { ScreenEnum } from 'enums/screenEnum';

function ImportPage() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [submitted, setSubmitted] = useState(false);
    const [words, setWords] = useState<string[]>([]);

    const importAlertHandler = useCallback(() => {
        alert(t("Too Bad. Without the secret words, you can't restore access to your wallet."));
    }, [t]);

    const changeHandler = useCallback(
        (index, value) => {
            if (Array.isArray(value)) {
                return setWords([...value]);
            }
            words[index] = value;
            setWords([...words]);
        },
        [words],
    );

    const importHandler = useCallback(async () => {
        setSubmitted(true);
        const isInvalid = !words.length || !(await tonWebMnemonic.validateMnemonic(words));
        if (isInvalid) {
            return;
        }
        dispatch(
            importWallet({
                payload: words,
                onSuccess: () => dispatch(setScreen(ScreenEnum.createPassword)),
            }),
        );
    }, [dispatch, words]);

    return (
        <div id="import" className="screen" style={{ textAlign: 'center' }}>
            <div className="screen-title" style={{ marginTop: '80px' }}>
                {t('24 Secret Words')}
            </div>
            <div className="screen-text" style={{ marginBottom: '10px' }}>
                <Trans>
                    Please restore access to your <b>non-hardware</b> wallet by
                    <br />
                    entering the 24 secret words you wrote
                    <br />
                    down when creating the wallet.
                </Trans>
            </div>

            <button id="import_alertBtn" className="btn-lite" onClick={importAlertHandler}>
                {t("I don't have them")}
            </button>

            <div id="importWords">
                {[...Array(12)].map((value, index) => {
                    return (
                        <React.Fragment key={index}>
                            <div className="word-item">
                                <span className="word-num">{index + 1 + '.'}</span>
                                <MnemonicWordInput
                                    index={index}
                                    value={words[index] || ''}
                                    submitted={submitted}
                                    onChange={changeHandler.bind(null, index)}
                                />
                            </div>
                            <div className="word-item">
                                <span className="word-num">{index + 13 + '.'}</span>
                                <MnemonicWordInput
                                    index={index + 12}
                                    value={words[index + 12] || ''}
                                    submitted={submitted}
                                    onChange={changeHandler.bind(null, index + 12)}
                                />
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            <div style={{ clear: 'both' }}>
                <button
                    id="import_continueBtn"
                    className="btn-blue screen-btn"
                    style={{ marginTop: '30px', marginBottom: '20px' }}
                    onClick={importHandler}
                >
                    {t('Continue')}
                </button>
            </div>
        </div>
    );
}

export default ImportPage;
