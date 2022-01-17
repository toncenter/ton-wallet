import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as TonWeb from 'tonweb';

import Modal from 'components/Modal';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { selectBalance, selectIsLedger, selectPopupState, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';

function SendModal() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const balance = useAppSelector(selectBalance);
    const isLedger = useAppSelector(selectIsLedger);
    const { address, amount, comment } = useAppSelector(selectPopupState);
    const inputRef = useRef<HTMLInputElement>(null);
    const [hasAmountError, setHasAmountError] = useState(false);
    const [hasAddressError, setHasAdressError] = useState(false);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const changeAddressHandler = useCallback(
        (event) => {
            setHasAdressError(false);
            dispatch(
                setPopup({
                    popup: PopupEnum.send,
                    state: {
                        address: event.target.value,
                        amount,
                        comment,
                    },
                }),
            );
        },
        [dispatch, amount, comment],
    );

    const changeAmountHandler = useCallback(
        (event) => {
            setHasAmountError(false);
            dispatch(
                setPopup({
                    popup: PopupEnum.send,
                    state: {
                        address,
                        amount: event.target.value,
                        comment,
                    },
                }),
            );
        },
        [dispatch, address, comment],
    );

    const changeCommentHandler = useCallback(
        (event) => {
            dispatch(
                setPopup({
                    popup: PopupEnum.send,
                    state: {
                        address,
                        amount,
                        comment: event.target.value,
                    },
                }),
            );
        },
        [dispatch, amount, address],
    );

    const sendHandler = useCallback(() => {
        const amountNano = TonWeb.utils.toNano(amount ? amount : '0');
        if (!TonWeb.Address.isValid(address)) {
            return setHasAdressError(true);
        }
        if (amountNano.lte(new TonWeb.utils.BN(0)) || new TonWeb.utils.BN(balance).lt(amountNano)) {
            return setHasAmountError(true);
        }
        dispatch(
            setPopup({
                popup: PopupEnum.sendConfirm,
                state: {
                    address,
                    amount: amountNano.toString(),
                    comment: comment,
                    fee: '0',
                },
            }),
        );
    }, [dispatch, amount, address, comment, balance]);

    const closeHandler = useCallback(() => {
        dispatch(setPopup({ popup: PopupEnum.void }));
    }, [dispatch]);

    return (
        <Modal>
            <div id="send" className="popup">
                <div className="popup-title">{t('Send TON')}</div>

                <div className="input-label">{t('Recipient wallet address')}</div>
                <input
                    ref={inputRef}
                    id="toWalletInput"
                    type="text"
                    placeholder={t('Enter wallet address')}
                    className={hasAddressError ? 'error' : ''}
                    value={address}
                    onChange={changeAddressHandler}
                />

                <div className="popup-grey-text">
                    {t('Copy the 48-letter wallet address of the recipient here or ask them to send you a ton:// link')}
                </div>

                <div style={{ position: 'relative', width: '100%' }}>
                    <div className="input-label">{t('Amount')}</div>
                    <div id="sendBalance">
                        {t('Balance')}: {TonWeb.utils.fromNano(balance)} 💎
                    </div>
                </div>

                <input
                    id="amountInput"
                    type="number"
                    placeholder="0.0"
                    value={amount}
                    className={hasAmountError ? 'error' : ''}
                    onChange={changeAmountHandler}
                />
                {!isLedger && (
                    <input
                        id="commentInput"
                        type="text"
                        placeholder={t('Comment (optional)')}
                        value={comment}
                        onChange={changeCommentHandler}
                    />
                )}
                <button id="send_btn" className="btn-blue" onClick={sendHandler}>
                    {t('Send TON')}
                </button>

                <button id="send_closeBtn" className="popup-close-btn" onClick={closeHandler} />
            </div>
        </Modal>
    );
}

export default SendModal;
