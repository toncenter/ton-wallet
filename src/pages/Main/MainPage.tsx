import React, { useCallback, useEffect, useMemo } from 'react';
import TonWeb from 'tonweb';

import TgsPlayer from 'components/TgsPlayer';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { selectBalance, selectMyAddress, selectTransactions, selectWalletContract, setPopup } from 'store/app/appSlice';
import { createWalletContract, updateWallet } from 'store/app/appThunks';
import { formatDate, formatTime } from 'utils/dateUtils';
import { PopupEnum } from 'enums/popupEnum';

function MainPage() {
    const dispatch = useAppDispatch();
    const walletContract = useAppSelector(selectWalletContract);
    const address = useAppSelector(selectMyAddress);
    const balance = useAppSelector(selectBalance);
    const transactions = useAppSelector(selectTransactions);

    const formattedBalance = useMemo(() => {
        const value = TonWeb.utils.fromNano(balance);
        return value === '0' ? '0.00' : value;
    }, [balance]);

    const firstBalanceValue = useMemo(() => {
        const i = formattedBalance.indexOf('.');
        return formattedBalance.substring(0, i);
    }, [formattedBalance]);

    const lastBalanceValue = useMemo(() => {
        const i = formattedBalance.indexOf('.');
        return formattedBalance.substring(i);
    }, [formattedBalance]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            //dispatch(updateWallet());
        }, 5000);
        return () => {
            clearInterval(intervalId);
        }
    }, [dispatch])

    useEffect(() => {
        if (!walletContract) {
            dispatch(createWalletContract());
        } else {
            dispatch(updateWallet());
        }
    }, [dispatch, walletContract]);

    const refreshHandler = useCallback(() => {
        dispatch(updateWallet());
    }, [dispatch]);

    const transactionHandler = useCallback((tx) => {
        dispatch(setPopup({popup: PopupEnum.transaction, state: {tx}}))
    }, [dispatch]);

    const menuHandler = useCallback(() => {
        dispatch(setPopup({popup: PopupEnum.menuDropdown}));
    }, [dispatch]);

    const sendHandler = useCallback(() => {
        dispatch(setPopup({
            popup: PopupEnum.send,
            state: {
                address: '',
            }
        }));
    }, [dispatch]);

    const receiveHandler = useCallback(() => {
        dispatch(setPopup({
            popup: PopupEnum.receive,
            state: {
                address,
            }
        }));
    }, [dispatch, address]);

    return (
        <div id="main" className="screen">
            <div className="head">
                <div className="head-row">
                    <button id="main_refreshBtn"
                            className="btn-round"
                            style={{'backgroundImage': 'url(\'assets/refresh.svg\')'}}
                            onClick={refreshHandler}
                    >
                    </button>

                    <div id="updateLabel"/>

                    <button id="main_settingsButton" className="btn-round"
                            style={{'backgroundImage': 'url(\'assets/menu.svg\')'}}
                            onClick={menuHandler}
                    >
                    </button>
                </div>

                <div id="balance">
                    <span>{firstBalanceValue}</span>
                    <span style={{'fontSize': '24px'}}>{lastBalanceValue}</span>
                    <span> 💎</span>
                </div>
                <div className="your-balance">Your mainnet balance</div>

                <button id="main_receiveBtn" className="btn-blue" onClick={receiveHandler}>
                    <div className="btn-icon" style={{'backgroundImage': 'url(\'assets/down-left.svg\')'}}/>
                    Receive
                </button>

                {
                    balance.gt(new TonWeb.utils.BN(0)) &&
                  <button id="sendButton" className="btn-blue" onClick={sendHandler}>
                    <div className="btn-icon"
                         style={{'backgroundImage': 'url(\'assets/down-left.svg\')', 'transform': 'rotate(180deg)'}}/>
                    Send
                  </button>
                }
            </div>

            <div id="transactionsContainer">
                <div id="transactionsList">
                    {
                        transactions.map((tx, index) => {
                            const isReceive = !tx.amount.isNeg();
                            const amountFormatted = TonWeb.utils.fromNano(tx.amount);
                            const addr = isReceive ? tx.from_addr : tx.to_addr;
                            const txDate = formatDate(tx.date);
                            const prevTxDate = index !== 0 ? formatDate(transactions[index - 1].date) : '';

                            return (
                                <React.Fragment key={index}>
                                    {
                                        prevTxDate !== txDate &&
                                      <div className="date-separator">{txDate}</div>
                                    }
                                    <div key={index}
                                         className="tx-item"
                                         onClick={transactionHandler.bind(null, tx)}
                                    >
                                        <div>
                                            {
                                                isReceive ?
                                                    <>
                                                        <span
                                                            className="tx-amount tx-amount-green">{'+' + amountFormatted}</span>
                                                        <span> 💎</span>
                                                        <span className="tx-from"> from:</span>
                                                    </> :
                                                    <>
                                                        <span className="tx-amount">{amountFormatted}</span>
                                                        <span> 💎</span>
                                                        <span className="tx-from"> to:</span>
                                                    </>
                                            }
                                        </div>
                                        <div className="tx-addr addr">
                                            {addr.substring(0, addr.length / 2)}
                                            <wbr/>
                                            {addr.substring(addr.length / 2)}
                                        </div>
                                        {
                                            tx.comment &&
                                          <div className="tx-comment">{tx.comment}</div>
                                        }
                                        <div className="tx-fee">blockchain fees: {TonWeb.utils.fromNano(tx.fee)}</div>
                                        <div className="tx-item-date">{formatTime(tx.date)}</div>
                                    </div>
                                </React.Fragment>
                            )
                        })
                    }
                </div>
                {
                    transactions.length === 0 &&
                  <div id="walletCreated">
                    <TgsPlayer name="main"
                               width={150}
                               height={150}
                               src="assets/lottie/empty.tgs"/>
                    <div>Wallet Created</div>
                  </div>
                }
            </div>
        </div>
    )
}

export default MainPage;
