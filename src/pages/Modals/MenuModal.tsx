import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import Modal from 'components/Modal';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import {
    selectIsLedger,
    selectIsMagic,
    selectIsPlugin,
    selectIsProxy,
    setMagic,
    setPopup,
    setProxy,
    setScreen,
} from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';
import { ScreenEnum } from 'enums/screenEnum';
import ToggleButton from 'components/ToggleButton';
import { AppDispatch } from 'store/store';

function MenuModal() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const isPlugin = useAppSelector(selectIsPlugin);
    const isLedger = useAppSelector(selectIsLedger);
    const isMagic = useAppSelector(selectIsMagic);
    const isProxy = useAppSelector(selectIsProxy);

    const extensionHandler = useCallback(() => {
        window.open('https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd', '_blank');
        dispatch(setPopup({ popup: PopupEnum.void }));
    }, [dispatch]);

    const aboutHandler = useCallback(() => {
        dispatch(setPopup({ popup: PopupEnum.about }));
    }, [dispatch]);

    const changePasswordHandler = useCallback(() => {
        dispatch(setPopup({ popup: PopupEnum.changePassword }));
    }, [dispatch]);

    const backupHandler = useCallback(() => {
        dispatch(
            setPopup({
                popup: PopupEnum.enterPassword,
                state: {
                    onSuccess: (dispatch: AppDispatch) => dispatch(setScreen(ScreenEnum.backup)),
                },
            }),
        );
    }, [dispatch]);

    const deleteHandler = useCallback(() => {
        dispatch(setPopup({ popup: PopupEnum.delete }));
    }, [dispatch]);

    const magicHandler = useCallback(
        (value) => {
            dispatch(setMagic(value));
        },
        [dispatch],
    );

    const proxyHandler = useCallback(
        (value) => {
            dispatch(setProxy(value));
        },
        [dispatch],
    );

    const openTeleramHandler = useCallback(() => {
        chrome.tabs.update({ url: 'https://web.telegram.org/z' });
        dispatch(setPopup({ popup: PopupEnum.void }));
    }, [dispatch]);

    return (
        <Modal>
            <div id="menuDropdown">
                {!isPlugin && (
                    <div id="menu_extension" className="dropdown-item" onClick={extensionHandler}>
                        {t('Chrome Extension')}
                    </div>
                )}
                <div id="menu_about" className="dropdown-item" onClick={aboutHandler}>
                    {t('About')}
                </div>
                {isPlugin && (
                    <div id="menu_magic" className="dropdown-item">
                        {t('TON Magic')} <ToggleButton value={isMagic} onChange={magicHandler} />
                    </div>
                )}
                {isPlugin && isMagic && (
                    <div id="menu_telegram" className="dropdown-item" onClick={openTeleramHandler}>
                        {t('Open Telegram Web')} »
                    </div>
                )}
                {isPlugin && (
                    <div id="menu_proxy" className="dropdown-item">
                        {t('TON Proxy')} <ToggleButton value={isProxy} onChange={proxyHandler} />
                    </div>
                )}
                {!isLedger && (
                    <div id="menu_changePassword" className="dropdown-item" onClick={changePasswordHandler}>
                        {t('Change password')}
                    </div>
                )}
                {!isLedger && (
                    <div id="menu_backupWallet" className="dropdown-item" onClick={backupHandler}>
                        {t('Back up wallet')}
                    </div>
                )}
                <div id="menu_delete" className="dropdown-item" onClick={deleteHandler}>
                    {t('Delete wallet')}
                </div>
            </div>
        </Modal>
    );
}

export default MenuModal;
