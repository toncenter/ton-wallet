import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import './styles/index.scss';
import './pollyfill';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { store } from './store/store';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import translationEN from 'i18n/en/translation.json';


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

ReactDOM.render(
  <React.StrictMode>
      <Provider store={store}>
          <BrowserRouter>
             <App />
          </BrowserRouter>
      </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(console.log);

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
