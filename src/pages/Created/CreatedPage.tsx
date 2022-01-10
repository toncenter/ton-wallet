import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import TgsPlayer from 'components/TgsPlayer';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { createWallet } from 'store/app/appThunks';
import { selectMyAddress } from 'store/app/appSlice';

function CreatedPage() {
    const dispatch = useAppDispatch();
    const myAddress = useAppSelector(selectMyAddress);
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(createWallet());
    }, [dispatch]);

    const navigateTo = useCallback((route: string) => {
        navigate(route);
    }, [navigate]);

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
                            onClick={navigateTo.bind(null, "/backup")}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CreatedPage;
