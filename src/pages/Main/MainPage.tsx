import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TonWeb from 'tonweb';

import TgsPlayer from 'components/TgsPlayer';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { selectBalance, selectTransactions, selectWalletContract } from 'store/app/appSlice';
import { createWalletContract, updateWallet } from 'store/app/appThunks';
import { formatDate, formatDateFull, formatTime } from 'utils/dateUtils';
import Modal from '../../components/Modal';

function MainPage() {
    const dispatch = useAppDispatch();
    const walletContract = useAppSelector(selectWalletContract);
    const balance = useAppSelector(selectBalance);
    const transactions = useAppSelector(selectTransactions);
    const [showMenu, setShowMenu] = useState(false);
    const [transaction, setTransaction] = useState<any>(null);

    const formattedBalance = useMemo(() => {
        const value =  TonWeb.utils.fromNano(balance);
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
        setTransaction(tx);
    }, [])

    const toggleMenuHandler = useCallback(() => {
        setShowMenu(!showMenu);
    }, [showMenu]);

    const menuExtensionHandler = useCallback(() => {
        window.open('https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd', '_blank');
        toggleMenuHandler();
    }, [toggleMenuHandler]);

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
                            onClick={toggleMenuHandler}
                    >
                    </button>
                </div>

                <div id="balance">
                    <span>{firstBalanceValue}</span>
                    <span style={{'fontSize': '24px'}}>{lastBalanceValue}</span>
                    <span> 💎</span>
                </div>
                <div className="your-balance">Your mainnet balance</div>

                <button id="main_receiveBtn" className="btn-blue">
                    <div className="btn-icon" style={{'backgroundImage': 'url(\'assets/down-left.svg\')'}}/>
                    Receive
                </button>

                {
                    balance.gt(new TonWeb.utils.BN(0)) && <button id="sendButton" className="btn-blue">
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
                                                        <span className="tx-amount tx-amount-green">{'+' + amountFormatted}</span>
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
                                        <div className="tx-fee">blockchain fees: ${TonWeb.utils.fromNano(tx.fee)}</div>
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
            {
                showMenu &&
              <Modal onClose={toggleMenuHandler}>
                <div id="menuDropdown">
                  <div id="menu_extension"
                       className="dropdown-item"
                       onClick={menuExtensionHandler}>
                    Chrome Extension
                  </div>
                  <div id="menu_about" className="dropdown-item">About</div>
                  <div id="menu_magic" className="dropdown-item">TON Magic <div className="dropdown-toggle" /></div>
                  <div id="menu_telegram" className="dropdown-item">Open Telegram Web »</div>
                  <div id="menu_proxy" className="dropdown-item">TON Proxy <div className="dropdown-toggle" /></div>
                  <div id="menu_changePassword" className="dropdown-item">Change password</div>
                  <div id="menu_backupWallet" className="dropdown-item">Back up wallet</div>
                  <div id="menu_delete" className="dropdown-item">Delete wallet</div>
                </div>
              </Modal>
            }
            {
                !!transaction &&
              <Modal onClose={transactionHandler.bind(null, null)}>
                <div id="transaction" className="popup">
                  <div className="popup-title">Transaction</div>

                  <div id="transactionAmount">
                      {
                          !transaction.amount.isNeg() ?
                              '+' + TonWeb.utils.fromNano(transaction.amount) + ' 💎' :
                              TonWeb.utils.fromNano(transaction.amount) + ' 💎'
                      }
                  </div>
                  <div id="transactionFee">{TonWeb.utils.fromNano(transaction.otherFee)} transaction fee</div>
                  <div id="transactionStorageFee">{TonWeb.utils.fromNano(transaction.storageFee)} storage fee</div>

                  <div id="transactionSenderLabel" className="input-label" style={{"marginTop": "20px"}}>
                      {
                          !transaction.amount.isNeg() ? 'Sender' : 'Recipient'
                      }
                  </div>

                  <div id="transactionSender" className="addr">
                      {(!transaction.amount.isNeg() ? transaction.from_addr : transaction.to_addr).substring(0, (!transaction.amount.isNeg() ? transaction.from_addr : transaction.to_addr).length / 2)}
                       <wbr/>
                      {(!transaction.amount.isNeg() ? transaction.from_addr : transaction.to_addr).substring((!transaction.amount.isNeg() ? transaction.from_addr : transaction.to_addr).length / 2)}
                  </div>

                  <div className="input-label">Date</div>

                  <div id="transactionDate" className="popup-black-text">
                      {formatDateFull(transaction.date)}
                  </div>

                    {
                        !!transaction.comment &&
                        <>
                          <div id="transactionCommentLabel" className="input-label">Comment</div>

                          <div id="transactionComment" className="popup-black-text">
                              {transaction.comment}
                          </div>
                        </>
                    }

                  <button id="transaction_sendBtn" className="btn-blue" style={{"marginTop": "20px"}}>
                    Send TON to this address
                  </button>

                  <button id="transaction_closeBtn"
                          className="popup-close-btn"
                          onClick={transactionHandler.bind(null, null)}
                  />
                </div>
              </Modal>
            }
        </div>
    )
}

export default MainPage;
