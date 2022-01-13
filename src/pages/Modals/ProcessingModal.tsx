import TgsPlayer from 'components/TgsPlayer';
import Modal from 'components/Modal';

function ProcessingModal() {
    return (
        <Modal>
            <div id="processing" className="popup" style={{"textAlign": "center"}}>
                <TgsPlayer name="processing" src="assets/lottie/money.tgs" width={150} height={150} />
                <div className="popup-title">Sending TON</div>
                <div className="popup-grey-text">Please wait a few seconds for your<br/>transaction to be processed..</div>

                <button id="processing_closeBtn" className="popup-close-btn" />
            </div>
        </Modal>
    )
}

export default ProcessingModal;
