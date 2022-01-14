import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Store } from '@reduxjs/toolkit';

import './styles/index.scss';
import './pollyfill';
import App from './App';
import { store as localStore } from './store/store';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import translationEN from 'i18n/en/translation.json';

const isPlugin = chrome.runtime && chrome.runtime.onConnect;

// the translations
const resources = {
    en: {
        translation: translationEN
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: "en",
        fallbackLng: "en",
        react: {
            useSuspense: false
        },
        interpolation: {
            escapeValue: false // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
        }
    });

function render(store: Store) {
    ReactDOM.render(
        <React.StrictMode>
            <Provider store={store}>
                <App />
            </Provider>
        </React.StrictMode>,
        document.getElementById('root')
    );
}

if (isPlugin) {
    document.body.classList.add('plugin');
    // Get redux store from background controller
    const backgroundWindow = chrome.extension.getBackgroundPage();
    const store = (backgroundWindow as any).controller.getStore();
    const port = chrome.runtime.connect({name: 'gramWalletPopup'});
    render(store);
} else {
    render(localStore);
}

if (!isPlugin) {
    serviceWorkerRegistration.register({
        onUpdate: registration => {
            alert('New version available!  Ready to update?');
            if (registration && registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            setTimeout(() => {
                (window.location as any).reload(true);
            }, 300);
        }
    });
}
