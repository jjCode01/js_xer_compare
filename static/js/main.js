import { updates, constraintVariance, constraintChanges, plannedProgress } from "./data.js"
import { taskChanges } from "./data/taskChanges.js"
import { logicChanges } from "./data/logicChanges.js"
import { resourceChanges } from "./data/resourceChanges.js"
import { calendarChanges } from "./data/calendarChanges.js"
import { wbsChanges } from "./data/wbsChanges.js"
import { noteBookChanges } from "./data/noteBookChanges.js"
import * as util from "./utilities.js"
import ParseXer from "./modules/parseXerTables.js"

export let xerTables = {
    current: {},
    previous: {}
}

export let projects = {}

export let FLOAT = {
    show: true,
    critical: 0,
    nearCritical: 20,
    high: 50,
}

const CHARTCOLOR = {
    BLUE: '54, 162, 235',
    GREEN: '113, 194, 92',
    YELLOW: '255, 206, 86',
    RED: '255, 99, 132',
}

const updateElText = (id, value) => document.getElementById(id).textContent = value

function updateProjCard(name, value){
    const proj = xerTables[name].PROJECT[value]
    proj.deepAnalysis()
    projects[name] = proj

    updateElText(`${name}-project-id`, proj.proj_short_name)
    updateElText(`${name}-project-name`, proj.name)
    updateElText(`${name}-start`, util.formatDate(proj.start))
    updateElText(`${name}-data-date`, util.formatDate(proj.last_recalc_date))
    updateElText(`${name}-end`, util.formatDate(proj.scd_end_date))
    updateElText(`${name}-mfb`, util.formatDate(proj.plan_end_date) ?? "None")
    updateElText(`${name}-budget`, util.formatCost(proj.budgetCost))
    updateElText(`${name}-actual-cost`, util.formatCost(proj.actualCost))
    updateElText(`${name}-this-period`, util.formatCost(proj.thisPeriodCost))
    updateElText(`${name}-remaining-cost`, util.formatCost(proj.remainingCost))
    updateElText(`${name}-qty`, util.formatNumber(proj.budgetQty))
    updateElText(`${name}-actual-qty`, util.formatNumber(proj.actualQty))
    updateElText(`${name}-this-period-qty`, util.formatNumber(proj.thisPeriodQty))
    updateElText(`${name}-remaining-qty`, util.formatNumber(proj.remainingQty))
    updateElText(`${name}-tasks`, proj.tasks.size.toLocaleString())
    updateElText(`${name}-not-started`, proj.notStarted.length.toLocaleString())
    updateElText(`${name}-in-progress`, proj.inProgress.length.toLocaleString())
    updateElText(`${name}-complete`, proj.completed.length.toLocaleString())
    updateElText(`${name}-schedule-per`, util.formatPercent(proj.schedPercentComp))
    updateElText(`${name}-physical-per`, util.formatPercent(proj.physPercentComp))
    updateElText(`${name}-cost-per`, util.formatPercent(proj.actualCost / proj.budgetCost))
    updateElText(`${name}-critical-per`, util.formatPercent(proj.critical.length / proj.open.length))
    updateElText(`${name}-near-critical-per`, util.formatPercent(proj.nearCritical.length / proj.open.length))
    updateElText(`${name}-normal-tf-per`, util.formatPercent(proj.normalFloat.length / proj.open.length))
    updateElText(`${name}-high-tf-per`, util.formatPercent(proj.highFloat.length / proj.open.length))
    updateElText(`${name}-longest-path-per`, util.formatPercent(proj.longestPath.length / proj.open.length))

    function updateElements(obj) {
	    const revSec = document.getElementById('revisions-sec')
        Object.values(obj).forEach(update => {
            update.update()
            if (update.data.length) {
                const valueEl = document.getElementById(update.id)
                const labelEl = document.getElementById(`${update.id}-label`)
                valueEl.style.cursor = 'pointer'
                valueEl.style.fontWeight = 'bold'
                labelEl.style.cursor = 'pointer'
                const table = update.table;
                revSec.append(table)
                
                valueEl.addEventListener("click", () => table.scrollIntoView({ behavior: 'smooth'}))
                labelEl.addEventListener("click", () => table.scrollIntoView({ behavior: 'smooth'}))
            }
        })
    }

    function createPieChart(parent, chartLabel, dataLabels, data, colors) {
        return new Chart(parent, {
            type: 'pie',
            data: {
                labels: dataLabels,
                datasets: [{
                    label: chartLabel,
                    data: data,
                    backgroundColor: colors,
                    hoverOffset: 3
                }]
            },
            options: {
                plugins: {
                    legend: {
                        display: false,
                    }
                },
                maintainAspectRatio: false
            }
        });
    }

    if (name === "current") {
        let ctxCostLoading = document.getElementById('costLoadingChart');
        let costLoadingChart = createPieChart(
            ctxCostLoading, 'Cost Loading',
            ['Actual Cost', 'Remaining Cost'],
            [projects.current.actualCost, projects.current.remainingCost,],
            [`rgba(${CHARTCOLOR.BLUE}, 1)`, `rgba(${CHARTCOLOR.RED}, 1)`,],
        )

        let ctxResourceLoading = document.getElementById('resourceLoadingChart');
        let resourceLoadingChart = createPieChart(
            ctxResourceLoading, 'Resource Loading',
            ['Actual Qty', 'Remaining Qty'],
            [projects.current.actualQty, projects.current.remainingQty,],
            [`rgba(${CHARTCOLOR.BLUE}, 1)`, `rgba(${CHARTCOLOR.RED}, 1)`,],
        )
    }

    if (name === "previous") {
        document.getElementById('title').innerText = `Schedule Comparison - ${projects.current.proj_short_name} vs ${projects.previous.proj_short_name}`
        document.getElementById('pageFooter').innerText = `Schedule Comparison - ${projects.current.proj_short_name} vs ${projects.previous.proj_short_name}`

        const schedProgressDiff = projects.current.schedPercentComp - projects.previous.schedPercentComp
        if (schedProgressDiff > 0) {
            document.getElementById("sched-progress").style.width = `${util.formatPercent(projects.previous.schedPercentComp)}`
            document.getElementById("var-sched-progress").style.width = `${util.formatPercent(schedProgressDiff)}`
        }
        else {
            document.getElementById("sched-progress").style.width = `${util.formatPercent(projects.current.schedPercentComp)}`
        }
        document.getElementById("sched-progress").ariaValueNow = `${util.formatPercent(projects.current.schedPercentComp)}`
        
        const physicalProgressDiff = projects.current.physPercentComp - projects.previous.physPercentComp
        if (physicalProgressDiff > 0 ){
            document.getElementById("phys-progress").style.width = `${util.formatPercent(projects.previous.physPercentComp)}`
            document.getElementById("var-phys-progress").style.width = `${util.formatPercent(physicalProgressDiff)}`
        }
        else {
            document.getElementById("phys-progress").style.width = `${util.formatPercent(projects.current.physPercentComp)}`
        }
        document.getElementById("phys-progress").ariaValueNow = `${util.formatPercent(projects.current.physPercentComp)}`
        if (projects.current.budgetCost) {
            const currentCostPercent = projects.current.actualCost / projects.current.budgetCost
            document.getElementById("cost-progress").style.width = `${util.formatPercent(currentCostPercent)}`
            document.getElementById("cost-progress").ariaValueNow = `${util.formatPercent(currentCostPercent)}`
        }

        const currCalendars = [...Object.values(xerTables.current.CALENDAR)]
        const prevCalendars = [...Object.values(xerTables.previous.CALENDAR)]

        const currTasks = projects.current.taskArray.sort(util.sortById)
        const prevTasks = projects.previous.taskArray.sort(util.sortById)

        let ctxStatusChart = document.getElementById('activityStatusChart');
        let statusChart = new Chart(ctxStatusChart, {
            type: 'bar',
            data: {
                labels: ['Current', 'Previous'],
                datasets: [
                    {
                        label: 'Complete',
                        data: [
                            projects.current.completed.length, // / projects.current.taskArray.length,
                            projects.previous.completed.length, // / projects.previous.taskArray.length, 
                        ],
                        backgroundColor: [`rgba(${CHARTCOLOR.BLUE}, 0.9)`],
                        borderColor: [`rgba(${CHARTCOLOR.BLUE}, 1)`],
                        borderWidth: 1,
                    },
                    {
                        label: 'In Progress',
                        data: [
                            projects.current.inProgress.length, // / projects.current.taskArray.length,
                            projects.previous.inProgress.length, // / projects.previous.taskArray.length,
                        ],
                        backgroundColor: [`rgba(${CHARTCOLOR.GREEN}, 0.9)`],
                        borderColor: [`rgba(${CHARTCOLOR.GREEN}, 1)`], 
                        borderWidth: 1,
                    },
                    {
                        label: 'Not Started',
                        data: [
                            projects.current.notStarted.length, // / projects.current.taskArray.length, 
                            projects.previous.notStarted.length, // / projects.previous.taskArray.length,

                        ],
                        backgroundColor: [`rgba(${CHARTCOLOR.RED}, 0.9)`],
                        borderColor: [`rgba(${CHARTCOLOR.RED}, 1)`],
                        borderWidth: 1,
                    },
                    
                ]
            },
            options: {
                plugins: {
                    legend: {display: false,}
                },
                indexAxis: 'y',
                scales: {
                    x: {stacked: true,},
                    y: {stacked: true,},
                },
                maintainAspectRatio: false
            }
        });

        let ctxTotalFloatChart = document.getElementById('totalFloatChart');
        let totalFloatChart = new Chart(ctxTotalFloatChart, {
            type: 'bar',
            data: {
                labels: ['Current', 'Previous'],
                datasets: [
                    {
                        label: 'Critical',
                        data: [
                            projects.current.critical.length / projects.current.open.length,
                            projects.previous.critical.length / projects.previous.open.length, 
                        ],
                        backgroundColor: [`rgba(${CHARTCOLOR.RED}, 0.9)`],
                        borderColor: [`rgba(${CHARTCOLOR.RED}, 1)`],
                        borderWidth: 1,
                    },
                    {
                        label: 'Near Critical',
                        data: [
                            projects.current.nearCritical.length / projects.current.open.length,
                            projects.previous.nearCritical.length / projects.previous.open.length,
                        ],
                        backgroundColor: [`rgba(${CHARTCOLOR.YELLOW}, 0.9)`],
                        borderColor: [`rgba(${CHARTCOLOR.YELLOW}, 1)`], 
                        borderWidth: 1,
                    },
                    {
                        label: 'Normal Float',
                        data: [
                            projects.current.normalFloat.length / projects.current.open.length, 
                            projects.previous.normalFloat.length / projects.previous.open.length,

                        ],
                        backgroundColor: [`rgba(${CHARTCOLOR.GREEN}, 0.9)`],
                        borderColor: [`rgba(${CHARTCOLOR.GREEN}, 1)`],
                        borderWidth: 1,
                    },
                    {
                        label: 'High Float',
                        data: [
                            projects.current.highFloat.length / projects.current.open.length, 
                            projects.previous.highFloat.length / projects.previous.open.length,

                        ],
                        backgroundColor: [`rgba(${CHARTCOLOR.BLUE}, 0.9)`],
                        borderColor: [`rgba(${CHARTCOLOR.BLUE}, 1)`],
                        borderWidth: 1,
                    },
                ]
            },
            options: {
                plugins: {
                    legend: {display: false,}
                },
                indexAxis: 'y',
                scales: {
                    x: {
                      stacked: true,
                      ticks: {
                        callback: function(value, index, ticks) {
                            return value * 100 + '%';
                        }
                        }
                    },
                    y: {stacked: true,},
                },
                maintainAspectRatio: false
            }
        });

        constraintVariance.data = currTasks.filter(task => task.primeConstraint === "Finish on or Before")
        constraintVariance.prev = constraintVariance.data.map(task => projects.previous.get(task))
        if (constraintVariance.data.length) {
            document.getElementById('constraint-variance').append(constraintVariance.table)
        }

        taskChanges.added.data = currTasks.filter(task => !projects.previous.has(task))
        taskChanges.deleted.data = prevTasks.filter(task => !projects.current.has(task))

	    const ongoingTasks = currTasks.filter(task => projects.previous.has(task))
        ongoingTasks.forEach(task => {
            const prevTask = projects.previous.get(task)
            if (task.inProgress && prevTask.notStarted) updates.started.add = {curr: task}
            if (task.completed && prevTask.inProgress) updates.finished.add = {curr: task}
            if (task.completed && prevTask.notStarted) updates.startFinish.add = {curr: task}
            if (task.task_name !== prevTask.task_name) taskChanges.name.add = {curr: task, prev: prevTask}
            if (task.calendar.id !== prevTask.calendar.id) taskChanges.calendar.add = {curr: task, prev: prevTask}
            if (task.wbs.wbsId !== prevTask.wbs.wbsId) taskChanges.wbs.add = {curr: task, prev: prevTask}
            if (task.taskType !== prevTask.taskType) taskChanges.type.add = {curr: task, prev: prevTask}

            if (!task.isLOE) {
                if (task.origDur !== prevTask.origDur) taskChanges.duration.add = {curr: task, prev: prevTask}
                if (task.notStarted && task.origDur !== task.remDur && task.remDur != prevTask.remDur) {
                    taskChanges.duration.add = {curr: task, prev: prevTask}
                }
            }
            if (task.task_type !== 'TT_FinMile' && !prevTask.notStarted && util.formatDate(task.start) !== util.formatDate(prevTask.start)) {
                taskChanges.start.add = {curr: task, prev: prevTask}
            }
            if (task.task_type !== 'TT_Mile' && prevTask.completed && util.formatDate(task.finish) !== util.formatDate(prevTask.finish)) {
                taskChanges.finish.add = {curr: task, prev: prevTask}
            }
            if (task.primeConstraint && task.primeConstraint !== prevTask.primeConstraint) {
                constraintChanges.addedPrim.add = {curr: task, prev: prevTask}
            }
            if (task.secondConstraint && task.secondConstraint !== prevTask.secondConstraint) {
                constraintChanges.addedSec.add = {curr: task, prev: prevTask}
            }
            if (task.cstr_date && task.primeConstraint === prevTask.primeConstraint &&
                task.cstr_date.getTime() !== prevTask.cstr_date.getTime()) {
                    constraintChanges.revisedPrim.add = {curr: task, prev: prevTask}
            }
            if (task.cstr_date2 && task.secondConstraint === prevTask.secondConstraint &&
                task.cstr_date2.getTime() !== prevTask.cstr_date2.getTime()) {
                    constraintChanges.revisedSec.add = {curr: task, prev: prevTask}
            }
        })
        updateElements(taskChanges)

        logicChanges.deleted.data = projects.previous.rels.filter(rel => !projects.current.has(rel))
        projects.current.rels.forEach((rel, i) => {
            if (!projects.previous.has(rel)) logicChanges.added.add = {curr: rel}
            if (projects.previous.has(rel) && rel.lag !== projects.previous.get(rel).lag) {
                logicChanges.revised.add = {curr: rel, prev: projects.previous.get(rel)}
            }
        })
        logicChanges.revised.prev = logicChanges.revised.data.map(rel => projects.previous.get(rel))

        for (let a = logicChanges.added.data.length - 1; a >= 0; a--) {
            let addRel = logicChanges.added.data[a];
            for (let d = logicChanges.deleted.data.length - 1; d >= 0; d--) {
                let delRel = logicChanges.deleted.data[d];
                if (addRel.predTask.task_code === delRel.predTask.task_code && addRel.succTask.task_code === delRel.succTask.task_code) {
                    logicChanges.revised.data.push(logicChanges.added.data.splice(a, 1)[0]);
                    logicChanges.revised.prev.push(logicChanges.deleted.data.splice(d, 1)[0]);
                    break;
                }
            }
        }
        updateElements(logicChanges)

        resourceChanges.deleted.data = projects.previous.resources.filter(res => !projects.current.has(res)).sort(r => r.task.task_code)
            
        projects.current.resources.forEach(res => {
            if (projects.previous.has(res)) {
                let prev = projects.previous.get(res)
                if (res.target_cost !== prev.target_cost) resourceChanges.revisedCost.add = {curr: res, prev: prev}
                if (res.target_qty !== prev.target_qty) resourceChanges.revisedUnits.add = {curr: res, prev: prev}
            } else {
                resourceChanges.added.add = res
            }
        })
        
        updateElements(resourceChanges)

	    const hasCalendar = (cal, table) => {
            if (!(cal.type === 'Project')) return (cal.clndr_id in table.CALENDAR)
            for (let c in table.CALENDAR) {
                if (table.CALENDAR[c].id === cal.id) return true
            }
            return false
        }
        const getCalendar = (cal, table) => {
            if (hasCalendar(cal, table)) {
                if (!(cal.type === 'Project')) return table.CALENDAR[cal.clndr_id]
                for (let c in table.CALENDAR) {
                    if (table.CALENDAR[c].id === cal.id) return table.CALENDAR[c]
                }
            }
            return
        }

        calendarChanges.added.data = currCalendars.filter(cal => cal.assignments > 0 && !hasCalendar(cal, xerTables.previous))
	    calendarChanges.deleted.data = prevCalendars.filter(cal => cal.assignments > 0 && !hasCalendar(cal, xerTables.current))
        const ongoingCalendars = currCalendars.filter(cal => cal.assignments && hasCalendar(cal, xerTables.previous))
        ongoingCalendars.forEach(cal => {
            const prevCal = getCalendar(cal, xerTables.previous)
            for (let h in cal.holidays) {
                if (!(h in prevCal.holidays)) {
                    calendarChanges.addedHoliday.add = {
                        curr: {
                            clndr_name: cal.clndr_name, 
                            type: cal.type, 
                            hol: cal.holidays[h]
                        }
                    }
                }
            }
            for (let h in prevCal.holidays) {
                if (!(h in cal.holidays)) {
                    calendarChanges.deletedHoliday.add = {
                        curr: {
                            clndr_name: prevCal.clndr_name, 
                            type: prevCal.type, 
                            hol: prevCal.holidays[h]
                        }
                    }
                }
            }

            for (let e in cal.exceptions) {
                if (!(e in prevCal.exceptions)) {
                    calendarChanges.addedException.add = {
                        curr: {
                            clndr_name: cal.clndr_name, 
                            type: cal.type, 
                            exc: cal.exceptions[e]
                        }
                    }
                }
            }
            for (let e in prevCal.exceptions) {
                if (!(e in cal.exceptions)) {
                    calendarChanges.deletedException.add = {
                        curr: {
                            clndr_name: prevCal.clndr_name, 
                            type: prevCal.type, 
                            exc: prevCal.exceptions[e].date
                        }
                    }
                }
            }
        })
        updateElements(calendarChanges)

        const prevWbsArr = Array.from(projects.previous.wbs.values())
        wbsChanges.deleted.data = prevWbsArr.filter(wbs => !wbs.isProjectNode && !projects.current.has(wbs))

        Array.from(projects.current.wbs.values()).forEach(wbs => {
            if (!wbs.isProjectNode) {
                const prevWbs = projects.previous.get(wbs)
                if (!prevWbs) {
                    wbsChanges.added.add = {curr: wbs};
                }
                else {
                    if (prevWbs.wbs_name !== wbs.wbs_name) {
                        wbsChanges.revised.add = {curr: wbs, prev: prevWbs}
                    }
                }
            }
        })

        updateElements(wbsChanges)
        constraintChanges.deletedPrim.data = prevTasks.filter(task => {
            return (
                projects.current.has(task) && 
                task.primeConstraint && 
                task.primeConstraint !== projects.current.get(task).primeConstraint
            )
        })
        constraintChanges.deletedSec.data = prevTasks.filter(task => {
            return (
                projects.current.has(task) && 
                task.secondConstraint && 
                task.secondConstraint !== projects.current.get(task).secondConstraint
            )
        })
        updateElements(constraintChanges)

        if (projects.current.notes.size) {
            const currMemoArr = Array.from(projects.current.notes.values())
            currMemoArr.forEach(memo => {
                if (!projects.previous.notes.has(memo.id)) {
                    noteBookChanges.added.add = {curr: memo}
                } else {
                    const prevMemo = projects.previous.notes.get(memo.id)
                    if (memo.note !== prevMemo.note) {
                        noteBookChanges.revised.add = {curr: memo, prev: prevMemo}
                    }
                }
            })
        }

        if (projects.previous.notes.size) {
            noteBookChanges.deleted.data = Array.from(projects.previous.notes.values()).filter(memo => {
                return !projects.current.notes.has(memo.id)
            })
        }
        updateElements(noteBookChanges)

        updateElText('start-var', util.formatAbsNum(util.dateVariance(projects.current.start, projects.previous.start)))
        updateElText('dd-var', util.formatAbsNum(util.dateVariance(projects.current.last_recalc_date, projects.previous.last_recalc_date)))
        updateElText('end-var', util.formatVariance(util.dateVariance(projects.previous.scd_end_date, projects.current.scd_end_date)))
        updateElText('mfb-var', util.formatVariance(util.dateVariance(projects.current.plan_end_date, projects.previous.plan_end_date)))
        updateElText('tasks-var', util.formatVariance((projects.current.tasks.size - projects.previous.tasks.size)))
        updateElText('not-started-var', util.formatVariance((projects.current.notStarted.length - projects.previous.notStarted.length)))
        updateElText('in-progress-var', util.formatVariance((projects.current.inProgress.length - projects.previous.inProgress.length)))
        updateElText('complete-var', util.formatVariance((projects.current.completed.length - projects.previous.completed.length)))
        updateElText('schedule-per-var', util.formatPercent(projects.current.schedPercentComp - projects.previous.schedPercentComp))
        updateElText('physical-per-var', util.formatPercent(projects.current.physPercentComp - projects.previous.physPercentComp))

        const getFloatPercent = (float, version) => projects[version][float].length / projects[version].open.length
        const getFloatPercentVar = (float) => getFloatPercent(float, 'current') - getFloatPercent(float, 'previous')

        updateElText('critical-var', util.formatPercent(getFloatPercentVar('critical'), 'always'))
        updateElText('near-critical-var', util.formatPercent(getFloatPercentVar('nearCritical'), 'always'))
        updateElText('normal-tf-var', util.formatPercent(getFloatPercentVar('normalFloat'), 'always'))
        updateElText('high-tf-var', util.formatPercent(getFloatPercentVar('highFloat'), 'always'))
        updateElText('longest-path-var', util.formatPercent(getFloatPercentVar('longestPath'), 'always'))
        
        if (projects.current.budgetCost && projects.previous.budgetCost) {
            const currCostPer = projects.current.actualCost / projects.current.budgetCost
            const prevCostPer = projects.previous.actualCost / projects.previous.budgetCost
            updateElText('cost-per-var', util.formatPercent(currCostPer - prevCostPer))
        } else {
            document.getElementById("cost-per-var").textContent = "N/A"
        }
        if (!projects.current.budgetCost && !projects.previous.budgetCost) {
            document.getElementById('cost-loading').style.display = "none";
            document.getElementById('cost-progress-row').style.display = "none";
        }
        if (!projects.current.budgetQty && !projects.previous.budgetQty) {
            document.getElementById('resource-loading').style.display = "none";
        }

        updateElText("budget-var", util.formatCost(projects.current.budgetCost - projects.previous.budgetCost))
        updateElText("actual-cost-var", util.formatCost(projects.current.actualCost - projects.previous.actualCost))
        updateElText("this-period-var", util.formatCost(projects.current.thisPeriodCost - projects.previous.thisPeriodCost))
        updateElText("remaining-cost-var", util.formatCost(projects.current.remainingCost - projects.previous.remainingCost))
        
        updateElText("qty-var", util.formatVariance(projects.current.budgetQty - projects.previous.budgetQty))
        updateElText("actual-qty-var", util.formatVariance(projects.current.actualQty - projects.previous.actualQty))
        updateElText("this-period-qty-var", util.formatVariance(projects.current.thisPeriodQty - projects.previous.thisPeriodQty))
        updateElText("remaining-qty-var", util.formatVariance(projects.current.remainingQty - projects.previous.remainingQty))

        const currDD = projects.current.last_recalc_date.getTime()
        const prevPlannedTasks = [...projects.previous.tasks.values()].filter(task => !task.completed && task.start.getTime() < currDD)
        
        prevPlannedTasks.forEach(task => {
            if (task.notStarted && task.start.getTime() < currDD) {
                plannedProgress.earlyStart += 1;
                if (task.late_start_date.getTime() < currDD) {
                    plannedProgress.lateStart += 1;
                }
            }
            if (task.finish.getTime() < currDD) {
                plannedProgress.earlyFinish += 1;
                if (task.late_end_date.getTime() < currDD) {
                    plannedProgress.lateFinish += 1;
                }
            }
        })
    
        plannedProgress.actualStart = updates.started.data.length + updates.startFinish.data.length
        plannedProgress.actualFinish = updates.finished.data.length + updates.startFinish.data.length

        updateElText('start-period', util.formatDate(projects.previous.last_recalc_date))
        updateElText('end-period', util.formatDate(projects.current.last_recalc_date))
        let plannedDates = plannedProgress.earlyStart + plannedProgress.earlyFinish
        let actualDates = plannedProgress.actualStart + plannedProgress.actualFinish
        if (plannedDates === 0){
            updateElText('performance-score', 'N/A')
        }
        else {
            updateElText('performance-score', `${(actualDates / plannedDates * 100).toFixed(1)}%`)
        }

        let ctxStartFinishProgress = document.getElementById('startFinishChart');
        let startFinishChart = new Chart(ctxStartFinishProgress, {
            type: 'bar',
            data: {
                labels: ['Start', 'Finish', 'Combined'],
                datasets: [
                {
                    label: 'Early',
                    data: [
                        plannedProgress.earlyStart, 
                        plannedProgress.earlyFinish, 
                        plannedProgress.earlyStart + plannedProgress.earlyFinish
                    ],
                    backgroundColor: [`rgba(${CHARTCOLOR.GREEN}, 0.9)`],
                    borderColor: [`rgba(${CHARTCOLOR.GREEN}, 1)`],
                    borderWidth: 1,
                },
                {
                    label: 'Late',
                    data: [
                        plannedProgress.lateStart,
                        plannedProgress.lateFinish,
                        plannedProgress.lateStart + plannedProgress.lateFinish
                    ],
                    backgroundColor: [`rgba(${CHARTCOLOR.RED}, 0.9)`],
                    borderColor: [`rgba(${CHARTCOLOR.RED}, 1)`], 
                    borderWidth: 1,
                },
                {
                    label: 'Actual',
                    data: [
                        plannedProgress.actualStart,
                        plannedProgress.actualFinish, 
                        plannedProgress.actualStart + plannedProgress.actualFinish
                    ],
                    backgroundColor: [`rgba(${CHARTCOLOR.BLUE}, 0.9)`],
                    borderColor: [`rgba(${CHARTCOLOR.BLUE}, 1)`],
                    borderWidth: 1,
                },
                ]
            },
            options: {
                scales: {
                    y: {beginAtZero: true}
                },
                maintainAspectRatio: false
            }
        });
    }
}

