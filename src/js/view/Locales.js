import { storage } from '../util/storage.js';
import { $$, clearElement } from './Utils.js';

/**
 * Locale used as default and getting absent in selected locale items
 */
 const DEFAULT_LOCALE_ID = 'en';

/**
 * List of available locales identifiers and its names
 */
const AVAILABLE_LOCALES = {
    'en': 'English',
    'ru': 'Русский'
};

/**
 * Store current app locale id
 */
let currentLocaleId = null;

/**
 * Current locale date formatter
 */
let dateFormatter = null;

/**
 * Current locale time formatter
 */
let timeFormatter = null;

/**
 * Current locale date and time formatter
 */
let dateTimeFormatter = null;

/**
 * Store loaded locales cache
 */
let localesData = {};

/**
 * Return first user device locales which available in app,
 * if no available locales, return "en" by default
 */
const getAvailableUserLocale = selectedId => {
    const locales = [selectedId, ...navigator.languages];

    for(let i = 0, l = locales.length; i < l; i++) {
        const localeId = locales[i];
        if (AVAILABLE_LOCALES[localeId]) return localeId;
    }

    return DEFAULT_LOCALE_ID;
};

/**
 * Return available locales object
 * keys   - locales identifiers
 * values - locales names
 */
const getAvailableLocales = () => AVAILABLE_LOCALES;

/**
 * Load locale data with cache using
 */
const loadLocale = async id => {
    if (!localesData[id]) {
        const response = await fetch(`locales/${id}.json`);
        localesData[id] = await response.json();
    }

    return localesData[id];
};

/**
 * Return current application locale item by path "category.subcategory.some"
 * with fallback to default locale for absent items
 */
const getLocaleItem = (path, useDefault = false) => {
    const data = localesData[useDefault ? DEFAULT_LOCALE_ID : currentLocaleId];

    const value = path.split('.').reduce((data, key) => {
        if (data === null) return null;
        if (!Object.prototype.hasOwnProperty.call(data, key)) return null;
        return data[key];
    }, data);

    if (value !== null) return value;

    // Try to return item from default locale if it not is current
    return (!useDefault && currentLocaleId !== DEFAULT_LOCALE_ID) ? getLocaleItem(path, true) : '';
};

/**
 * Set locale item text and "data-l" attribute to element
 */
const setElementLocaleText = ($element, path) => {
    $element.dataset.l = path;

    const item = getLocaleItem(path);
    if ($element.nodeName === 'INPUT') return $element.placeholder = item;

    clearElement($element);
    // Split by "\n" and replace it by <br> tags
    item.split('\n').forEach((part, i) => {
        if (i !== 0) $element.appendChild(document.createElement('br'));
        $element.appendChild(document.createTextNode(part));
    });
}

/**
 * Store current mouse event target
 */
let currentLocaleIdHelperTarget = null;

/**
 * Show locale item path
 */
const showLocaleIdHelper = e => {
    // Not do work for same element
    if (e.target === currentLocaleIdHelperTarget) return;

    // Remove previous element title (need for elements with dynamic localized content,
    // for example, notify or alert modal)
    if (currentLocaleIdHelperTarget && currentLocaleIdHelperTarget.dataset.l) {
        currentLocaleIdHelperTarget.title = '';
    }
    currentLocaleIdHelperTarget = e.target;

    // Do nothing for non localized elements
    if (!e.target.dataset.l) return;

    // Set localized element title
    e.target.title = e.target.dataset.l;
};

/**
 * Format short date using locale formatter
 */
const formatDate = date => {
    return dateFormatter.format(date);
};

/**
 * Format time using locale formatter
 */
const formatTime = date => {
    return timeFormatter.format(date);
};

/**
 * Format full date with time using locale formatter
 */
const formatDateTime = date => {
    return dateTimeFormatter.format(date);
};

/**
 * Switch default/debug mode to show locale items path on mouse enter in localized element
 */
const setLocalesDebug = state => {
    if (state) window.addEventListener('mousemove', showLocaleIdHelper);
    else window.removeEventListener('mousemove', showLocaleIdHelper);
};

/**
 * Setup passed or most relevant from availables locale
 */
const setupLocale = async needLocaleId => {
    const localeId = needLocaleId || await storage.getItem('locale');
    const relevantLocaleId = getAvailableUserLocale(localeId);

    // If passed locale available, save it
    if (needLocaleId === relevantLocaleId) await storage.setItem('locale', relevantLocaleId);

    const loads = [loadLocale(relevantLocaleId)];
    // Load default locale for absend items show
    if (relevantLocaleId !== DEFAULT_LOCALE_ID) loads.push(loadLocale(DEFAULT_LOCALE_ID));

    await Promise.all(loads);

    // Set current locale identifier and create locale date/time formatters
    currentLocaleId = relevantLocaleId;
    dateFormatter = Intl.DateTimeFormat(relevantLocaleId, { day: 'numeric', month: 'long' });
    timeFormatter = Intl.DateTimeFormat(
        relevantLocaleId, { hour: 'numeric', minute: 'numeric' }
    );
    dateTimeFormatter = Intl.DateTimeFormat(relevantLocaleId, {
        day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric'
    });

    [...$$('[data-l]')].forEach(element => setElementLocaleText(element, element.dataset.l));
    [...$$('[data-ldate]')].forEach(element => {
        element.innerText = formatDate(new Date(+element.dataset.ldate));
    });
    [...$$('[data-ltime]')].forEach(element => {
        element.innerText = formatTime(new Date(+element.dataset.ltime));
    });
    [...$$('[data-ldatetime]')].forEach(element => {
        element.innerText = formatDateTime(new Date(+element.dataset.ldatetime));
    });
};

export {
    getAvailableLocales, getLocaleItem, setElementLocaleText,
    formatDate, formatTime, formatDateTime, setLocalesDebug, setupLocale
};
