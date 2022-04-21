import {parseFile} from "./parse.js"
import {updates, constraintVariance, taskChanges, noteBookChanges, logicChanges, resourceChanges, calendarChanges, constraintChanges, plannedProgress} from "./data.js"
import * as util from "./utilities.js"
import ParsXer from "./modules/parseXerTables.js"
import createTable from "./modules/createTable.js"

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
            
            if (update.data.length) {
                const valueEl = document.getElementById(update.id)
                const labelEl = document.getElementById(`${update.id}-label`)
                valueEl.style.cursor = 'pointer'
                valueEl.style.fontWeight = 'bold'
                labelEl.style.cursor = 'pointer'
                labelEl.style.fontWeight = 'bold'
                const table = createTable(update.id, update.title, update.columns, update.getRows(), update.footer ?? "");
                revSec.append(table)
                
                valueEl.addEventListener("click", () => table.scrollIntoView({ behavior: 'smooth'}))
                // labelEl.addEventListener("click", () => location.href=`#${update.id}-table`)
                labelEl.addEventListener("click", () => table.scrollIntoView({ behavior: 'smooth'}))
            }
            updateElText(update.id, (update.data.length).toLocaleString())
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
        document.getElementById("sched-progress").style.width = `${util.formatPercent(projects.current.schedPercentComp)}`
        document.getElementById("phys-progress").style.width = `${util.formatPercent(projects.current.physPercentComp)}`
        if (projects.current.budgetCost) {
            document.getElementById("cost-progress").style.width = `${util.formatPercent(projects.current.actualCost / projects.current.budgetCost)}`
        }

	    updateElText('current-not-started-per', util.formatPercent(projects.current.notStarted.length / projects.current.tasks.size))
        updateElText('current-in-progress-per', util.formatPercent(projects.current.inProgress.length / projects.current.tasks.size))
        updateElText('current-complete-per', util.formatPercent(projects.current.completed.length / projects.current.tasks.size))

        let ctxActivityStatus = document.getElementById('activityStatusChart');
	    let activityStatusChart = createPieChart(
            ctxActivityStatus, '# of Activities',
            ['In Progress', 'Complete', 'Not Started'],
            [projects.current.inProgress.length, projects.current.completed.length, projects.current.notStarted.length,],
            [`rgba(${CHARTCOLOR.GREEN}, 1)`, `rgba(${CHARTCOLOR.BLUE}, 1)`, `rgba(${CHARTCOLOR.RED}, 1)`,]
	    )

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

        const currCalendars = [...Object.values(xerTables.current.CALENDAR)]
        const prevCalendars = [...Object.values(xerTables.previous.CALENDAR)]

        const currTasks = projects.current.taskArray.sort(util.sortById)
        const prevTasks = projects.previous.taskArray.sort(util.sortById)

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
                    legend: {
                        display: false,
                    }
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
                    y: {
                      stacked: true,
                      
                    },
                },
                maintainAspectRatio: false
            }
        });

        constraintVariance.data = currTasks.filter(task => task.primeConstraint === "Finish on or Before")
        if (constraintVariance.data.length) {
            const table = createTable(constraintVariance.id, constraintVariance.title, constraintVariance.columns, constraintVariance.getRows());
            document.getElementById('constraint-variance').append(table)
        }

        updates.started.data = currTasks.filter(task => task.inProgress && projects.previous.getTask(task)?.notStarted).sort(util.sortByStart)
        updates.finished.data = (currTasks.filter(task => task.completed && projects.previous.hasTask(task) && projects.previous.getTask(task).inProgress)).sort(util.sortByFinish)
        updates.startFinish.data = (currTasks.filter(task => task.completed && projects.previous.hasTask(task) && projects.previous.getTask(task).notStarted)).sort(util.sortByFinish)

        taskChanges.added.data = currTasks.filter(task => !projects.previous.hasTask(task))
        taskChanges.deleted.data = prevTasks.filter(task => !projects.current.hasTask(task))

	    const ongoingTasks = currTasks.filter(task => projects.previous.hasTask(task))
        taskChanges.name.data = ongoingTasks.filter(task => task.task_name !== projects.previous.getTask(task).task_name)
        taskChanges.duration.data = ongoingTasks.filter(task => {
            return (
                !task.isLOE && 
                ((task.origDur !== projects.previous.getTask(task).origDur) || 
                (task.notStarted && task.origDur !== task.remDur && task.remDur !== projects.previous.getTask(task).remDur))
            )
	    })
        taskChanges.calendar.data = ongoingTasks.filter(task => task.calendar.id !== projects.previous.getTask(task).calendar.id)
        taskChanges.start.data = ongoingTasks.filter(task => {
            return (
                !task.notStarted && 
                !projects.previous.getTask(task).notStarted && 
                util.formatDate(task.start) !== util.formatDate(projects.previous.getTask(task).start)
            )
	    }).sort(util.sortByStart)
        taskChanges.finish.data = ongoingTasks.filter(task => {
            return (
                task.completed && 
                projects.previous.getTask(task).completed && 
                util.formatDate(task.finish) !== util.formatDate(projects.previous.getTask(task).finish)
            )
	    }).sort(util.sortByFinish)
        taskChanges.wbs.data = ongoingTasks.filter(task => task.wbs.wbsID !== projects.previous.getTask(task).wbs.wbsID)
        taskChanges.type.data = ongoingTasks.filter(task => task.taskType !== projects.previous.getTask(task).taskType)
        updateElements(taskChanges)

        logicChanges.added.data = projects.current.rels.filter(rel => !projects.previous.hasLogic(rel))
        logicChanges.deleted.data = projects.previous.rels.filter(rel => !projects.current.hasLogic(rel))
        logicChanges.revised.data = projects.current.rels.filter(rel => projects.previous.hasLogic(rel) && rel.lag !== projects.previous.getLogic(rel).lag)
        logicChanges.revised.prev = logicChanges.revised.data.map(rel => projects.previous.getLogic(rel))

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

        if (xerTables.current.RSRC && xerTables.previous.RSRC) {
            resourceChanges.added.data = projects.current.resources.filter(res => !projects.previous.hasResource(res))
            resourceChanges.deleted.data = projects.previous.resources.filter(res => !projects.current.hasResource(res))
            resourceChanges.revisedCost.data = projects.current.resources.filter(res => projects.previous.hasResource(res) && res.target_cost !== projects.previous.getResource(res).target_cost)
            resourceChanges.revisedUnits.data = projects.current.resources.filter(res => projects.previous.hasResource(res) && res.target_qty !== projects.previous.getResource(res).target_qty)
        }
        updateElements(resourceChanges)

	    const hasCalendar = (cal, table) => {
            if (!(cal.type === 'Project')) return (cal.clndr_id in table.CALENDAR)
            for (let c in table.CALENDAR) {
                if (table.CALENDAR[c].id === cal.id) return true
            }
            return false
        }

        calendarChanges.added.data = currCalendars.filter(cal => cal.assignments > 0 && !hasCalendar(cal, xerTables.previous))
	    calendarChanges.deleted.data = prevCalendars.filter(cal => cal.assignments > 0 && !hasCalendar(cal, xerTables.current))
        updateElements(calendarChanges)

        constraintChanges.addedPrim.data = currTasks.filter(task => {
            projects.previous.hasTask(task) && 
            task.primeConstraint && 
            task.primeConstraint !== projects.previous.getTask(task).primeConstraint
        })
        constraintChanges.deletedPrim.data = prevTasks.filter(task => {
            return (
                projects.current.hasTask(task) && 
                task.primeConstraint && 
                task.primeConstraint !== projects.previous.getTask(task).primeConstraint
            )
        })
        constraintChanges.revisedPrim.data = currTasks.filter(task => {
            return (
                projects.previous.hasTask(task) && 
                task.primeConstraint &&
                task.cstr_date &&
                task.primeConstraint === projects.previous.getTask(task).primeConstraint &&
                task.cstr_date.getTime() !== projects.previous.getTask(task).cstr_date.getTime()
            )
        })
        constraintChanges.addedSec.data = currTasks.filter(task => {
            return (
                projects.previous.hasTask(task) && 
                task.secondConstraint && 
                task.secondConstraint !== projects.previous.getTask(task).secondConstraint
            )
        })
        constraintChanges.deletedSec.data = prevTasks.filter(task => {
            return (
                projects.current.hasTask(task) && 
                task.secondConstraint && 
                task.secondConstraint !== projects.previous.getTask(task).secondConstraint
            )
        })
        constraintChanges.revisedSec.data = currTasks.filter(task => {
            return (
                projects.previous.hasTask(task) && 
                task.secondConstraint &&
                task.cstr_date2 &&
                task.secondConstraint === projects.previous.getTask(task).secondConstraint &&
                task.cstr_date2.getTime() !== projects.previous.getTask(task).cstr_date2.getTime()
            )
        })
        updateElements(constraintChanges)

        if (projects.current.notes.size) {
            const currMemoArr = Array.from(projects.current.notes.values())
            noteBookChanges.added.data = currMemoArr.filter(memo => {
                return !projects.previous.notes.has(memo.id)
            })

            noteBookChanges.revised.data = currMemoArr.filter(memo => {
                return (
                    projects.previous.notes.has(memo.id) && 
                    memo.note !== projects.previous.notes.get(memo.id).note
                )
            })
        }

        if ('TASKMEMO' in xerTables.previous) {
            noteBookChanges.deleted.data = Array.from(projects.previous.notes.values()).filter(memo => {
                return !projects.previous.notes.has(memo.id)
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
                    y: {
                        beginAtZero: true
                    }
                },
                maintainAspectRatio: false
            }
        });
    }
}

