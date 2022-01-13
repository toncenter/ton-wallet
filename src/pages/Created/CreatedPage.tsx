import { useCallback, useEffect } from 'react';

import TgsPlayer from 'components/TgsPlayer';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { createWallet } from 'store/app/appThunks';
import { selectMyAddress, setScreen } from 'store/app/appSlice';
import { ScreenEnum } from 'enums/screenEnum';

function CreatedPage() {
    const dispatch = useAppDispatch();
    const myAddress = useAppSelector(selectMyAddress);

    useEffect(() => {
        dispatch(createWallet());
    }, [dispatch]);

    const showScreen = useCallback((screen: ScreenEnum) => {
        dispatch(setScreen(screen));
    }, [dispatch]);

    return (
        <div id="created" className="screen">
            <div className="middle">
                <TgsPlayer name="created"
                           src="assets/lottie/created.tgs"
                           width={120}
                           height={120}
                           className="screen-lottie" />

                <div className="screen-title">Congratulations</div>

                <div className="screen-text">
                    Your TON wallet has just been created.<br/>
                    Only you control it.
                </div>

                <div className="screen-text">
                    To be able to always have access to it,<br/>
                    please set up a secure password and write<br/>
                    down secret words.
                </div>

                <div>
                    <button id="createdContinueButton"
                            className="btn-blue screen-btn"
                            style={{"marginTop":"18px","marginBottom":"20px"}}
                            disabled={!myAddress}
                            onClick={showScreen.bind(null, ScreenEnum.backup)}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CreatedPage;
