export const formatDate = (dt, fullYear=true) => {
    if (dt instanceof Date && !isNaN(dt)) {
        const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const Y = fullYear === true ? dt.getFullYear() : dt.getFullYear().toString().substring(2)
        return `${dt.getDate()}-${M[dt.getMonth()]}-${Y}`;
    }
    return;
}

export const excelDateToJSDate = (date) => {
    const tempDate = new Date((date - 25568)*86400*1000);
    return new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), 0, 0, 0);
}

export const formatNumber = (num, min = 0, sign = 'never') => {
    const returnString = Intl.NumberFormat('en-US', {
        minimumFractionDigits: min,
        maximumFractionDigits: 2,
        signDisplay: 'never',
    }).format(num);
    return num < 0 ? `(${returnString})` : returnString;
}

export const formatAbsNum = num => {
    if (isNaN(num)) return "N/A"
    return Intl.NumberFormat('en-US', {
        maximumFractionDigits: 1,
        signDisplay: 'never',
    }).format(num)
}

export const formatVariance = (num) => {
    if (isNaN(num)) return "N/A"
    let sign = num === 0 ? "auto" : "always";
    return Intl.NumberFormat('en-US', {
        maximumFractionDigits: 1,
        signDisplay: sign,
    }).format(num)
}

export const formatCost = cost => formatNumber(cost, 2)

export const formatPercent = (value, sign="auto") => {
    if (isNaN(value)) return "N/A"
    const returnString = Intl.NumberFormat('en-US', {
        style: 'percent',
        maximumFractionDigits: 1,
        signDisplay: sign,
    }).format(value)
    return returnString
}

export const dateVariance = (date1, date2) => {
    if (!date1 instanceof Date || !date2 instanceof Date || isNaN(date1) || isNaN(date2)) {
        return NaN
    }
    return (date1.getTime() - date2.getTime()) / (1000 * 3600 * 24)
}

export function sortByStart(a, b){
    return (a.start.getTime() > b.start.getTime()) ? 1 : (a.start.getTime() === b.start.getTime()) ? ((a.finish.getTime() > b.finish.getTime()) ? 1 : -1) : -1
}

export function sortByFinish(a, b){
    return (a.finish.getTime() > b.finish.getTime()) ? 1 : (a.finish.getTime() === b.finish.getTime()) ? ((a.start.getTime() > b.start.getTime()) ? 1 : -1) : -1
}

export const sortById = (a, b) => (a.task_code > b.task_code) ? 1 : -1

export const findClosingParentheses = (data, start=0) => {
    let parenthesesCnt = 0;
    for (let i = start; i < data.length; i++) {
        if (data[i] === '(') { parenthesesCnt++; }
        else if (data[i] === ')') {
            if (parenthesesCnt === 0) return;
            parenthesesCnt--;
        }
        if (parenthesesCnt === 0) return i;
    }
    return;
}
