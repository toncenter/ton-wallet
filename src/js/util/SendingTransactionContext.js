import {MethodError} from "./MethodError";

export class SendingTransactionContext {


    constructor() {
        this.promise = null;
        this.promiseResolvers = {resolve: (payload) => {}, reject: (err) => {} };
        this.requestWasSent = false;
    }

    /**
     * @param {MethodError} error
     */
    fail(error) {
        const {reject} = this.promiseResolvers;
        reject(error);
    }

    decline() {
        if (this.requestWasSent) {
            this.fail(new MethodError("USER_DECLINE_AFTER_SENT_TRANSACTION", MethodError.ERR_USER_DECLINE_REQUEST_AFTER_SENT_TRANSACTION))
        } else {
            this.fail(new MethodError("USER_DECLINE_REQUEST", MethodError.ERR_USER_DECLINE_REQUEST))
        }
    }

    requestSent() {
        this.requestWasSent = true;
    }

    success() {
        const {resolve} = this.promiseResolvers;
        resolve(true);
    }


    wait() {
        if (!this.promise) {
            this.prmise = new Promise((resolve,reject) => {
                this.promiseResolvers = {resolve, reject};
            });
        }
        return this.prmise;
    }
}