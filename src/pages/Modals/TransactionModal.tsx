import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import TonWeb from 'tonweb';

import { formatDateFull } from 'utils/dateUtils';
import Modal from 'components/Modal';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { selectPopupState, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';
import TonAddress from 'components/TonAddress';

function TransactionModal() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { tx } = useAppSelector(selectPopupState);

    const isReceive = useMemo(() => {
        return !new TonWeb.utils.BN(tx.amount).isNeg();
    }, [tx]);

    const addr = useMemo(() => {
        return  isReceive ? tx.from_addr : tx.to_addr;
    }, [tx, isReceive]);

    const closeHandler = useCallback(() => {
        dispatch(setPopup({popup: PopupEnum.void}));
    }, [dispatch]);

    const sendHandler = useCallback(() => {
        dispatch(setPopup({popup: PopupEnum.send, state: {
            address: addr,
        }}));
    }, [dispatch, addr]);

    return (
        <Modal>
            <div id="transaction" className="popup">
                <div className="popup-title">{t('Transaction')}</div>

                <div id="transactionAmount">
                    {
                        isReceive ?
                            '+' + TonWeb.utils.fromNano(tx.amount) + ' 💎' :
                            TonWeb.utils.fromNano(tx.amount) + ' 💎'
                    }
                </div>
                <div id="transactionFee">{TonWeb.utils.fromNano(tx.otherFee)} {t('transaction fee')}</div>
                <div id="transactionStorageFee">{TonWeb.utils.fromNano(tx.storageFee)} {t('storage fee')}</div>

                <div id="transactionSenderLabel" className="input-label" style={{'marginTop': '20px'}}>
                    {
                        isReceive ? t('Sender') : t('Recipient')
                    }
                </div>

                <TonAddress id="transactionSender" address={addr}/>

                <div className="input-label">{t('Date')}</div>

                <div id="transactionDate" className="popup-black-text">
                    {formatDateFull(tx.date)}
                </div>

                {
                    !!tx.comment &&
                  <>
                    <div id="transactionCommentLabel" className="input-label">{t('Comment')}</div>

                    <div id="transactionComment" className="popup-black-text">
                        {tx.comment}
                    </div>
                  </>
                }

                <button id="transaction_sendBtn"
                        className="btn-blue"
                        style={{'marginTop': '20px'}}
                        onClick={sendHandler}
                >
                    {t('Send TON to this address')}
                </button>

                <button id="transaction_closeBtn"
                        className="popup-close-btn"
                        onClick={closeHandler}
                />
            </div>
        </Modal>
    )
}

export default TransactionModal;
