import React, { useCallback, useMemo } from 'react';
import TonWeb from 'tonweb';

import { formatDateFull } from 'utils/dateUtils';
import Modal from 'components/Modal';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { selectPopupState, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';

function TransactionModal() {
    const dispatch = useAppDispatch();
    const { tx } = useAppSelector(selectPopupState);

    const isReceive = useMemo(() => {
        return !tx.amount.isNeg();
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
                <div className="popup-title">Transaction</div>

                <div id="transactionAmount">
                    {
                        isReceive ?
                            '+' + TonWeb.utils.fromNano(tx.amount) + ' 💎' :
                            TonWeb.utils.fromNano(tx.amount) + ' 💎'
                    }
                </div>
                <div id="transactionFee">{TonWeb.utils.fromNano(tx.otherFee)} transaction fee</div>
                <div id="transactionStorageFee">{TonWeb.utils.fromNano(tx.storageFee)} storage fee</div>

                <div id="transactionSenderLabel" className="input-label" style={{'marginTop': '20px'}}>
                    {
                        !tx.amount.isNeg() ? 'Sender' : 'Recipient'
                    }
                </div>

                <div id="transactionSender" className="addr">
                    {addr.substring(0, addr.length / 2)}
                    <wbr/>
                    {addr.substring(addr.length / 2)}
                </div>

                <div className="input-label">Date</div>

                <div id="transactionDate" className="popup-black-text">
                    {formatDateFull(tx.date)}
                </div>

                {
                    !!tx.comment &&
                  <>
                    <div id="transactionCommentLabel" className="input-label">Comment</div>

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
                    Send TON to this address
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
