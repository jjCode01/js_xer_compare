import Change from "./change.js"
import { getWeekday, formatDate } from "../utilities.js"

export let calendarChanges = {
    added: new Change(
        "cal-added", "Added Calendar",
        ['Calendar Name', 'Type', 'Assignments', 'Sun Hrs', 'Mon Hrs', 'Tue Hrs', 'Wed Hrs', 'Thu Hrs', 'Fri Hrs', 'Sat Hrs'],
        function() {
            return this.data.map(cal => [
                cal.clndr_name, cal.type, cal.assignments, cal.week[0].hours, cal.week[1].hours, cal.week[2].hours, cal.week[3].hours, cal.week[4].hours, cal.week[5].hours, cal.week[6].hours 
            ])
        }
    ),
    deleted: new Change(
        "cal-deleted", "Deleted Calendar",
        ['Calendar Name', 'Type', 'Assignments', 'Sun Hrs', 'Mon Hrs', 'Tue Hrs', 'Wed Hrs', 'Thu Hrs', 'Fri Hrs', 'Sat Hrs'],
        function() {
            return this.data.map(cal => [
                cal.clndr_name, cal.type, cal.assignments, cal.week[0].hours, cal.week[1].hours, cal.week[2].hours, cal.week[3].hours, cal.week[4].hours, cal.week[5].hours, cal.week[6].hours 
            ])
        }
    ),
    addedHoliday: new Change(
        "cal-added-hol", "Added Non-Work Days",
        ['Calendar Name', 'Type', 'Weekday', 'Date'],
        function() {
            return this.data.map(cal => [cal.clndr_name, cal.type, getWeekday(cal.hol), formatDate(cal.hol)])
        }
    ),
    deletedHoliday: new Change(
        "cal-deleted-hol", "Deleted Non-Work Days",
        ['Calendar Name', 'Type', 'Weekday', 'Date'],
        function() {
            return this.data.map(cal => [cal.clndr_name, cal.type, getWeekday(cal.hol), formatDate(cal.hol)])
        }
    ),
    addedException: new Change(
        "cal-added-except", "Added Exception (Work) Days",
        ['Calendar Name', 'Type', 'Weekday', 'Date'],
        function() {
            return this.data.map(cal => [cal.clndr_name, cal.type, getWeekday(cal.exc), formatDate(cal.exc)])
        }
    ),
    deletedException: new Change(
        "cal-deleted-except", "Deleted Exception (Work) Days",
        ['Calendar Name', 'Type', 'Weekday', 'Date'],
        function() {
            return this.data.map(cal => [cal.clndr_name, cal.type, getWeekday(cal.exc), formatDate(cal.exc)])
        }
    ),
}