import {JSON_RPC_VERSION} from "./const";

export class PortMessage {


    constructor(id, method) {
        this.id = id
        this.method = method
    }

    container() {
        return {
            type: 'gramWalletAPI',
            message: {
                jsonrpc: JSON_RPC_VERSION,
                id: this.id,
                method: this.method,
            }
        }
    }

    result(payload) {
        const base = this.container()
        base.message.result = payload;
        return base;
    }


    /**
     * @param {{code?:number, message:string}} err
     */
    error(err) {
        const base = this.container()
        base.message.error = err;
        return base;
    }
}