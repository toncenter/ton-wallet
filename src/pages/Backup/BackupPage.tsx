import { useCallback, useMemo } from 'react';

import TgsPlayer from 'components/TgsPlayer';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { selectMyMnemonicWords, selectPopupState, setPopup, setScreen } from 'store/app/appSlice';
import { ScreenEnum } from 'enums/screenEnum';
import { PopupEnum } from '../../enums/popupEnum';

function BackupPage() {
    const dispatch = useAppDispatch();
    let myMnemonicWords = useAppSelector(selectMyMnemonicWords);
    const popupState = useAppSelector(selectPopupState);

    const words = useMemo(() => {
        return myMnemonicWords.length ? myMnemonicWords : popupState.myMnemonicWords;
    }, [myMnemonicWords, popupState.myMnemonicWords])

    const navigateTo = useCallback(() => {
        if (popupState.myMnemonicWords.length) {
            dispatch(setScreen(ScreenEnum.main));
            return dispatch(setPopup({
                popup: PopupEnum.void,
                state: {
                    myMnemonicWords: [],
                }
            }))
        }
        return dispatch(setScreen(ScreenEnum.createPassword));
    }, [dispatch, popupState.myMnemonicWords]);

    return (
        <div id="backup"
             className="screen" style={{"textAlign":"center"}}>
            <TgsPlayer name="backup"
                       src="assets/lottie/paper.tgs"
                       width={120}
                       height={120}
                       className="screen-lottie"
                       style={{"marginTop":"30px"}} />

            <div className="screen-title">24 secret words</div>

            <div className="screen-text">
                Write down these 24 words in the correct<br/>
                order and store them in secret place.
            </div>

            <div className="screen-text">
                Use these secret words to restore access to<br/>
                your wallet if you lose your password or<br/>
                access to this device.
            </div>

            <div id="createWords">
                {
                    words.slice(0, 12).map((word, index) => {
                        return (
                            <>
                                <div className="create-word-item">
                                    <span className="word-num">{(index + 1) + '.'}</span>
                                    <span style={{"fontWeight": "bold"}}>{word}</span>
                                </div>
                                <div className="create-word-item">
                                    <span className="word-num">{(index + 13) + '.'}</span>
                                    <span style={{"fontWeight": "bold"}}>{words[index + 12]}</span>
                                </div>
                            </>
                        )
                    })
                }
            </div>

            <div style={{"clear":"both"}}>
                <button id="backup_continueBtn" className="btn-blue screen-btn"
                        style={{"marginTop":"26px","marginBottom":"20px"}}
                        onClick={navigateTo}
                >
                    Continue
                </button>
            </div>
        </div>
    )
}

export default BackupPage;
