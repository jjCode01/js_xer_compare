let tables = {
    current: {},
    previous: {}
}

let projects = {}

let FLOAT = {
    critical: 0,
    nearCritical: 20,
    high: 50,
}

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
        // if (res.task.resources.length === 1 && getTask(res.task, projects.current).resources.length === 1) {
        //     return true;
        // }
        for (let i = 0; i < getTask(res.task, projects.current).resources.length; i++) {
            cr = getTask(res.task, projects.current).resources[i]
            if (cr.target_cost === res.target_cost && cr.target_qty === res.target_qty) {
                return true;
            }
        }
    }
    return false
}

const analyzeProject = proj => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const tasks = [...proj.tasks.values()]

    proj.months = {};
    let endDate = proj.scd_end_date.getTime() > proj.lateEnd.getTime() ? proj.scd_end_date : proj.lateEnd;
    for (let y = proj.start.getFullYear(); y <= endDate.getFullYear(); y++) {
        let m = y === proj.start.getFullYear() ? proj.start.getMonth() : 0;
        let lastMonth = y === endDate.getFullYear() ? endDate.getMonth() : 11;
        for (; m <= lastMonth; m++){
            proj.months[`${monthNames[m]}-${y}`] = {
                actualActivity: 0.0,
                actualStart: 0,
                actualFinish: 0,
                earlyActivity: 0.0,
                earlyStart: 0,
                earlyFinish: 0,
                lateActivity: 0.0,
                lateStart: 0,
                lateFinish: 0,
                actualCost: 0.0,
                earlyCost: 0.0,
                lateCost: 0.0,
            }
        }
    }
    
    const percentPerActualDate = (1 / tasks.length) / 2 * 100;
    tasks.forEach(task => {
        let startMonth = `${monthNames[task.start.getMonth()]}-${task.start.getFullYear()}`
        let finishMonth = `${monthNames[task.finish.getMonth()]}-${task.finish.getFullYear()}`

        if (!task.completed) {
            lateFinishMonth = `${monthNames[task.late_end_date.getMonth()]}-${task.late_end_date.getFullYear()}`
            proj.months[lateFinishMonth].lateActivity += percentPerActualDate;
        }
        
        if (task.notStarted) {
            proj.months[startMonth].earlyActivity += percentPerActualDate;
            proj.months[finishMonth].earlyActivity += percentPerActualDate;
            
            proj.months[startMonth].earlyStart += 1;
            proj.months[finishMonth].earlyFinish += 1;

            lateStartMonth = `${monthNames[task.late_start_date.getMonth()]}-${task.late_start_date.getFullYear()}`
            proj.months[lateStartMonth].lateActivity += percentPerActualDate;
        }
        if (task.inProgress) {
            proj.months[startMonth].actualActivity += percentPerActualDate;
            proj.months[finishMonth].earlyActivity += percentPerActualDate;

            proj.months[startMonth].actualStart += 1;
            proj.months[finishMonth].earlyFinish += 1;
        }
        if (task.completed) {
            proj.months[startMonth].actualActivity += percentPerActualDate;
            proj.months[finishMonth].actualActivity += percentPerActualDate;

            proj.months[startMonth].actualStart += 1;
            proj.months[finishMonth].actualFinish += 1;
        }
    })

    proj.notStarted = tasks.filter(task => task.notStarted)
    proj.inProgress = tasks.filter(task => task.inProgress)
    proj.completed = tasks.filter(task => task.completed)

    proj.milestones = tasks.filter(task => task.isMilestone)

    proj.longestPath = tasks.filter(task => task.longestPath)
    proj.critical = tasks.filter(task => task.totalFloat <= FLOAT.critical)
    proj.nearCritical = tasks.filter(task => task.totalFloat > FLOAT.critical && task.totalFloat <= FLOAT.nearCritical)
    proj.normalFloat = tasks.filter(task => task.totalFloat > FLOAT.nearCritical && task.totalFloat < FLOAT.high)
    proj.highFloat = tasks.filter(task => task.totalFloat >= FLOAT.high)

    proj.scheduleDuration = (proj.scd_end_date.getTime() - proj.start.getTime()) / (1000 * 3600 * 24)
    proj.remScheduleDuration = (proj.scd_end_date.getTime() - proj.last_recalc_date.getTime()) / (1000 * 3600 * 24)

    proj.origDurSum = [...proj.tasks.values()].reduce((od, task) => od += task.origDur, 0)
    proj.remDurSum = [...proj.tasks.values()].reduce((rd, task) => rd += task.remDur, 0)

    const x = (proj.inProgress.length / 2 + proj.completed.length) / proj.tasks.size
    const y = (1 - proj.remDurSum / proj.origDurSum)
    proj.physPercentComp = (x + y) / 2
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

