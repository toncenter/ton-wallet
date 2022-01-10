import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import TgsPlayer from 'components/TgsPlayer';
import { useAppSelector } from 'store/hooks';
import { selectMyMnemonicWords } from 'store/app/appSlice';

function BackupPage() {
    const navigate = useNavigate();
    const myMnemonicWords = useAppSelector(selectMyMnemonicWords);

    const navigateTo = useCallback(() => {
        if (localStorage.getItem('words')) {
            return navigate('/main');
        }
        return navigate('/password');
    }, [navigate]);

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
                    myMnemonicWords.slice(0, 12).map((word, index) => {
                        return (
                            <>
                                <div className="create-word-item">
                                    <span className="word-num">{(index + 1) + '.'}</span>
                                    <span style={{"fontWeight": "bold"}}>{word}</span>
                                </div>
                                <div className="create-word-item">
                                    <span className="word-num">{(index + 13) + '.'}</span>
                                    <span style={{"fontWeight": "bold"}}>{myMnemonicWords[index + 12]}</span>
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
