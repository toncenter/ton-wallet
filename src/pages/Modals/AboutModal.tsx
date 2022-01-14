import TgsPlayer from 'components/TgsPlayer';
import Modal from 'components/Modal';
import { useCallback } from 'react';
import { selectIsPlugin, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';
import { useAppDispatch, useAppSelector } from 'store/hooks';

function AboutModal() {
    const dispatch = useAppDispatch();
    const isPlugin = useAppSelector(selectIsPlugin);

    const closeHandler = useCallback(() => {
        dispatch(setPopup({popup: PopupEnum.void}));
    }, [dispatch]);

    return (
        <Modal>
            <div id="about" className="popup" style={{"textAlign": "center", "paddingBottom": "10px"}}>
                <div className="popup-title">TON Wallet</div>
                <div className="popup-grey-text">
                    Version: 1.1.23
                </div>
                <TgsPlayer name="about" src="assets/lottie/intro.tgs" width={150} height={150} />

                <div className="popup-grey-text" style={{"lineHeight": "24px"}}>
                    API provider: <a href="https://toncenter.com" target="_blank">toncenter.com</a><br/>
                    <a href="https://github.com/toncenter/ton-wallet" target="_blank">GitHub</a>,
                    <a href="https://github.com/toncenter/ton-wallet/issues" target="_blank">Issue Tracker</a>
                </div>

                {
                    isPlugin &&
                  <div className="popup-black-text about-magic">
                    <h4>What is TON Magic?</h4>
                    <p>
                      TON Magic provides native <b>Telegram integration</b> by patching the official Telegram web app (Z
                      version).
                    </p>
                    <p>
                      Turn it on to send and receive Toncoins from any Telegram user. <a
                      href="https://telegra.ph/Telegram--TON-11-10" id="about-magic-video" target="_blank">More info and
                      demo</a>.
                    </p>
                  </div>
                }

                <div className="popup-footer">
                    <button id="about_closeBtn"
                            className="btn-lite"
                            onClick={closeHandler}
                    >
                        CLOSE
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export default AboutModal;
