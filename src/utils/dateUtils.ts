function doubleZero(n: number) {
    if (n < 10) return '0' + n;
    return n;
}

export function formatTime(date: Date) {
    return doubleZero(date.getHours()) + ':' + doubleZero(date.getMinutes());
}

const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

export function formatDate(date: Date) {
    return MONTH_NAMES[date.getMonth()] + ' ' + date.getDate();
}

export function formatDateFull(date: Date) {
    return date.toString();
}
