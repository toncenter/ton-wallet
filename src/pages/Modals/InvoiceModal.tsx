import Modal from 'components/Modal';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { selectPopupState, setNotification, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { copyToClipboard } from 'utils/domUtils';
import * as TonWeb from 'tonweb';

function InvoiceModal() {
    const dispatch = useAppDispatch();
    const {address, amount, comment} = useAppSelector(selectPopupState);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(()=> {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const invoiceLink = useMemo(() => {
        let link = `ton://transfer/${address}`;
        if (!amount && !comment) {
            return link;
        }
        const params = [];
        if (amount) {
            params.push('amount=' + TonWeb.utils.toNano(amount));
        }
        if (comment) {
            params.push('text=' + comment);
        }
        return `${link}?${params.join('&')}`;
    }, [address, amount, comment]);

    const changeAmountHandler = useCallback((event) => {
        dispatch(setPopup({
            popup: PopupEnum.invoice, state: {
                address,
                amount: event.target.value,
                comment
            }
        }));
    }, [dispatch, address, comment]);

    const changeCommentHandler = useCallback((event) => {
        dispatch(setPopup({
            popup: PopupEnum.invoice, state: {
                address,
                amount,
                comment: event.target.value,
            }
        }));
    }, [dispatch, address, amount]);

    const shareTransferLinkHandler = useCallback(() => {
        const result = copyToClipboard(invoiceLink);
        dispatch(setNotification(result ? 'Transfer link copied to clipboard' : 'Can\'t copy link'));
    }, [dispatch, invoiceLink]);

    const generateQRCodeHandler = useCallback(() => {
        dispatch(setPopup({
            popup: PopupEnum.invoiceQr, state: {
                amount,
                invoiceLink,
            }
        }));
    }, [dispatch, amount, invoiceLink]);

    const closeHandler = useCallback(() => {
        dispatch(setPopup({popup: PopupEnum.receive}));
    }, [dispatch]);

    return (
        <Modal>
            <div id="invoice" className="popup">
                <div className="popup-title">Create Invoice</div>

                <div>
                    <div className="input-label">Amount</div>
                </div>

                <input ref={inputRef}
                       id="invoice_amountInput"
                       type="number"
                       placeholder="Amount in TON you expect to receive"
                       value={amount}
                       onChange={changeAmountHandler}
                />
                <input id="invoice_commentInput"
                       type="text"
                       placeholder="Comment (optional)"
                       value={comment}
                       onChange={changeCommentHandler}
                />

                <div className="popup-grey-text">
                    You can specify the amount and purpose of<br/>
                    the payment to save the sender some time.
                </div>

                <div className="input-label" style={{'marginTop': '24px', 'marginBottom': '18px'}}>Invoice URL</div>

                <div id="invoice_link" className="popup-black-text">
                    {invoiceLink}
                </div>

                <div className="popup-grey-text" style={{'marginTop': '24px'}}>
                    Share this address to receive TON.
                </div>

                <button id="invoice_qrBtn"
                        className="btn-lite"
                        onClick={generateQRCodeHandler}
                >
                    Generate QR Code
                </button>
                <button id="invoice_shareBtn"
                        className="btn-blue"
                        onClick={shareTransferLinkHandler}
                >
                    Share Invoice URL
                </button>

                <button id="invoice_closeBtn"
                        className="popup-close-btn"
                        onClick={closeHandler}
                />
            </div>
        </Modal>
    )
}

export default InvoiceModal;
