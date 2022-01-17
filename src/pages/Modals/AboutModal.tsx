import { useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import TgsPlayer from 'components/TgsPlayer';
import Modal from 'components/Modal';
import { selectIsPlugin, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';
import { useAppDispatch, useAppSelector } from 'store/hooks';

function AboutModal() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const isPlugin = useAppSelector(selectIsPlugin);

    const closeHandler = useCallback(() => {
        dispatch(setPopup({ popup: PopupEnum.void }));
    }, [dispatch]);

    return (
        <Modal>
            <div id="about" className="popup" style={{ textAlign: 'center', paddingBottom: '10px' }}>
                <div className="popup-title">{t('TON Wallet')}</div>
                <div className="popup-grey-text">{t('Version')}: 1.1.25</div>
                <TgsPlayer name="about" src="assets/lottie/intro.tgs" width={150} height={150} />

                <div className="popup-grey-text" style={{ lineHeight: '24px' }}>
                    {t('API provider')}:{' '}
                    <a href="https://toncenter.com" target="_blank" rel="noreferrer">
                        toncenter.com
                    </a>
                    <br />
                    <a href="https://github.com/toncenter/ton-wallet" target="_blank" rel="noreferrer">
                        GitHub
                    </a>
                    ,
                    <a href="https://github.com/toncenter/ton-wallet/issues" target="_blank" rel="noreferrer">
                        {t('Issue Tracker')}
                    </a>
                </div>

                {isPlugin && (
                    <div className="popup-black-text about-magic">
                        <Trans>
                            <h4>What is TON Magic?</h4>
                            <p>
                                TON Magic provides native <b>Telegram integration</b> by patching the official Telegram
                                web app (Z version).
                            </p>
                            <p>
                                Turn it on to send and receive Toncoins from any Telegram user.{' '}
                                <a
                                    href="https://telegra.ph/Telegram--TON-11-10"
                                    id="about-magic-video"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    More info and demo
                                </a>
                                .
                            </p>
                        </Trans>
                    </div>
                )}

                <div className="popup-footer">
                    <button id="about_closeBtn" className="btn-lite" onClick={closeHandler}>
                        {t('CLOSE')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default AboutModal;
