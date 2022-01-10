import { AsyncThunkPayloadCreator } from '@reduxjs/toolkit';

export function withToastForError<Args, Returned, ThunkApiConfig>(payloadCreator: AsyncThunkPayloadCreator<Returned, Args, ThunkApiConfig>) {
    return async (args: Args , thunkAPI: any) => {
        try {
            return await payloadCreator(args, thunkAPI);
        } catch (err) {
            alert(JSON.stringify(err));
            throw err; // throw error so createAsyncThunk will dispatch '/rejected'-action
        }
    };
}
