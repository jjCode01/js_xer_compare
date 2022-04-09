const CALENDARTYPES = {
    CA_Base: 'Global',
    CA_Rsrc: 'Resource',
    CA_Project: 'Project',
}
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const REGEXSHIFT = /s\|[0-1][0-9]:[0-5][0-9]\|f\|[0-1][0-9]:[0-5][0-9]/g;
const REGEXHOUR = /[0-1][0-9]:[0-5][0-9]/g;

const parseWorkShifts = (data) => {
    let workHours = Array.from(data.matchAll(REGEXSHIFT), m => m[0])
    let shifts = [];
    workHours.forEach(shift => {
        let hours = Array.from(shift.matchAll(REGEXHOUR), m => m[0]);
        for (let s = 0; s < hours.length; s += 2) {
            shifts.push([hours[s], hours[s + 1]]);
        }
    })
    return shifts
}

const newWorkDay = (dayName, shifts) => {
    return {
        day: dayName,
        shifts: shifts,
        hours: shifts.reduce((a, s) => {
            let h = parseInt(s[1].slice(0,2)) - parseInt(s[0].slice(0,2));
            let m = parseInt(String(s[1]).slice(-2)) / 60 - parseInt(String(s[0]).slice(-2)) / 60
            return a + h + m;
        }, 0),
        start: shifts.length ? shifts[0][0] : "",
        end: shifts.length ? shifts[shifts.length - 1][1] : ""
    }
}

const newExceptionDay = (date, shifts) => {
    let workDay = newWorkDay(WEEKDAYS[date.getDay()], shifts)
    workDay.date = date
    return workDay
}

const parseWorkWeek = cal => {
    const searchFor = "DaysOfWeek()"
    const start = cal.clndr_data.indexOf(searchFor) + searchFor.length;
    const end = findClosingParentheses(cal.clndr_data, start);
    const weekDayData = cal.clndr_data.substring(start, end).slice(1, -1).trim();
    const weekDayDataArr = weekDayData.split(/[1-7]\(\)\(/g).slice(1);
    const workWeek = weekDayDataArr.map((day, i) => newWorkDay(WEEKDAYS[i], parseWorkShifts(day)))
    return workWeek;
}

const parseAllExceptionStrings = cal => {
    if (!('clndr_data' in cal)) return undefined;	
    const data = cal.clndr_data;
    if (!data.includes('d|')) return []
    return data.split(/\(d\|/g).slice(1);
}

const parseHolidays = cal => {
    const exceptions = parseAllExceptionStrings(cal)
    if (!exceptions) return {}
    let holidays = {}
    exceptions.filter(e => !e.includes('s|')).forEach(e => {
        const dt = excelDateToJSDate(e.slice(0, 5))
        holidays[dt.getTime()] = dt;
    })
    return holidays;
}

const parseExceptions = cal => {
    const exceptions = parseAllExceptionStrings(cal)
    if (!exceptions) return {}
    let workExceptions = {};
    exceptions.filter(e => e.includes('s|')).forEach(e => {
        const dt = excelDateToJSDate(e.slice(0, 5));
        workExceptions[dt.getTime()] = newExceptionDay(dt, parseWorkShifts(e))
    })
    return workExceptions;
}

export default class Calendar {
    constructor(obj) {
        Object.assign(this, obj)
        this.default = this.default_flag === 'Y';
        this.type = CALENDARTYPES[this.clndr_type];
        this.id = (this.clndr_type === 'CA_Project') ? this.clndr_name : this.clndr_id;
        this.assignments = 0;
        this.week = parseWorkWeek(this);
        this.holidays = parseHolidays(this);
        this.exceptions = parseExceptions(this);
    }
    print(){
        console.log(`${this.clndr_name}`);
    }
}