function updateProjList(projs, selector) {
    for (let i = selector.options.length - 1; i >= 0; i--) {selector.remove(i);}
    for (const proj of Object.values(projs).filter(p => p.export_flag === 'Y')) {
        let el = document.createElement("option");
        el.textContent = `${proj.proj_short_name} - ${proj.name}`;
        el.value = proj.proj_id;
        selector.appendChild(el);
    }
}

const fileSelectors = document.querySelectorAll(".xer");
const analyzeButton = document.getElementById("analyze-btn");
const nearCriticalTF = document.getElementById("near-critical-num")
const highTF = document.getElementById("high-float-num")
const showTF = document.getElementById("show-float")
const showCost = document.getElementById("show-cost")
const showUnits = document.getElementById("show-units")
const showProgress = document.getElementById("show-progress")
const showTrending = document.getElementById("show-trending")
const floatTable = document.getElementById("float-table")
const costTable = document.getElementById("cost-loading")
const unitTable = document.getElementById("resource-loading")
const progressTable = document.getElementById("progress-table")
const trendingTable = document.getElementById("constraint-variance")

nearCriticalTF.addEventListener("change", (e) => {
    if (parseInt(nearCriticalTF.value) <= FLOAT.critical) {
        nearCriticalTF.value = FLOAT.critical + 1
    }
    FLOAT.nearCritical = parseInt(nearCriticalTF.value)
    if (FLOAT.nearCritical >= FLOAT.high) {
        highTF.value = FLOAT.nearCritical + 1
        FLOAT.high = parseInt(highTF.value)
    }
    highTF.min = FLOAT.nearCritical + 1    
})
highTF.addEventListener("change", (e) => {
    if (parseInt(highTF.value) <= FLOAT.nearCritical) {
        highTF.value = FLOAT.nearCritical + 1
    }
    FLOAT.high = parseInt(highTF.value)  
})

