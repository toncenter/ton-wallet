// UI Utils

/**
 * @param selector  {string}
 * @return {HTMLElement | null}
 */
function $(selector) {
    return document.querySelector(selector);
}

/**
 * @param selector  {string}
 * @return {NodeListOf<HTMLElement>}
 */
function $$(selector) {
    return document.querySelectorAll(selector);
}

/**
 * @param div   {HTMLElement}
 * @param visible {boolean | 'none' | 'block' | 'flex' | 'inline-block'}
 */
function toggle(div, visible) {
    let d = visible;
    if (visible === true) d = 'block';
    if (visible === false) d = 'none';

    div.style.display = d;
}

/**
 * @param div   {HTMLElement}
 * @param isVisible {boolean}
 * @param params?    {{isBack?: boolean}}
 */
function toggleFaded(div, isVisible, params) {
    params = params || {};
    if (params.isBack) {
        div.classList.add('isBack');
    } else {
        div.classList.remove('isBack');
    }
    if (isVisible) {
        div.classList.add('faded-show');
        div.classList.remove('faded-hide');
    } else {
        div.classList.remove('faded-show');
        div.classList.add('faded-hide');
    }
}

/**
 * @param div   {HTMLElement}
 * @param className {string}
 * @param duration  {number}
 */
function triggerClass(div, className, duration) {
    div.classList.add(className);

    setTimeout(() => {
        div.classList.remove(className);
    }, duration);
}

/**
 * @param params    {{tag: string, clazz?: string | (string | undefined)[], text?: string, child?: (HTMLElement | undefined)[], style?: Object<string, string>}}
 * @return {HTMLElement}
 */
function createElement(params) {
    const item = document.createElement(params.tag);
    if (params.clazz) {
        if (Array.isArray(params.clazz)) {
            for (let c of params.clazz) {
                if (c) {
                    item.classList.add(c);
                }
            }
        } else {
            item.classList.add(params.clazz);
        }
    }
    if (params.text) item.innerText = params.text;
    if (params.child) {
        for (let c of params.child) {
            if (c) {
                item.appendChild(c);
            }
        }
    }
    if (params.style) {
        for (let key in params.style) {
            item.style[key] = params.style[key];
        }
    }
    return item;
}

/**
 * @param el {HTMLElement}
 * @param s  {string}
 * @return {HTMLElement}
 */
function setAddr(el, s) {
    el.innerHTML = '';
    el.appendChild(document.createTextNode(s.substring(0, s.length / 2)));
    el.appendChild(document.createElement('wbr'));
    el.appendChild(document.createTextNode(s.substring(s.length / 2)));
    return el;
}

/**
 * @param el    {HTMLElement}
 */
function clearElement(el) {
    el.innerHTML = '';
}

/**
 * @param input {HTMLElement}
 * @param handler   {(e: Event) => void}
 */
function onInput(input, handler) {
    input.addEventListener('change', handler);
    input.addEventListener('input', handler);
    input.addEventListener('cut', handler);
    input.addEventListener('paste', handler);
}

/**
 * @param n {number}
 * @return {string}
 */
function doubleZero(n) {
    if (n < 10) return '0' + n;
    return n.toString();
}

/**
 * @param date  {Date}
 * @return {string}
 */
function formatTime(date) {
    return doubleZero(date.getHours()) + ':' + doubleZero(date.getMinutes());
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * @param date  {Date}
 * @return {string}
 */
function formatDate(date) {
    return MONTH_NAMES[date.getMonth()] + ' ' + date.getDate();
}

/**
 * @param date  {Date}
 * @return {string}
 */
function formatDateFull(date) {
    return date.toString();
}

/**
 * @param text  {string}
 * @return {boolean}
 */
function copyToClipboard(text) {
    /** @type {HTMLTextAreaElement} */
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";  //avoid scrolling to bottom
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    /** @type {boolean} */
    let result = false;
    try {
        result = document.execCommand('copy');
    } catch (err) {
    }

    document.body.removeChild(textArea);
    return result;
}

const IMPORT_WORDS_COUNT = 24;
const CONFIRM_WORDS_COUNT = 3;

export {
    $,
    $$,
    toggle,
    toggleFaded,
    triggerClass,
    createElement,
    clearElement,
    onInput,
    setAddr,
    doubleZero,
    formatTime,
    formatDate,
    formatDateFull,
    copyToClipboard,
    IMPORT_WORDS_COUNT,
    CONFIRM_WORDS_COUNT
};
