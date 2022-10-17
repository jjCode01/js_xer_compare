import Change from "./change.js"
import { formatDate, formatNumber, formatVariance, dateVariance } from "../utilities.js"

const cols = ['Act ID', '', 'Act Name']
const row = (task) => [task.task_code, task.img, task.task_name]

export let taskChanges = {
    added: new Change(
        "tk-added", "Added Activities",
        [...cols, 'Orig Dur', 'Start', 'Finish'],
        function() {
            return this.data.map(task => [
                ...row(task), task.origDur, 
                formatDate(task.start, false), formatDate(task.finish, false)
            ])
        }
    ),
    deleted: new Change(
        "tk-deleted", "Deleted Activities",
        [...cols, 'Orig Dur', 'Start', 'Finish'],
        function() {
            return this.data.map(task => [
                ...row(task), task.origDur, 
                formatDate(task.start, false), formatDate(task.finish, false)
            ])
        }
    ),
    name: new Change(
        "tk-name", "Revised Activity Names",
        [...cols, 'Prev Name'],
        function() {
            return this.data.map((task, i) => [
                ...row(task), this.prev[i].task_name
            ])
        }
    ),
    duration: new Change(
        "tk-duration", "Revised Durations",
        [...cols, 'New Dur', 'Old Dur', 'Var'],
        function() {
            return this.data.map((task, i) => {
                let prevTask = this.prev[i]
                let currDur = task.origDur
                let prevDur = prevTask.origDur
                let remDurChange = false
                if (task.notStarted && task.origDur !== task.remDur) {
                    currDur = task.remDur
                    prevDur = prevTask.remDur
                    remDurChange = true
                }
                return [
                    ...row(task),
                    `${formatNumber(currDur)}${remDurChange ? '*' : ""}`, 
                    formatNumber(prevDur), 
                    formatVariance(currDur - prevDur)
                ]
            })
        },
        '* Change to Remaining Duration'
    ),
    calendar: new Change(
        "tk-calendar", "Revised Activity Calendars",
        [...cols, 'New Cal', 'Old Cal'],
        function() {
            return this.data.map((task, i) => [
                ...row(task), task.calendar.clndr_name, 
                this.prev[i].calendar.clndr_name 
            ])
        }
    ),
    start: new Change(
        "tk-start", "Revised Actual Starts",
        [...cols, 'New Actual Start', 'Old Actual Start', 'Var'],
        function() {
            return this.data.map((task, i) => [
                ...row(task), formatDate(task.act_start_date, false) ?? "-", 
                formatDate(this.prev[i].act_start_date, false), 
                formatVariance(dateVariance(task.act_start_date, this.prev[i].act_start_date))
            ])
        }
    ),
    finish: new Change(
        "tk-finish", "Revised Actual Finishes",
        [...cols, 'New Actual Finish', 'Old Actual Finish', 'Var'],
        function() {
            return this.data.map((task, i) => [
                ...row(task), formatDate(task.act_end_date, false) ?? "-", 
                formatDate(this.prev[i].act_end_date, false), 
                formatVariance(dateVariance(task.act_end_date, this.prev[i].act_end_date))
            ])
        }
    ),
    wbs: new Change(
        "tk-wbs", "Revised WBS Assignment",
        [...cols, 'New WBS', 'Old WBS'],
        function() {
            return this.data.map((task, i) => [
                ...row(task), task.wbs.wbsId, this.prev[i].wbs.wbsId
            ])
        }
    ),
    type: new Change(
        "tk-type", "Revised Activity Type",
        [...cols, 'New Type', 'Old Type'],
        function() {
            return this.data.map((task, i) => [
                ...row(task), task.taskType, this.prev[i].taskType
            ])
        }
    ),
}