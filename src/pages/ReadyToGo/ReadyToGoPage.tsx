import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import TgsPlayer from 'components/TgsPlayer';

function ReadyToGoPage() {
    const navigate = useNavigate();

    const navigateTo = useCallback((route: string) => {
        navigate(route);
    }, [navigate]);

    return (
        <div id="readyToGo"
             className="screen">
            <div className="middle">
                <TgsPlayer name="readyToGo"
                           src="assets/lottie/done.tgs"
                           width={120}
                           height={120}
                           className="screen-lottie"/>

                <div className="screen-title">Ready to go!</div>

                <div className="screen-text">
                    You're all set. Now you have a wallet that<br/>
                    only you control - directly, without<br/>
                    middlemen or bankers.
                </div>

                <div>
                    <button id="readyToGo_continueBtn"
                            className="btn-blue screen-btn"
                            style={{"marginTop":"170px","marginBottom":"20px"}}
                            onClick={navigateTo.bind(null, "/")}
                    >
                        View My Wallet
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ReadyToGoPage;
