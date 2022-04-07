let tables = {
    current: {},
    previous: {}
}

let projects = {}

let FLOAT = {
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

const MONTHNAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const hasTask = (task, proj) => proj.tasksByCode.has(task.task_code)
const getTask = (task, proj) => proj.tasksByCode.get(task.task_code)

const getPrevLogic = rel => projects.previous.relsById.get(rel.logicId)
const prevHasLogic = rel => projects.previous.relsById.has(rel.logicId)

const getPrevRes = res => {
    if (tables.previous.hasOwnProperty('RSRC') && res.hasOwnProperty('resId')) {
        return projects.previous.resById.get(res.resId)
    }
    if (hasTask(res.task, projects.previous)) {
        const t = getTask(res.task, projects.previous);
        for (let i = 0; i < t.resources.length; i++) {
            cr = t.resources[i]
            if (cr.target_cost === res.target_cost && cr.target_qty === res.target_qty) {
                return cr;
            }
        }
    }
    return undefined
}

const prevHasRes = res => {
    if (tables.previous.hasOwnProperty('RSRC') && res.hasOwnProperty('resId')) {
        return projects.previous.resById.has(res.resId)
    }
    if (hasTask(res.task, projects.previous)) {
        const t = getTask(res.task, projects.previous);
        for (let i = 0; i < t.resources.length; i++) {
            cr = t.resources[i]
            if (cr.target_cost === res.target_cost && cr.target_qty === res.target_qty) {
                return true;
            }
        }
    }
    return false
}

const currHasRes = res => {
    if (tables.current.hasOwnProperty('RSRC') && res.hasOwnProperty('resId')) {
        return projects.current.resById.has(res.resId)
    }
    if (hasTask(res.task, projects.current)) {
        for (let i = 0; i < getTask(res.task, projects.current).resources.length; i++) {
            cr = getTask(res.task, projects.current).resources[i]
            if (cr.target_cost === res.target_cost && cr.target_qty === res.target_qty) {
                return true;
            }
        }
    }
    return false
}

const getMonthIntervalObj = proj => {

    function MonthData() {
        this.actualStart = 0
        this.actualFinish = 0
        this.earlyStart = 0
        this.earlyFinish = 0
        this.lateStart = 0
        this.lateFinish = 0
        this.actualCost = 0.0
        this.earlyCost = 0.0
        this.lateCost = 0.0
    }

    let months = {};
    let endDate = proj.scd_end_date.getTime() > proj.lateEnd.getTime() ? proj.scd_end_date : proj.lateEnd;
    for (let y = proj.start.getFullYear(); y <= endDate.getFullYear(); y++) {
        let m = y === proj.start.getFullYear() ? proj.start.getMonth() : 0;
        let lastMonth = y === endDate.getFullYear() ? endDate.getMonth() : 11;
        for (; m <= lastMonth; m++){
            months[`${MONTHNAMES[m]}-${y}`] = new MonthData()
        }
    }
    return months;
}

const analyzeProject = proj => {
    const tasks = [...proj.tasks.values()]

    proj.months = getMonthIntervalObj(proj);
    
    const percentPerActualDate = (1 / tasks.length) / 2 * 100;

    const getMonthID = date => `${MONTHNAMES[date.getMonth()]}-${date.getFullYear()}`

    tasks.forEach(task => {
        const startMonth = getMonthID(task.start)
        const finishMonth = getMonthID(task.finish)

        if (!task.completed) proj.months[finishMonth].earlyFinish += 1;
	if (!task.notStarted) proj.months[startMonth].actualStart += 1;
        if (task.notStarted) proj.months[startMonth].earlyStart += 1;
        if (task.completed) proj.months[finishMonth].actualFinish += 1;
    })

    proj.notStarted = tasks.filter(task => task.notStarted)
    proj.inProgress = tasks.filter(task => task.inProgress)
    proj.completed = tasks.filter(task => task.completed)
    proj.open = tasks.filter(task => !task.completed)

    proj.milestones = tasks.filter(task => task.isMilestone)

    proj.longestPath = tasks.filter(task => task.longestPath && !task.completed)
    proj.critical = tasks.filter(task => task.totalFloat <= FLOAT.critical)
    proj.nearCritical = tasks.filter(task => task.totalFloat > FLOAT.critical && task.totalFloat <= FLOAT.nearCritical)
    proj.normalFloat = tasks.filter(task => task.totalFloat > FLOAT.nearCritical && task.totalFloat < FLOAT.high)
    proj.highFloat = tasks.filter(task => task.totalFloat >= FLOAT.high)

    proj.scheduleDuration = (proj.scd_end_date.getTime() - proj.start.getTime()) / (1000 * 3600 * 24)
    proj.remScheduleDuration = (proj.scd_end_date.getTime() - proj.last_recalc_date.getTime()) / (1000 * 3600 * 24)

    proj.origDurSum = [...proj.tasks.values()].reduce((od, task) => od += task.origDur, 0)
    proj.remDurSum = [...proj.tasks.values()].reduce((rd, task) => rd += task.remDur, 0)

    const actDateTerm = (proj.inProgress.length / 2 + proj.completed.length) / proj.tasks.size
    const durTerm = (1 - proj.remDurSum / proj.origDurSum)
    proj.physPercentComp = (actDateTerm + durTerm) / 2
    proj.schedPercentComp = 1 - proj.remScheduleDuration / proj.scheduleDuration

    proj.budgetCost = budgetedCost(proj)
    proj.actualCost = actualCost(proj)
    proj.thisPeriodCost = thisPeriodCost(proj)
    proj.remainingCost = remainingCost(proj)

    proj.budgetQty = budgetedQty(proj)
    proj.actualQty = actualQty(proj)
    proj.thisPeriodQty = thisPeriodQty(proj)
    proj.remainingQty = remainingQty(proj)
    return proj
}

const updateElText = (id, value) => document.getElementById(id).textContent = value

function updateProjCard(name, value){
    const proj = analyzeProject(tables[name].PROJECT[value])
    projects[name] = proj

    updateElText(`${name}-project-id`, proj.proj_short_name)
    updateElText(`${name}-project-name`, proj.name)
    updateElText(`${name}-start`, formatDate(proj.start))
    updateElText(`${name}-data-date`, formatDate(proj.last_recalc_date))
    updateElText(`${name}-end`, formatDate(proj.scd_end_date))
    updateElText(`${name}-mfb`, formatDate(proj.plan_end_date) ?? "None")
    updateElText(`${name}-budget`, formatCost(proj.budgetCost))
    updateElText(`${name}-actual-cost`, formatCost(proj.actualCost))
    updateElText(`${name}-this-period`, formatCost(proj.thisPeriodCost))
    updateElText(`${name}-remaining-cost`, formatCost(proj.remainingCost))
    updateElText(`${name}-qty`, formatNumber(proj.budgetQty))
    updateElText(`${name}-actual-qty`, formatNumber(proj.actualQty))
    updateElText(`${name}-this-period-qty`, formatNumber(proj.thisPeriodQty))
    updateElText(`${name}-remaining-qty`, formatNumber(proj.remainingQty))
    updateElText(`${name}-tasks`, proj.tasks.size.toLocaleString())
    updateElText(`${name}-not-started`, proj.notStarted.length.toLocaleString())
    updateElText(`${name}-in-progress`, proj.inProgress.length.toLocaleString())
    updateElText(`${name}-complete`, proj.completed.length.toLocaleString())
    updateElText(`${name}-schedule-per`, formatPercent(proj.schedPercentComp))
    updateElText(`${name}-physical-per`, formatPercent(proj.physPercentComp))
    updateElText(`${name}-cost-per`, formatPercent(proj.actualCost / proj.budgetCost))
    //updateElText(`${name}-critical`, proj.critical.length.toLocaleString() + ":")
    updateElText(`${name}-critical-per`, formatPercent(proj.critical.length / proj.open.length))
    updateElText(`${name}-near-critical-per`, formatPercent(proj.nearCritical.length / proj.open.length))
    updateElText(`${name}-normal-tf-per`, formatPercent(proj.normalFloat.length / proj.open.length))
    updateElText(`${name}-high-tf-per`, formatPercent(proj.highFloat.length / proj.open.length))
    updateElText(`${name}-longest-path-per`, formatPercent(proj.longestPath.length / proj.open.length))

    //updateElText(`${name}-near-critical`, proj.nearCritical.length.toLocaleString() + ":")
    //updateElText(`${name}-normal-tf`, proj.normalFloat.length.toLocaleString() + ":")
    //updateElText(`${name}-high-tf`, proj.highFloat.length.toLocaleString() + ":")

    function updateElements(obj) {
	const revSec = document.getElementById('revisions-sec')
        Object.values(obj).forEach(update => {
            updateElText(update.id, (update.data.length).toLocaleString())
            if (update.data.length) {
                const table = createTable(update.title, update.align, update.columns, update.getRows(), update.wrap, update.footer ?? "");
                revSec.append(table)
            }
        })
    }

    const changeCount = obj => Object.values(obj).reduce((total, change) => total += change.data.length, 0)

    function createTable(title, align, labels, vals, wrap, foot=""){
        let div = document.createElement("div")
        div.style.width = '100%';
        div.classList.add("card")
        let table = document.createElement("table");
        let caption = document.createElement("caption")
        caption.innerText = `${title}: ${vals.length}`
        table.append(caption)
        
        let head = document.createElement("thead")
        head.classList.add('no-break')
        table.append(head)
        let body = document.createElement("tbody")
        table.append(body)
	    let footer = document.createElement("tfoot")
	    table.append(footer)

        let row = head.insertRow(), cell;
        row.classList.add('no-break')
        labels.forEach((val, i) => {
            cell = document.createElement("th");
            cell.style.textAlign = align[i];
            cell.style.whiteSpace = wrap[i];
            cell.style.verticalAlign = 'bottom';
            cell.innerText = val;
            cell.classList.add('btm-border')
            row.append(cell);
        })

        vals.forEach((task, r) => {
            row = body.insertRow();
            row.classList.add('no-break')
            task.forEach((val, i) => {
                cell = document.createElement("td");
                cell.append(val);
                cell.style.textAlign = align[i]
                cell.style.whiteSpace = wrap[i];
                cell.style.verticalAlign = 'top';
                if (r % 2 !== 0) row.style.backgroundColor = '#e7e7e7';
                row.append(cell);
            })
        })

        row = footer.insertRow();
        cell = document.createElement("td")
        cell.colSpan = `${labels.length}`
        cell.innerText = foot
        cell.style.color = '#5f5f5f'
        row.append(cell)
        div.append(table)
        return div  
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
        const currResources = projects.current.resources

        document.getElementById("sched-progress").style.width = `${formatPercent(projects.current.schedPercentComp)}`
        document.getElementById("phys-progress").style.width = `${formatPercent(projects.current.physPercentComp)}`
        if (projects.current.budgetCost) {
            document.getElementById("cost-progress").style.width = `${formatPercent(projects.current.actualCost / projects.current.budgetCost)}`
        }

	    updateElText('current-not-started-per', formatPercent(projects.current.notStarted.length / projects.current.tasks.size))
        updateElText('current-in-progress-per', formatPercent(projects.current.inProgress.length / projects.current.tasks.size))
        updateElText('current-complete-per', formatPercent(projects.current.completed.length / projects.current.tasks.size))

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

        const currCalendars = [...Object.values(tables.current.CALENDAR)]
        const prevCalendars = [...Object.values(tables.previous.CALENDAR)]

        const currTasks = [...projects.current.tasks.values()].sort(sortById)
        const prevTasks = [...projects.previous.tasks.values()].sort(sortById)

        const currResources = projects.current.resources
        const prevResources = projects.previous.resources

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
                        // Include a dollar sign in the ticks
                        callback: function(value, index, ticks) {
                            return value * 100 + '%';
                        }
                        }
                    },
                    y: {
                      stacked: true,
                      
                    },
                },
                // scales: {
                //     y: {
                //         beginAtZero: true
                //     }
                // },
                maintainAspectRatio: false
            }
        });

        
        let constraintVariance = {
            title: "Finish On or Before Constraint Trending",
            align: ['left', 'left', 'left', 'center', 'center', 'center', 'center', 'center'],
            wrap: ['nowrap', 'nowrap', 'normal', 'nowrap', 'nowrap', 'nowrap', 'nowrap', 'nowrap'],
            columns: [
                'Act ID', '', 'Act Name', 'Constraint',
                'Current\r\nFinish', 'Float', 'Previous\r\nFinish', 'Finish\r\nVariance'
            ],
            data: [],
            getRows: function() {
                return this.data.map(task => {
                    if (hasTask(task, projects.previous)) {
                        return [
                            task.task_code, statusImg(task), task.task_name, formatDate(task.cstr_date, false), 
                            formatDate(task.finish, false), formatVariance(task.totalFloat), 
                            formatDate(getTask(task, projects.previous).finish, false),
                            formatVariance(dateVariance(getTask(task, projects.previous).finish, task.finish))
                        ]
		    }
		    return [
                        task.task_code, statusImg(task), task.task_name, formatDate(task.cstr_date, false), 
                        formatDate(task.finish, false), formatVariance(task.totalFloat), "N/A", "N/A"
                    ]
		})
            }
        }
        constraintVariance.data = currTasks.filter(task => task.primeConstraint === "Finish on or Before")
        if (constraintVariance.data.length) {
            const table = createTable(constraintVariance.title, constraintVariance.align, constraintVariance.columns, constraintVariance.getRows(), constraintVariance.wrap);
            document.getElementById('constraint-variance').append(table)
        }

        updates.started.data = currTasks.filter(task => task.inProgress && getTask(task, projects.previous)?.notStarted).sort(sortByStart)
        updates.finished.data = (currTasks.filter(task => task.completed && hasTask(task, projects.previous) && getTask(task, projects.previous).inProgress)).sort(sortByFinish)
        updates.startFinish.data = (currTasks.filter(task => task.completed && hasTask(task, projects.previous) && getTask(task, projects.previous).notStarted)).sort(sortByFinish)

        taskChanges.added.data = currTasks.filter(task => !hasTask(task, projects.previous))
        taskChanges.deleted.data = prevTasks.filter(task => !projects.current.tasksByCode.has(task.task_code))

	    const ongoingTasks = currTasks.filter(task => hasTask(task, projects.previous))
        taskChanges.name.data = ongoingTasks.filter(task => task.task_name !== getTask(task, projects.previous).task_name)
        taskChanges.duration.data = ongoingTasks.filter(task => {
            return (
                !task.isLOE && 
                ((task.origDur !== getTask(task, projects.previous).origDur) || 
                (task.notStarted && task.origDur !== task.remDur && task.remDur !== getTask(task, projects.previous).remDur))
            )
	    })
        taskChanges.calendar.data = ongoingTasks.filter(task => task.calendar.id !== getTask(task, projects.previous).calendar.id)
        taskChanges.start.data = ongoingTasks.filter(task => {
            return (
                !task.notStarted && 
                !getTask(task, projects.previous).notStarted && 
                formatDate(task.start) !== formatDate(getTask(task, projects.previous).start)
            )
	    }).sort(sortByStart)
        taskChanges.finish.data = ongoingTasks.filter(task => {
            return (
                task.completed && 
                getTask(task, projects.previous).completed && 
                formatDate(task.finish) !== formatDate(getTask(task, projects.previous).finish)
            )
	    }).sort(sortByFinish)
        taskChanges.wbs.data = ongoingTasks.filter(task => task.wbs.wbsID !== getTask(task, projects.previous).wbs.wbsID)
        taskChanges.type.data = ongoingTasks.filter(task => task.taskType !== getTask(task, projects.previous).taskType)
        updateElements(taskChanges)

        logicChanges.added.data = projects.current.rels.filter(rel => !prevHasLogic(rel))
        logicChanges.deleted.data = projects.previous.rels.filter(rel => !projects.current.relsById.has(rel.logicId))
        logicChanges.revised.data = projects.current.rels.filter(rel => prevHasLogic(rel) && rel.lag !== getPrevLogic(rel).lag)
        logicChanges.revised.prev = logicChanges.revised.data.map(rel => getPrevLogic(rel))

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

        resourceChanges.added.data = currResources.filter(res => !prevHasRes(res))
        resourceChanges.deleted.data = prevResources.filter(res => !currHasRes(res))
        resourceChanges.revisedCost.data = currResources.filter(res => prevHasRes(res) && res.target_cost !== getPrevRes(res).target_cost)
        resourceChanges.revisedUnits.data = currResources.filter(res => prevHasRes(res) && res.target_qty !== getPrevRes(res).target_qty)
        updateElements(resourceChanges)

	    const hasCalendar = (cal, table) => {
            if (!(cal.type === 'Project')) return (cal.clndr_id in table.CALENDAR)
            for (c in table.CALENDAR) {
                if (table.CALENDAR[c].id === cal.id) return true
            }
            return false
        }

        calendarChanges.added.data = currCalendars.filter(cal => cal.assignments > 0 && !hasCalendar(cal, tables.previous))
	    calendarChanges.deleted.data = prevCalendars.filter(cal => cal.assignments > 0 && !hasCalendar(cal, tables.current))
        updateElements(calendarChanges)

        constraintChanges.addedPrim.data = currTasks.filter(task => {
            hasTask(task, projects.previous) && 
            task.primeConstraint && 
            task.primeConstraint !== getTask(task, projects.previous).primeConstraint
        })
        constraintChanges.deletedPrim.data = prevTasks.filter(task => {
            return (
                hasTask(task, projects.current) && 
                task.primeConstraint && 
                task.primeConstraint !== getTask(task, projects.previous).primeConstraint
            )
        })
        constraintChanges.revisedPrim.data = currTasks.filter(task => {
            return (
                hasTask(task, projects.previous) && 
                task.primeConstraint &&
                task.cstr_date &&
                task.primeConstraint === getTask(task, projects.previous).primeConstraint &&
                task.cstr_date.getTime() !== getTask(task, projects.previous).cstr_date.getTime()
            )
        })
        constraintChanges.addedSec.data = currTasks.filter(task => {
            return (
                hasTask(task, projects.previous) && 
                task.secondConstraint && 
                task.secondConstraint !== getTask(task, projects.previous).secondConstraint
            )
        })
        constraintChanges.deletedSec.data = prevTasks.filter(task => {
            return (
                hasTask(task, projects.current) && 
                task.secondConstraint && 
                task.secondConstraint !== getTask(task, projects.previous).secondConstraint
            )
        })
        constraintChanges.revisedSec.data = currTasks.filter(task => {
            return (
                hasTask(task, projects.previous) && 
                task.secondConstraint &&
                task.cstr_date2 &&
                task.secondConstraint === getTask(task, projects.previous).secondConstraint &&
                task.cstr_date2.getTime() !== getTask(task, projects.previous).cstr_date2.getTime()
            )
        })
        updateElements(constraintChanges)

        updateElText('start-var', formatAbsNum(dateVariance(projects.current.plan_start_date, projects.previous.plan_start_date)))
        updateElText('dd-var', formatAbsNum(dateVariance(projects.current.last_recalc_date, projects.previous.last_recalc_date)))
        updateElText('end-var', formatVariance(dateVariance(projects.previous.scd_end_date, projects.current.scd_end_date)))
        updateElText('mfb-var', formatVariance(dateVariance(projects.current.plan_end_date, projects.previous.plan_end_date)))
        updateElText('tasks-var', formatVariance((projects.current.tasks.size - projects.previous.tasks.size)))
        updateElText('not-started-var', formatVariance((projects.current.notStarted.length - projects.previous.notStarted.length)))
        updateElText('in-progress-var', formatVariance((projects.current.inProgress.length - projects.previous.inProgress.length)))
        updateElText('complete-var', formatVariance((projects.current.completed.length - projects.previous.completed.length)))
        updateElText('schedule-per-var', formatPercent(projects.current.schedPercentComp - projects.previous.schedPercentComp))
        updateElText('physical-per-var', formatPercent(projects.current.physPercentComp - projects.previous.physPercentComp))

        const getFloatPercent = (float, version) => projects[version][float].length / projects[version].open.length
        const getFloatPercentVar = (float) => getFloatPercent(float, 'current') - getFloatPercent(float, 'previous')

        updateElText('critical-var', formatPercent(getFloatPercentVar('critical'), 'always'))
        updateElText('near-critical-var', formatPercent(getFloatPercentVar('nearCritical'), 'always'))
        updateElText('normal-tf-var', formatPercent(getFloatPercentVar('normalFloat'), 'always'))
        updateElText('high-tf-var', formatPercent(getFloatPercentVar('highFloat'), 'always'))
        updateElText('longest-path-var', formatPercent(getFloatPercentVar('longestPath'), 'always'))
        
        if (projects.current.budgetCost && projects.previous.budgetCost) {
            const currCostPer = projects.current.actualCost / projects.current.budgetCost
            const prevCostPer = projects.previous.actualCost / projects.previous.budgetCost
            updateElText('cost-per-var', formatPercent(currCostPer - prevCostPer))
        } else {
            document.getElementById("cost-per-var").textContent = "N/A"
        }
        if (!projects.current.budgetCost && !projects.previous.budgetCost) {
            document.getElementById('cost-loading').style.display = "none";
        }
        if (!projects.current.budgetQty && !projects.previous.budgetQty) {
            document.getElementById('resource-loading').style.display = "none";
        }

        updateElText("budget-var", formatCost(projects.current.budgetCost - projects.previous.budgetCost))
        updateElText("actual-cost-var", formatCost(projects.current.actualCost - projects.previous.actualCost))
        updateElText("this-period-var", formatCost(projects.current.thisPeriodCost - projects.previous.thisPeriodCost))
        updateElText("remaining-cost-var", formatCost(projects.current.remainingCost - projects.previous.remainingCost))
        
        updateElText("qty-var", formatVariance(projects.current.budgetQty - projects.previous.budgetQty))
        updateElText("actual-qty-var", formatVariance(projects.current.actualQty - projects.previous.actualQty))
        updateElText("this-period-qty-var", formatVariance(projects.current.thisPeriodQty - projects.previous.thisPeriodQty))
        updateElText("remaining-qty-var", formatVariance(projects.current.remainingQty - projects.previous.remainingQty))

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

        updateElText('start-period', formatDate(projects.previous.last_recalc_date))
        updateElText('end-period', formatDate(projects.current.last_recalc_date))

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
    console.log('Near Critical: ', nearCriticalTF.value)
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
    console.log('High TF: ', highTF.value)
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
const checkIfReady = () => (!isEmptyObj(tables.previous) && !isEmptyObj(tables.current))

for (let i = 0; i < fileSelectors.length; i++) {
    fileSelectors[i].addEventListener("change", (e) => {
        let reader = new FileReader();
        let projSelector = document.getElementById(`${e.target.name}-project-selector`);
        reader.onload = (r) => {
            tables[e.target.name] = parseFile(r.target.result, e.target.files[0].name);
            updateProjList(tables[e.target.name].PROJECT, projSelector);
            if (Object.keys(tables[e.target.name].PROJECT).length > 1){
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