analyzeButton.addEventListener("click", (e) => {
    updateElText('near-critical-threshold', `Near Critical (TF < ${FLOAT.nearCritical + 1}):`)
    updateElText('high-float-threshold', `High Float (TF > ${FLOAT.high - 1}):`)
    if (!showTF.checked) floatTable.style.display = "none"
    if (!showCost.checked) costTable.style.display = "none"
    if (!showUnits.checked) unitTable.style.display = "none"
    if (!showProgress.checked) progressTable.style.display = "none"
    if (!showTrending.checked) trendingTable.style.display = "none"

    const currSelector = document.getElementById("current-project-selector")
    const prevSelector = document.getElementById("previous-project-selector")
    updateProjCard("current", currSelector.value)
    updateProjCard("previous", prevSelector.value)      
    document.getElementById("upload").style.display = 'none';
    document.getElementById("general").style.display = 'initial';
    document.getElementById('revisions-sec').style.display = 'initial';
    document.getElementById('legend').style.display = 'initial';
})

const isEmptyObj = obj => Object.keys(obj).length === 0;
const readyToGo = () => {
    return (
        !isEmptyObj(xerTables.previous) &&
        !isEmptyObj(xerTables.current)
    )
}

for (let i = 0; i < fileSelectors.length; i++) {
    fileSelectors[i].addEventListener("change", (e) => {
        let reader = new FileReader();
        let projSelector = document.getElementById(`${e.target.name}-project-selector`);
        reader.onload = (r) => {
            xerTables[e.target.name] = new ParseXer(r.target.result, e.target.files[0].name)
            updateProjList(xerTables[e.target.name].PROJECT, projSelector);
            updateElText(`${e.target.name}-errors`, xerTables[e.target.name].errors)
            projSelector.disabled = false
            analyzeButton.disabled = (!readyToGo() || xerTables.current.errors || xerTables.previous.errors)
        };
        reader.readAsText(e.target.files[0], "cp1252");
    })
};
