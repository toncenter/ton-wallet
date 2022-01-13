import TgsPlayer from 'components/TgsPlayer';
import Modal from 'components/Modal';

function DoneModal() {
    return (
        <Modal>
            <div id="done" className="popup" style={{"textAlign": "center", "paddingBottom": "10px"}}>
                <TgsPlayer name="done" src="assets/lottie/done.tgs" width={150} height={150} />
                <div className="popup-title">Done!</div>
                <div className="popup-grey-text">1 TON have been send</div>

                <div className="popup-footer">
                    <button id="done_closeBtn" className="btn-lite">CLOSE</button>
                </div>
            </div>
        </Modal>
    )
}

export default DoneModal;
