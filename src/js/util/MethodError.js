
export class MethodError extends Error {
    /**
     * @param {string} message
     * @param {number} code
     */
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}

MethodError.ERR_BAD_AMOUNT = 1
MethodError.ERR_BAD_ADDRESS = 2
MethodError.ERR_API_FAILED = 3
MethodError.ERR_NOT_ENOUGH_TONS = 4
MethodError.ERR_USER_DECLINE_REQUEST = 5
MethodError.ERR_USER_DECLINE_REQUEST_AFTER_SENT_TRANSACTION = 6

/**
 * @param e
 * @returns {{code?: number, message: string}}
 */
export function serialiseError(e) {
    if (e instanceof MethodError) {
        return {
            code: e.code,
            message: e.message,
        }
    } else if (e instanceof Error) {
        return {
            message: e.message,
        }
    } else {
        return {
            message: JSON.stringify(e),
        }
    }
}