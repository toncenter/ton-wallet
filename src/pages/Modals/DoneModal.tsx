import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import TgsPlayer from 'components/TgsPlayer';
import Modal from 'components/Modal';
import { selectPopupState, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';
import { useAppDispatch, useAppSelector } from 'store/hooks';

function DoneModal() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { message } = useAppSelector(selectPopupState);

    const closeHandler = useCallback(() => {
        dispatch(setPopup({
            popup: PopupEnum.void,
        }));
    }, [dispatch]);

    return (
        <Modal>
            <div id="done" className="popup" style={{"textAlign": "center", "paddingBottom": "10px"}}>
                <TgsPlayer name="done" src="assets/lottie/done.tgs" width={150} height={150} />
                <div className="popup-title">{t('Done!')}</div>
                <div className="popup-grey-text">{message}</div>

                <div className="popup-footer">
                    <button id="done_closeBtn"
                            className="btn-lite"
                            onClick={closeHandler}
                    >
                        {t('CLOSE')}
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export default DoneModal;