function updateProjList(projs, selector) {
    for (let i = selector.options.length - 1; i >= 0; i--) {selector.remove(i);}
    for (const proj in projs) {
        let el = document.createElement("option");
        el.textContent = `${projs[proj].proj_short_name} - ${projs[proj].name}`;
        el.value = projs[proj].proj_id;
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
})

const isEmptyObj = obj => Object.keys(obj).length === 0;
const checkIfReady = () => (!isEmptyObj(xerTables.previous) && !isEmptyObj(xerTables.current))

for (let i = 0; i < fileSelectors.length; i++) {
    fileSelectors[i].addEventListener("change", (e) => {
        let reader = new FileReader();
        let projSelector = document.getElementById(`${e.target.name}-project-selector`);
        reader.onload = (r) => {
            // xerTables[e.target.name] = parseFile(r.target.result, e.target.files[0].name);
            xerTables[e.target.name] = new ParsXer(r.target.result, e.target.files[0].name)
            // const xer = new ParsXer(r.target.result, e.target.files[0].name)
            // xer.print()
            updateProjList(xerTables[e.target.name].PROJECT, projSelector);
            if (Object.keys(xerTables[e.target.name].PROJECT).length > 1){
                projSelector.classList.remove("hidden")
            } else {
                if (!projSelector.classList.contains("hidden")) {
                    projSelector.classList.add("hidden")
                }
            }
            analyzeButton.disabled = !checkIfReady()
        };
        reader.readAsText(e.target.files[0], "cp1252");
    })
};
