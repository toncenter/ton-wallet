import Modal from 'components/Modal';

function SignConfirmModal() {
    return (
        <Modal>
            <div id="signConfirm" className="popup" style={{"paddingBottom": "10px"}}>
                <div className="popup-title">Confirmation</div>
                <div className="popup-black-text">Do you want to sign:</div>

                <div id="signConfirmData" className="addr" />

                <div className="popup-grey-text" style={{"textAlign": "center", "fontWeight": "bold", "color": "#D74D4D"}}>
                    Signing custom data is very dangerous. Use only if you know what you are doing.
                </div>

                <button id="signConfirm_closeBtn" className="popup-close-btn" />

                <div className="popup-footer">
                    <button id="signConfirm_cancelBtn" className="btn-lite">CANCEL</button>
                    <button id="signConfirm_okBtn" className="btn-lite">SIGN</button>
                </div>
            </div>
        </Modal>
    )
}

export default SignConfirmModal;
