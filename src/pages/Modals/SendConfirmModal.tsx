import Modal from 'components/Modal';

function SendConfirmModal() {
    return (
        <Modal>
            <div id="sendConfirm" className="popup" style={{"paddingBottom": "10px"}}>
                <div className="popup-title">Confirmation</div>
                <div className="popup-black-text">Do you want to send <b id="sendConfirmAmount">x TON</b> to:</div>

                <div id="sendConfirmAddr" className="addr" />

                <div id="sendConfirmFee" className="popup-grey-text" style={{'textAlign': 'center'}}>Fee: ~x TON</div>

                <div className="popup-grey-text" style={{"textAlign": "center"}}>Note: Your comment will not be <b>encrypted</b>
                </div>

                <button id="sendConfirm_closeBtn" className="popup-close-btn" />

                <div className="popup-footer">
                    <button id="sendConfirm_cancelBtn" className="btn-lite">CANCEL</button>
                    <button id="sendConfirm_okBtn" className="btn-lite">SEND TON</button>
                </div>
            </div>
        </Modal>
    )
}

export default SendConfirmModal