function updateProjCard(name, value){
    let proj = analyzeProject(tables[name].PROJECT[value])
    projects[name] = proj

    document.getElementById(`${name}-project-id`).textContent = proj.proj_short_name
    document.getElementById(`${name}-project-name`).textContent = proj.name
    
    document.getElementById(`${name}-start`).textContent = formatDate(proj.start)
    document.getElementById(`${name}-data-date`).textContent = formatDate(proj.last_recalc_date)
    document.getElementById(`${name}-end`).textContent = formatDate(proj.scd_end_date)

    if (proj.plan_end_date){document.getElementById(`${name}-mfb`).textContent = formatDate(proj.plan_end_date)}
    else {document.getElementById(`${name}-mfb`).textContent = "None"}

    document.getElementById(`${name}-budget`).textContent = formatCost(proj.budgetCost)
    document.getElementById(`${name}-actual-cost`).textContent = formatCost(proj.actualCost)
    document.getElementById(`${name}-this-period`).textContent = formatCost(proj.thisPeriodCost)
    document.getElementById(`${name}-remaining-cost`).textContent = formatCost(proj.remainingCost)

    document.getElementById(`${name}-qty`).textContent = formatNumber(proj.budgetQty)
    document.getElementById(`${name}-actual-qty`).textContent = formatNumber(proj.actualQty)
    document.getElementById(`${name}-this-period-qty`).textContent = formatNumber(proj.thisPeriodQty)
    document.getElementById(`${name}-remaining-qty`).textContent = formatNumber(proj.remainingQty)

    document.getElementById(`${name}-tasks`).textContent = proj.tasks.size.toLocaleString()
    document.getElementById(`${name}-not-started`).textContent = proj.notStarted.length.toLocaleString()
    document.getElementById(`${name}-in-progress`).textContent = proj.inProgress.length.toLocaleString()
    document.getElementById(`${name}-complete`).textContent = proj.completed.length.toLocaleString()

    // document.getElementById(`${name}-longest-path`).textContent = proj.longestPath.length.toLocaleString()
    // document.getElementById(`${name}-critical`).textContent = proj.critical.length.toLocaleString()
    // document.getElementById(`${name}-near-critical`).textContent = proj.nearCritical.length.toLocaleString()
    // document.getElementById(`${name}-normal-tf`).textContent = proj.normalFloat.length.toLocaleString()
    // document.getElementById(`${name}-high-tf`).textContent = proj.highFloat.length.toLocaleString()

    document.getElementById(`${name}-schedule-per`).textContent = formatPercent(proj.schedPercentComp)
    document.getElementById(`${name}-physical-per`).textContent = formatPercent(proj.physPercentComp)
    if (proj.budgetCost) {
        document.getElementById(`${name}-cost-per`).textContent = formatPercent(proj.actualCost / proj.budgetCost)
    } else {
        document.getElementById(`${name}-cost-per`).textContent = "N/A"
    }

    function updateElements(obj) {
        Object.values(obj).forEach(update => {
            document.getElementById(update.id).textContent = (update.data.length).toLocaleString()
            if (update.data.length) {
                const table = createTable(update.title, update.align, update.columns, update.getRows(), update.wrap, true, update.footer ?? "");
                document.getElementById('revisions-sec').append(table)
            }
        })
    }
    function getMaxChangeCount(obj, cnt) {
        let arr = Object.values(obj).map(chg => chg.data.length)
        console.log(arr)
        let max = Math.max(...arr)
        console.log('GetMax: ', max)
        // var max = Object.values(obj).reduce(function(a, b) {
        //     return Math.max(a.data.length, b.data.length);
        // }, 0);
        return (max > cnt) ? max : cnt
    }

    const changeCount = obj => Object.values(obj).reduce((total, change) => total += change.data.length, 0)

    function createTable(title, align, labels, vals, wrap, pageBreak=false, foot=""){
        let div = document.createElement("div")
        div.style.width = '100%';
        div.classList.add("card")
        if (pageBreak) div.classList.add("break")
        let caption = document.createElement("h2")
	    caption.style.width = '100%';
        caption.innerText = `${title}: ${vals.length}`
        caption.classList.add('caption', 'no-break')
        div.append(caption)
        let table = document.createElement("table");
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
                if (r % 2 !== 0) row.style.backgroundColor = '#e7e7e7'
                row.append(cell);
            })
        })

        row = footer.insertRow()
        cell = document.createElement("td")
        cell.colSpan = `${labels.length}`
        cell.innerText = foot
        cell.style.color = '#5f5f5f'
        row.append(cell)

        div.append(table)
        return div  
    }

    if (name === "current") {
        const currResources = projects.current.resources
        // const currLogic = new Map(projects.current.rels.map(r => [setRelKey(projects.current.tasks, r), r]))

        // const calTable = document.getElementById('calendar-tbl');
        // Object.values(tables.current.CALENDAR).forEach(cal => {
        //     let row = calTable.insertRow(), cell;
        //     cell = document.createElement("td");
        //     cell.innerText = cal.clndr_name;
        //     row.append(cell);
        //     cal.week.forEach(day => {
        //         cell = document.createElement("td");
        //         cell.innerText = day.hours;
        //         cell.style.textAlign = 'center'
        //         row.append(cell);
        //     })
        // })


        document.getElementById("sched-progress").style.width = `${formatPercent(projects.current.schedPercentComp)}`
        document.getElementById("phys-progress").style.width = `${formatPercent(projects.current.physPercentComp)}`
        if (projects.current.budgetCost) {
            document.getElementById("cost-progress").style.width = `${formatPercent(projects.current.actualCost / projects.current.budgetCost)}`
        }

        document.getElementById("current-not-started-per").textContent = formatPercent(projects.current.notStarted.length / projects.current.tasks.size)
        document.getElementById("current-in-progress-per").textContent = formatPercent(projects.current.inProgress.length / projects.current.tasks.size)
        document.getElementById("current-complete-per").textContent = formatPercent(projects.current.completed.length / projects.current.tasks.size)
        // document.getElementById("current-task-dependent-per").textContent = formatPercent(projects.current.taskDependent.length / projects.current.tasks.size)
        // document.getElementById("current-milestones-per").textContent = formatPercent(projects.current.milestones.length / projects.current.tasks.size)
        // document.getElementById("current-loe-per").textContent = formatPercent(projects.current.loes.length / projects.current.tasks.size)
        // document.getElementById("current-rsrc-dependent-per").textContent = formatPercent(projects.current.rsrcDependent.length / projects.current.tasks.size)
        // document.getElementById("current-longest-path-per").textContent = formatPercent(projects.current.longestPath.length / projects.current.tasks.size)
        // document.getElementById("current-critical-per").textContent = formatPercent(projects.current.critical.length / projects.current.tasks.size)
        // document.getElementById("current-near-critical-per").textContent = formatPercent(projects.current.nearCritical.length / projects.current.tasks.size)
        // document.getElementById("current-normal-tf-per").textContent = formatPercent(projects.current.normalFloat.length / projects.current.tasks.size)
        // document.getElementById("current-high-tf-per").textContent = formatPercent(projects.current.highFloat.length / projects.current.tasks.size)
        // document.getElementById("current-fs-per").textContent = formatPercent(projects.current.fsLogic.length / projects.current.rels.length)
        // document.getElementById("current-ss-per").textContent = formatPercent(projects.current.ssLogic.length / projects.current.rels.length)
        // document.getElementById("current-ff-per").textContent = formatPercent(projects.current.ffLogic.length / projects.current.rels.length)
        // document.getElementById("current-sf-per").textContent = formatPercent(projects.current.sfLogic.length / projects.current.rels.length)


        //************************************CHART********************************
        // var ctxActivityProgress = document.getElementById('activityProgressChart');
        // var myChart = new Chart(ctxActivityProgress, {
        //     type: 'bar',
        //     data: {
        //         labels: Object.keys(projects.current.months),
        //         datasets: [
        //             {
        //                 label: 'Actual Progress',
        //                 data: Object.values(projects.current.months).map(m => m.actualActivity),
        //                 backgroundColor: [
        //                     'rgba(54, 162, 235, 0.5)', // blue
        //                 ],
        //                 borderColor: [
        //                     'rgba(54, 162, 235, 1)', // blue
        //                 ],
        //                 borderWidth: 1,
        //                 stack: 'Stack 0',
        //             },
        //             {
        //                 label: 'Planned Early Progress',
        //                 data: Object.values(projects.current.months).map(m => m.earlyActivity),
        //                 backgroundColor: [
        //                     'rgba(113, 194, 92, 0.5)', // green
        //                 ],
        //                 borderColor: [
        //                     'rgba(113, 194, 92, 1)', // green
        //                 ],
        //                 borderWidth: 1,
        //                 stack: 'Stack 0',
        //             },
        //             {
        //                 label: 'Planned Late Progress',
        //                 data: Object.values(projects.current.months).map(m => m.lateActivity),
        //                 backgroundColor: [
        //                     'rgba(255, 99, 132, 0.5)', // red
        //                 ],
        //                 borderColor: [
        //                     'rgba(255, 99, 132, 1)', // red
        //                 ],
        //                 borderWidth: 1,
        //                 stack: 'Stack 1',
        //             },
        //         ]
        //     },
        //     options: {
        //         scales: {
        //             y: {
        //                 beginAtZero: true
        //             }
        //         },
        //         maintainAspectRatio: false
        //     }
        // });


        let ctxActivityStatus = document.getElementById('activityStatusChart');
        let activityStatusChart = new Chart(ctxActivityStatus, {
            type: 'pie',
            data: {
                labels: ['In Progress', 'Complete', 'Not Started'],
                datasets: [{
                    label: '# of Activities',
                    data: [
                        projects.current.inProgress.length,
                        projects.current.completed.length,
                        projects.current.notStarted.length,
                    ],
                    backgroundColor: [
                        'rgba(113, 194, 92, 1)', // green
                        'rgba(54, 162, 235, 1)', // blue
                        'rgba(255, 99, 132, 1)', // red
                    ],
                    hoverOffset: 3
                }]
            },
            options: {
                plugins: {
                    legend: {
                        display: false,
                    }
                }
            }
        });
        let ctxCostLoading = document.getElementById('costLoadingChart');
        let costLoadingChart = new Chart(ctxCostLoading, {
            type: 'pie',
            data: {
                labels: ['Actual Cost', 'Remaining Cost'],
                datasets: [{
                    label: 'Cost Loading',
                    data: [
                        projects.current.actualCost,
                        projects.current.remainingCost,
                    ],
                    backgroundColor: [
                        'rgba(54, 162, 235, 1)', // blue
                        'rgba(255, 99, 132, 1)', // red
                    ],
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

        let ctxResourceLoading = document.getElementById('resourceLoadingChart');
        let resourceLoadingChart = new Chart(ctxResourceLoading, {
            type: 'pie',
            data: {
                labels: ['Actual Qty', 'Remaining Qty'],
                datasets: [{
                    label: 'Resource Loading',
                    data: [
                        projects.current.actualQty,
                        projects.current.remainingQty,
                    ],
                    backgroundColor: [
                        'rgba(54, 162, 235, 1)', // blue
                        'rgba(255, 99, 132, 1)', // red
                    ],
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

        // var ctxFloat = document.getElementById('activityFloatChart');
        // var myChart = new Chart(ctxFloat, {
        //     type: 'doughnut',
        //     data: {
        //         labels: ['Critical', 'Near-Critical', 'Normal Float', 'High Float'],
        //         datasets: [{
        //             label: 'Total Float',
        //             data: [
        //                 projects.current.critical.length,
        //                 projects.current.nearCritical.length,
        //                 projects.current.normalFloat.length,
        //                 projects.current.highFloat.length
        //             ],
        //             backgroundColor: [
        //                 'rgba(255, 99, 132, 1)', // red
        //                 'rgba(255, 206, 86, 1)', // yellow
        //                 'rgba(113, 194, 92, 1)', // green
        //                 'rgba(54, 162, 235, 1)', // blue
                        
        //             ],
        //             hoverOffset: 3
        //         }]
        //     },
        //     options: {
        //         plugins: {
        //             legend: {
        //                 display: false,
        //             }
        //         }
        //     }
        // });

        
        //************************************CHART********************************
    }

    if (name === "previous") {
        document.getElementById('title').innerText = `Schedule Comparison - ${projects.current.proj_short_name} vs ${projects.previous.proj_short_name}`

        let maxChangeCount = 0

        const currTasks = [...projects.current.tasks.values()].sort(sortById)
        const prevTasks = [...projects.previous.tasks.values()].sort(sortById)

        const currResources = projects.current.resources
        const prevResources = projects.previous.resources

        
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
                            formatDate(task.finish, false), formatVariance(task.totalFloat), formatDate(getTask(task, projects.previous).finish, false),
                            formatVariance(dateVariance(getTask(task, projects.previous).finish, task.finish))
                        ]
                    }
                    return [
                        task.task_code, statusImg(task), task.task_name, formatDate(task.cstr_date, false), 
                        formatDate(task.finish, false), formatVariance(task.totalFloat), "N/A",
                        "N/A"
                    ]
		        })
            }
        }
        constraintVariance.data = currTasks.filter(task => task.primeConstraint === "Finish on or Before")
        if (constraintVariance.data.length) {
            const table = createTable(constraintVariance.title, constraintVariance.align, constraintVariance.columns, constraintVariance.getRows(), constraintVariance.wrap);
            document.getElementById('constraint-variance').append(table)
        }

        updates.started.data = currTasks.filter(task => task.inProgress && hasTask(task, projects.previous) && getTask(task, projects.previous).notStarted).sort(sortByStart)
        updates.finished.data = (currTasks.filter(task => task.completed && hasTask(task, projects.previous) && getTask(task, projects.previous).inProgress)).sort(sortByFinish)
        updates.startFinish.data = (currTasks.filter(task => task.completed && hasTask(task, projects.previous) && getTask(task, projects.previous).notStarted)).sort(sortByFinish)
        // updates.percent.data = (currTasks.filter(task => hasTask(task, projects.previous) && task.percent > getTask(task, projects.previous).percent)).sort(sortByStart)
        // updates.duration.data = (currTasks.filter(task => task.remDur !== task.origDur && hasTask(task, projects.previous) && task.remDur < getTask(task, projects.previous).remDur)).sort(sortByStart)
        // updates.cost.data = currTasks.filter(task => hasTask(task, projects.previous) && actualCost(task) !== actualCost(getTask(task, projects.previous)))
        // updates.regress.data = currTasks.filter(task => {
        //     return (
        //         hasTask(task, projects.previous) && 
        //         ((!task.completed && getTask(task, projects.previous).completed) ||
        //         (task.notStarted && !getTask(task, projects.previous).notStarted) ||
        //         (task.origDur !== task.remDur && task.remDur > getTask(task, projects.previous).remDur) ||
        //         (task.percent < getTask(task, projects.previous).percent))
        //     )
        // })
        // document.getElementById("ud").innerText = changeCount(updates).toLocaleString()
        // updateElements(updates)

        calendarChanges.added.data = Object.values(tables.current.CALENDAR).filter(cal => {
            return (
                cal.assignments.length &&
                !Object.values(tables.previous.CALENDAR).find(prevCal => prevCal.id === cal.id)
            )
        })
        calendarChanges.deleted.data = Object.values(tables.previous.CALENDAR).filter(prevCal => {
            return (
                prevCal.assignments.length &&
                !Object.values(tables.current.CALENDAR).find(cal => prevCal.id === cal.id)
            )
        })
        maxChangeCount = getMaxChangeCount(calendarChanges, maxChangeCount)
        updateElements(calendarChanges)
        

        taskChanges.added.data = currTasks.filter(task => !hasTask(task, projects.previous))
        taskChanges.deleted.data = prevTasks.filter(task => !projects.current.tasksByCode.has(task.task_code))
        taskChanges.name.data = currTasks.filter(task => hasTask(task, projects.previous) && task.task_name !== getTask(task, projects.previous).task_name)
        taskChanges.duration.data = currTasks.filter(task => {
            return (
                hasTask(task, projects.previous) && 
                !task.isLOE && 
                ((task.origDur !== getTask(task, projects.previous).origDur) || 
                (task.notStarted && task.origDur !== task.remDur && task.remDur !== getTask(task, projects.previous).remDur))
            )
        })
        taskChanges.calendar.data = currTasks.filter(task => {
            console.log(task.project.proj_short_name, task.task_id, task.task_code)
            return hasTask(task, projects.previous) && task.calendar.clndr_name !== getTask(task, projects.previous).calendar.clndr_name
        })
        taskChanges.start.data = currTasks.filter(task => {
            return (
                hasTask(task, projects.previous) && 
                !task.notStarted && 
                !getTask(task, projects.previous).notStarted && 
                formatDate(task.start) !== formatDate(getTask(task, projects.previous).start)
            )
        }).sort(sortByStart)
        taskChanges.finish.data = currTasks.filter(task => {
            return (
                hasTask(task, projects.previous) && 
                task.completed && 
                getTask(task, projects.previous).completed && 
                formatDate(task.finish) !== formatDate(getTask(task, projects.previous).finish)
            )
        }).sort(sortByFinish)
        taskChanges.wbs.data = currTasks.filter(task => hasTask(task, projects.previous) && task.wbs.wbsID !== getTask(task, projects.previous).wbs.wbsID)
        maxChangeCount = getMaxChangeCount(taskChanges, maxChangeCount)
        console.log(maxChangeCount)
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
        maxChangeCount = getMaxChangeCount(logicChanges, maxChangeCount)
        console.log(maxChangeCount)
        updateElements(logicChanges)

        resourceChanges.added.data = currResources.filter(res => !prevHasRes(res))
        resourceChanges.deleted.data = prevResources.filter(res => !currHasRes(res))
        resourceChanges.revisedCost.data = currResources.filter(res => prevHasRes(res) && res.target_cost !== getPrevRes(res).target_cost)
        resourceChanges.revisedUnits.data = currResources.filter(res => prevHasRes(res) && res.target_qty !== getPrevRes(res).target_qty)
        maxChangeCount = getMaxChangeCount(resourceChanges, maxChangeCount)
        console.log(maxChangeCount)
        updateElements(resourceChanges)

        constraintChanges.addedPrim.data = currTasks.filter(task => hasTask(task, projects.previous) && task.primeConstraint && task.primeConstraint !== getTask(task, projects.previous).primeConstraint)
        constraintChanges.deletedPrim.data = prevTasks.filter(task => hasTask(task, projects.current) && task.primeConstraint && task.primeConstraint !== getTask(task, projects.previous).primeConstraint)
        constraintChanges.revisedPrim.data = currTasks.filter(task => {
            return (
                hasTask(task, projects.previous) && 
                task.primeConstraint &&
                task.cstr_date &&
                task.primeConstraint === getTask(task, projects.previous).primeConstraint &&
                task.cstr_date.getTime() !== getTask(task, projects.previous).cstr_date.getTime()
            )
        })
        constraintChanges.addedSec.data = currTasks.filter(task => hasTask(task, projects.previous) && task.secondConstraint && task.secondConstraint !== getTask(task, projects.previous).secondConstraint)
        constraintChanges.deletedSec.data = prevTasks.filter(task => hasTask(task, projects.current) && task.secondConstraint && task.secondConstraint !== getTask(task, projects.previous).secondConstraint)
        constraintChanges.revisedSec.data = currTasks.filter(task => {
            return (
                hasTask(task, projects.previous) && 
                task.secondConstraint &&
                task.cstr_date2 &&
                task.secondConstraint === getTask(task, projects.previous).secondConstraint &&
                task.cstr_date2.getTime() !== getTask(task, projects.previous).cstr_date2.getTime()
            )
        })
        maxChangeCount = getMaxChangeCount(constraintChanges, maxChangeCount)
        console.log(maxChangeCount)
        updateElements(constraintChanges)

        document.getElementById("start-var").textContent = formatAbsNum(dateVariance(projects.current.plan_start_date, projects.previous.plan_start_date))
        document.getElementById("dd-var").textContent = formatAbsNum(dateVariance(projects.current.last_recalc_date, projects.previous.last_recalc_date))
        document.getElementById("end-var").textContent = formatVariance(dateVariance(projects.previous.scd_end_date, projects.current.scd_end_date))
        document.getElementById("mfb-var").textContent = formatVariance(dateVariance(projects.current.plan_end_date, projects.previous.plan_end_date))
        document.getElementById("tasks-var").textContent = formatVariance((projects.current.tasks.size - projects.previous.tasks.size))
        document.getElementById("not-started-var").textContent = formatVariance((projects.current.notStarted.length - projects.previous.notStarted.length))
        document.getElementById("in-progress-var").textContent = formatVariance((projects.current.inProgress.length - projects.previous.inProgress.length))
        document.getElementById("complete-var").textContent = formatVariance((projects.current.completed.length - projects.previous.completed.length))

        // document.getElementById("critical-var").textContent = formatVariance((projects.current.critical.length - projects.previous.critical.length))
        // document.getElementById("near-critical-var").textContent = formatVariance((projects.current.nearCritical.length - projects.previous.nearCritical.length))
        // document.getElementById("normal-tf-var").textContent = formatVariance((projects.current.normalFloat.length - projects.previous.normalFloat.length))
        // document.getElementById("high-tf-var").textContent = formatVariance((projects.current.highFloat.length - projects.previous.highFloat.length))
        // document.getElementById("longest-path-var").textContent = formatVariance((projects.current.longestPath.length - projects.previous.longestPath.length))
        
        document.getElementById("schedule-per-var").textContent = formatPercent(projects.current.schedPercentComp - projects.previous.schedPercentComp)
        document.getElementById("physical-per-var").textContent = formatPercent(projects.current.physPercentComp - projects.previous.physPercentComp)
        
        
        if (projects.current.budgetCost && projects.previous.budgetCost) {
            const currCostPer = projects.current.actualCost / projects.current.budgetCost
            const prevCostPer = projects.previous.actualCost / projects.previous.budgetCost
            document.getElementById("cost-per-var").textContent = formatPercent(currCostPer - prevCostPer)
        } else {
            document.getElementById("cost-per-var").textContent = "N/A"
        }
        if (!projects.current.budgetCost && !projects.previous.budgetCost) {
            document.getElementById('cost-loading').style.display = "none";
        }
        if (!projects.current.budgetQty && !projects.previous.budgetQty) {
            document.getElementById('resource-loading').style.display = "none";
        }


        document.getElementById("budget-var").textContent = formatCost(projects.current.budgetCost - projects.previous.budgetCost)
        document.getElementById("actual-cost-var").textContent = formatCost(projects.current.actualCost - projects.previous.actualCost)
        document.getElementById("this-period-var").textContent = formatCost(projects.current.thisPeriodCost - projects.previous.thisPeriodCost)
        document.getElementById("remaining-cost-var").textContent = formatCost(projects.current.remainingCost - projects.previous.remainingCost)
        
        document.getElementById("qty-var").textContent = formatVariance(projects.current.budgetQty - projects.previous.budgetQty)
        document.getElementById("actual-qty-var").textContent = formatVariance(projects.current.actualQty - projects.previous.actualQty)
        document.getElementById("this-period-qty-var").textContent = formatVariance(projects.current.thisPeriodQty - projects.previous.thisPeriodQty)
        document.getElementById("remaining-qty-var").textContent = formatVariance(projects.current.remainingQty - projects.previous.remainingQty)

        document.getElementById("added-act-bar").style.width = `${formatPercent(taskChanges.added.data.length / maxChangeCount)}`
        document.getElementById("deleted-act-bar").style.width = `${formatPercent(taskChanges.deleted.data.length / maxChangeCount)}`
        document.getElementById("act-name-bar").style.width = `${formatPercent(taskChanges.name.data.length / maxChangeCount)}`
        document.getElementById("act-dur-bar").style.width = `${formatPercent(taskChanges.duration.data.length / maxChangeCount)}`
        document.getElementById("added-cal-bar").style.width = `${formatPercent(calendarChanges.added.data.length / maxChangeCount)}`
        document.getElementById("deleted-cal-bar").style.width = `${formatPercent(calendarChanges.deleted.data.length / maxChangeCount)}`


        document.getElementById("act-cal-bar").style.width = `${formatPercent(taskChanges.calendar.data.length / maxChangeCount)}`
        document.getElementById("act-wbs-bar").style.width = `${formatPercent(taskChanges.wbs.data.length / maxChangeCount)}`
        document.getElementById("added-rel-bar").style.width = `${formatPercent(logicChanges.added.data.length / maxChangeCount)}`
        document.getElementById("deleted-rel-bar").style.width = `${formatPercent(logicChanges.deleted.data.length / maxChangeCount)}`
        document.getElementById("revised-rel-bar").style.width = `${formatPercent(logicChanges.revised.data.length / maxChangeCount)}`
        document.getElementById("added-res-bar").style.width = `${formatPercent(resourceChanges.added.data.length / maxChangeCount)}`
        document.getElementById("deleted-res-bar").style.width = `${formatPercent(resourceChanges.deleted.data.length / maxChangeCount)}`
        document.getElementById("revised-cost-bar").style.width = `${formatPercent(resourceChanges.revisedCost.data.length / maxChangeCount)}`
        document.getElementById("revised-qty-bar").style.width = `${formatPercent(resourceChanges.revisedUnits.data.length / maxChangeCount)}`
        document.getElementById("act-start-bar").style.width = `${formatPercent(taskChanges.start.data.length / maxChangeCount)}`
        document.getElementById("act-finish-bar").style.width = `${formatPercent(taskChanges.finish.data.length / maxChangeCount)}`
        document.getElementById("added-pr-cnst-bar").style.width = `${formatPercent(constraintChanges.addedPrim.data.length / maxChangeCount)}`
        document.getElementById("deleted-pr-cnst-bar").style.width = `${formatPercent(constraintChanges.deletedPrim.data.length / maxChangeCount)}`
        document.getElementById("revised-pr-cnst-bar").style.width = `${formatPercent(constraintChanges.revisedPrim.data.length / maxChangeCount)}`
        document.getElementById("added-sec-cnst-bar").style.width = `${formatPercent(constraintChanges.addedSec.data.length / maxChangeCount)}`
        document.getElementById("deleted-sec-cnst-bar").style.width = `${formatPercent(constraintChanges.deletedSec.data.length / maxChangeCount)}`
        document.getElementById("revised-sec-cnst-bar").style.width = `${formatPercent(constraintChanges.revisedSec.data.length / maxChangeCount)}`
        
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

        document.getElementById('start-period').textContent = formatDate(projects.previous.last_recalc_date)
        document.getElementById('end-period').textContent = formatDate(
            new Date(projects.current.last_recalc_date.getTime() - 3600 * 24 * 1000)
        )


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
                    backgroundColor: ['rgba(113, 194, 92, 0.9)'], // green
                    borderColor: ['rgba(113, 194, 92, 1)'],
                    borderWidth: 1,
                },
                {
                    label: 'Late',
                    data: [
                        plannedProgress.lateStart,
                        plannedProgress.lateFinish,
                        plannedProgress.lateStart + plannedProgress.lateFinish
                    ],
                    backgroundColor: ['rgba(255, 99, 132, 0.9)'], // red
                    borderColor: ['rgba(255, 99, 132, 1)'], 
                    borderWidth: 1,
                },
                {
                    label: 'Actual',
                    data: [
                        plannedProgress.actualStart,
                        plannedProgress.actualFinish, 
                        plannedProgress.actualStart + plannedProgress.actualFinish
                    ],
                    backgroundColor: ['rgba(54, 162, 235, 0.9)'], // blue
                    borderColor: ['rgba(54, 162, 235, 1)'],
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


analyzeButton.addEventListener("click", (e) => {
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
