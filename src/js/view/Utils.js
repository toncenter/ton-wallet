// UI Utils

function $(x) {
    return document.querySelector(x);
}

function $$(x) {
    return document.querySelectorAll(x);
}

function toggle(div, visible) {
    let d = visible;
    if (visible === true) d = 'block';
    if (visible === false) d = 'none';

    div.style.display = d;
}

function htmlToElement(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.firstChild;
}

function onInput(input, handler) {
    input.addEventListener('change', handler);
    input.addEventListener('input', handler);
    input.addEventListener('cut', handler);
    input.addEventListener('paste', handler);
}

function formatAddr(s) {
    return s.substring(0, s.length / 2) + '<wbr>' + s.substring(s.length / 2);
}

function doubleZero(n) {
    if (n < 10) return '0' + n;
    return n;
}

function formatTime(date) {
    return doubleZero(date.getHours()) + ':' + doubleZero(date.getMinutes());
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatDate(date) {
    return MONTH_NAMES[date.getMonth()] + ' ' + date.getDate();
}

function formatDateFull(date) {
    return date.toString();
}

function copyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";  //avoid scrolling to bottom
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    var result = false;
    try {
        const successful = document.execCommand('copy');
        result = successful ? 'successful' : 'unsuccessful';
    } catch (err) {
    }

    document.body.removeChild(textArea);
    return result;
}

const IMPORT_WORDS_COUNT = 24;

export {
    $,
    $$,
    toggle,
    htmlToElement,
    onInput,
    formatAddr,
    doubleZero,
    formatTime,
    formatDate,
    formatDateFull,
    copyToClipboard,
    IMPORT_WORDS_COUNT
};
