import { AsyncThunkPayloadCreator } from '@reduxjs/toolkit';

interface GenericSuccessArgs<T> {
    payload: T;
    onSuccess?: Function;
}

export function withError<Args, Returned, ThunkApiConfig>(payloadCreator: AsyncThunkPayloadCreator<Returned, Args, ThunkApiConfig>) {
    return async (args: GenericSuccessArgs<Args> = { payload: null as any }, thunkAPI: any) => {
        try {
            const result = await payloadCreator(args.payload, thunkAPI);
            if (args && args.onSuccess) {
                args.onSuccess();
            }
            return result;
        } catch (err) {
            alert(err);
            throw err; // throw error so createAsyncThunk will dispatch '/rejected'-action
        }
    };
}
