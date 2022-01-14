import { configureStore, Dispatch, Store } from '@reduxjs/toolkit'

import appReducer, { AppState } from './app/appSlice';

interface RootStateInterface {
    app: AppState,
}

export function createStore(state?: RootStateInterface): Store<RootStateInterface, any> {
    return configureStore({
        reducer: {
            app: appReducer,
        },
        preloadedState: state,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: false,
            }),
    });
}

export type RootState = RootStateInterface;
export type AppDispatch = Dispatch<any>
