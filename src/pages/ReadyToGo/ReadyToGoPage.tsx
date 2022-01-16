import { useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import TgsPlayer from 'components/TgsPlayer';
import { useAppDispatch } from 'store/hooks';
import { setScreen } from 'store/app/appSlice';
import { ScreenEnum } from 'enums/screenEnum';

function ReadyToGoPage() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();

    const navigateTo = useCallback((screen: ScreenEnum) => {
        dispatch(setScreen(screen));
    }, [dispatch]);

    return (
        <div id="readyToGo"
             className="screen">
            <div className="middle">
                <TgsPlayer name="readyToGo"
                           src="assets/lottie/done.tgs"
                           width={120}
                           height={120}
                           className="screen-lottie"/>

                <div className="screen-title">{t('Ready to go!')}</div>

                <div className="screen-text">
                    <Trans>
                        You're all set. Now you have a wallet that<br/>
                        only you control - directly, without<br/>
                        middlemen or bankers.
                    </Trans>
                </div>

                <div>
                    <button id="readyToGo_continueBtn"
                            className="btn-blue screen-btn"
                            style={{"marginTop":"170px","marginBottom":"20px"}}
                            onClick={navigateTo.bind(null, ScreenEnum.main)}
                    >
                        {t('View My Wallet')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ReadyToGoPage;
