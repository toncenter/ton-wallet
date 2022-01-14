import { configureStore, Store } from '@reduxjs/toolkit'
import appReducer, { AppState } from './app/appSlice';

interface RootStateInterface {
    app: AppState,
}

export let store = createStore();

export function createStore(state?: RootStateInterface): Store<RootStateInterface, any> {
    return store = configureStore({
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
export type AppDispatch = typeof store.dispatch
