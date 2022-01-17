import StartPage from './pages/Start/StartPage';
import CreatedPage from './pages/Created/CreatedPage';
import BackupPage from './pages/Backup/BackupPage';
import CreatePasswordPage from './pages/CreatePassword/CreatePasswordPage';
import ReadyToGoPage from './pages/ReadyToGo/ReadyToGoPage';
import MainPage from './pages/Main/MainPage';
import ImportPage from './pages/Import/ImportPage';
import { useAppDispatch, useAppSelector } from './store/hooks';
import {
    selectMyAddress,
    selectMyMnemonicEncryptedWords,
    selectPopup,
    selectScreen,
    setScreen,
} from './store/app/appSlice';
import { ScreenEnum } from './enums/screenEnum';
import { PopupEnum } from './enums/popupEnum';
import DoneModal from './pages/Modals/DoneModal';
import EnterPasswordModal from './pages/Modals/EnterPasswordModal';
import ChangePasswordModal from './pages/Modals/ChangePasswordModal';
import SendModal from './pages/Modals/SendModal';
import InvoiceQrModal from './pages/Modals/InvoiceQrModal';
import InvoiceModal from './pages/Modals/InvoiceModal';
import SendConfirmModal from './pages/Modals/SendConfirmModal';
import SignConfirmModal from './pages/Modals/SignConfirmModal';
import ReceiveModal from './pages/Modals/ReceiveModal';
import ProcessingModal from './pages/Modals/ProcessingModal';
import AboutModal from './pages/Modals/AboutModal';
import DeleteWalletModal from './pages/Modals/DeleteWalletModal';
import TransactionModal from './pages/Modals/TransactionModal';
import ConnectLedgerModal from './pages/Modals/ConnectLedgerModal';
import MenuModal from './pages/Modals/MenuModal';
import Notification from './components/Notification';

function App() {
    const dispatch = useAppDispatch();
    const screen = useAppSelector(selectScreen);
    const popup = useAppSelector(selectPopup);
    const myAddress = useAppSelector(selectMyAddress);
    const myMnemonicEncryptedWords = useAppSelector(selectMyMnemonicEncryptedWords);

    if (screen === ScreenEnum.main && (!myAddress || !myMnemonicEncryptedWords)) {
        localStorage.clear();
        dispatch(setScreen(ScreenEnum.start));
        return <></>;
    }

    return (
        <>
            {
                {
                    [ScreenEnum.start]: <StartPage />,
                    [ScreenEnum.created]: <CreatedPage />,
                    [ScreenEnum.backup]: <BackupPage />,
                    [ScreenEnum.createPassword]: <CreatePasswordPage />,
                    [ScreenEnum.readyToGo]: <ReadyToGoPage />,
                    [ScreenEnum.import]: <ImportPage />,
                    [ScreenEnum.main]: <MainPage />,
                }[screen]
            }
            {
                {
                    [PopupEnum.changePassword]: <ChangePasswordModal />,
                    [PopupEnum.done]: <DoneModal />,
                    [PopupEnum.enterPassword]: <EnterPasswordModal />,
                    [PopupEnum.invoice]: <InvoiceModal />,
                    [PopupEnum.invoiceQr]: <InvoiceQrModal />,
                    [PopupEnum.send]: <SendModal />,
                    [PopupEnum.sendConfirm]: <SendConfirmModal />,
                    [PopupEnum.signConfirm]: <SignConfirmModal />,
                    [PopupEnum.receive]: <ReceiveModal />,
                    [PopupEnum.processing]: <ProcessingModal />,
                    [PopupEnum.menuDropdown]: <MenuModal />,
                    [PopupEnum.about]: <AboutModal />,
                    [PopupEnum.delete]: <DeleteWalletModal />,
                    [PopupEnum.transaction]: <TransactionModal />,
                    [PopupEnum.connectLedger]: <ConnectLedgerModal />,
                    [PopupEnum.void]: <></>,
                }[popup]
            }
            <Notification />
        </>
    );
}

export default App;
