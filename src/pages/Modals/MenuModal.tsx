import React, { useCallback } from 'react';

import Modal from 'components/Modal';
import { useAppDispatch } from 'store/hooks';
import { setPopup, setScreen } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';
import { ScreenEnum } from 'enums/screenEnum';

function MenuModal() {
    const dispatch = useAppDispatch();

    const extensionHandler = useCallback(() => {
        window.open('https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd', '_blank');
        dispatch(setPopup({popup: PopupEnum.void}));
    }, [dispatch]);

    const aboutHandler = useCallback(() => {
        dispatch(setPopup({popup: PopupEnum.about}));
    }, [dispatch]);

    const changePasswordHandler = useCallback(() => {
        dispatch(setPopup({popup: PopupEnum.changePassword}));
    }, [dispatch]);

    const backupHandler = useCallback(() => {
        dispatch(setPopup({
            popup: PopupEnum.enterPassword, state: {
                onSuccess: () => dispatch(setScreen(ScreenEnum.backup))
            }
        }));
    }, [dispatch]);

    const deleteHandler = useCallback(() => {
        dispatch(setPopup({popup: PopupEnum.delete}));
    }, [dispatch]);

    return (
        <Modal>
            <div id="menuDropdown">
                <div id="menu_extension"
                     className="dropdown-item"
                     onClick={extensionHandler}
                >
                    Chrome Extension
                </div>
                <div id="menu_about"
                     className="dropdown-item"
                     onClick={aboutHandler}
                >
                    About
                </div>
                <div id="menu_magic" className="dropdown-item">
                    TON Magic <div className="dropdown-toggle"/>
                </div>
                <div id="menu_telegram" className="dropdown-item">
                    Open Telegram Web »
                </div>
                <div id="menu_proxy" className="dropdown-item">
                    TON Proxy <div className="dropdown-toggle"/>
                </div>
                <div id="menu_changePassword"
                     className="dropdown-item"
                     onClick={changePasswordHandler}
                >
                    Change password
                </div>
                <div id="menu_backupWallet"
                     className="dropdown-item"
                     onClick={backupHandler}
                >
                    Back up wallet
                </div>
                <div id="menu_delete"
                     className="dropdown-item"
                     onClick={deleteHandler}
                >
                    Delete wallet
                </div>
            </div>
        </Modal>
    )
}

export default MenuModal;
