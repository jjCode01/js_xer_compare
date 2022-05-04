import Change from "./data/change.js";
import { projects, xerTables } from "./main.js"
import { formatDate, formatVariance, formatPercent, formatCost, formatNumber, dateVariance, getWeekday } from "./utilities.js";

const checkLongestPath = task => task.longestPath ? '\u2611' : '\u2610';
const statusImg = task => {
    let img = new Image(20, 10);
    if (!task) {
	    img.src = "./static/img/deleted.png";
        return img;
    }
    let postFix = (task.longestPath && !task.completed) ? '-lp.png' : '.png';
    let preFix = task.isMilestone ? 'ms-' : '';
    let imgName = task.notStarted ? `${preFix}open${postFix}` : (task.inProgress ? `${preFix}active${postFix}` : `${preFix}complete${postFix}`);
    img.src = "./static/img/" + imgName;
    return img;
}

export let updates = {
    started: new Change(
        "ud-started", 'Activities Started',
        ['Act ID', 'Act Name', 'Status', 'Start', 'Finish'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.status, 
                formatDate(task.start), formatDate(task.finish)
            ])
        }
    ),
    finished: new Change(
        "ud-finished", "Activities Finished",
        ['Act ID', 'Act Name', 'Status', 'Start', 'Finish'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.status, formatDate(task.start), 
                formatDate(task.finish)
            ])
        }
    ),
    startFinish: new Change(
        "ud-startFinish", "Activities Started and Finished",
        ['Act ID', 'Act Name', 'Status', 'Start', 'Finish'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.status, formatDate(task.start), 
                formatDate(task.finish)
            ])
        }
    ),
    percent: new Change(
        "ud-percent", "Updated Percent Completes",
        ['Act ID', 'Act Name', 'Status', 'Percent\r\nType', '% Comp', 'Prev\r\n% Comp', 'Var'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.status, task.percentType, 
                formatPercent(task.percent), formatPercent(projects.previous.getTask(task).percent), 
                formatPercent(task.percent - projects.previous.getTask(task).percent, 'always')
            ])
        }
    ),
    duration: new Change(
        "ud-duration", "Updated Remaining Durations",
        [
            'Act ID', 'Act Name', 'Status', 'Orig\r\nDur', 
            'Rem\r\nDur', 'Prev\r\nRem\r\nDur', 'Var'
        ],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.status, formatNumber(task.origDur), 
                formatNumber(task.remDur), formatNumber(projects.previous.getTask(task).remDur), 
                formatVariance(task.remDur - projects.previous.getTask(task).remDur)
            ])
        }
    ),
    cost: new Change(
        "ud-cost", "Updated Actual Cost",
        [
            'Act ID', 'Act Name', 'Status', 'Budgeted Cost', 
            'Actual Cost', 'Prev\r\nActual Cost', 'Var'
        ],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.status, formatCost(task.budgetCost), 
                formatCost(task.actualCost), formatCost(projects.previous.getTask(task).actualCost), 
                formatCost(task.actualCost - projects.previous.getTask(task).actualCost)
            ])
        }
    ),
    regress: new Change(
        "ud-regress", "Regressive Updates",
        [
            'Act ID', 'Act Name', 'Status', 'Prev\r\nStatus', 'Orig Dur', 
            'Rem Dur', 'Prev\r\nRem Dur', 'RD Var', '% Comp', 
            'Prev\r\n% Comp', '% Var'
        ],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.status, 
                projects.previous.getTask(task).status, task.origDur, 
                task.remDur, projects.previous.getTask(task).remDur, 
                formatVariance(task.remDur - projects.previous.getTask(task).remDur),
                formatPercent(task.percent), formatPercent(projects.previous.getTask(task).percent), 
                formatPercent(task.percent - projects.previous.getTask(task).percent, 'always')
            ])
        }
    )
}

export let constraintVariance = {
    id: "cnst-var",
    title: "Finish On or Before Constraint Trending",
    columns: [
        'Act ID', '', 'Act Name', 'Constraint',
        'Current\r\nFinish', 'Float', 'Previous\r\nFinish', 'Finish\r\nVariance'
    ],
    data: [],
    getRows: function() {
        return this.data.map(task => {
            if (projects.previous.hasTask(task)) {
                return [
                    task.task_code, statusImg(task), task.task_name, formatDate(task.cstr_date, false), 
                    formatDate(task.finish, false), formatVariance(task.totalFloat), 
                    formatDate(projects.previous.getTask(task).finish, false),
                    formatVariance(dateVariance(projects.previous.getTask(task).finish, task.finish))
                ]
            }
            return [
                task.task_code, statusImg(task), task.task_name, formatDate(task.cstr_date, false), 
                formatDate(task.finish, false), formatVariance(task.totalFloat), "N/A", "N/A"
            ]
        })
    }
}


export let logicChanges = {
    added: new Change(
        "rl-added", "Added Relationships",
        [
            'Pred ID', '', 'Predecessor Name', 
            'Succ ID', '', 'Successor Name', 'Link', 'Lag'
        ],
        function() {
            return this.data.map(task => [
                task.predTask.task_code, statusImg(task.predTask), task.predTask.task_name, 
                task.succTask.task_code, statusImg(task.succTask), task.succTask.task_name, task.link, task.lag 
            ])
        }
    ),
    deleted: new Change(
        "rl-deleted", "Deleted Relationships",
        [
            'Pred ID', '', 'Predecessor Name', 
            'Succ ID', '', 'Successor Name', 'Link', 'Lag'
        ],
        function() {
            return this.data.map(task => [
                task.predTask.task_code, statusImg(projects.current.getTask(task.predTask)), task.predTask.task_name, 
                task.succTask.task_code, statusImg(projects.current.getTask(task.succTask)), task.succTask.task_name, task.link, task.lag 
            ])
        }
    ),
    revised: {
        id: "rl-revised", 
        title: "Revised Relationships",
        columns: [
            'Pred ID', '', 'Predecessor Name', 
            'Succ ID', '', 'Successor Name', 'New\r\nLink:Lag', 'Old\r\nLink:Lag'
        ],
        data: [],
        prev: [],
        getRows: function() {
            return this.data.map((task, i) => {
                return [
                    task.predTask.task_code, statusImg(task.predTask), task.predTask.task_name, 
                    task.succTask.task_code, statusImg(task.succTask), task.succTask.task_name, 
                    `${task.link}:${task.lag}`, `${this.prev[i].link}:${this.prev[i].lag}` 
                ]
            })
        }
    },
}

export let resourceChanges = {
    added: new Change(
        "rs-added", "Added Resources",
        ['Act ID', '', 'Activity Name', 'Resource', 'Qty', 'Cost'],
        function() {
            return this.data.map(task => [
                task.task.task_code, statusImg(task.task), task.task.task_name,
                task.rsrc.rsrc_short_name, formatNumber(task.target_qty), formatCost(task.target_cost)
            ])
        }
    ),
    deleted: new Change(
        "rs-deleted", "Deleted Resources",
        ['Act ID', '', 'Activity Name', 'Resource', 'Qty', 'Cost'],
        function() {
            return this.data.map(task => [
                task.task.task_code, statusImg(task.task), task.task.task_name,
                task.rsrc?.rsrc_short_name, formatNumber(task.target_qty), formatCost(task.target_cost)
            ])
        }
    ),
    revisedCost: new Change(
        "rs-cost", "Revised Resource Budgeted Cost",
         ['Act ID', '', 'Activity Name', 'Resource', 'New Cost', 'Old Cost', 'Var'],
        function() {
            return this.data.map(res => {
                const prevCost = projects.previous.getResource(res).target_cost;
                return [
                    res.task.task_code, statusImg(res.task), res.task.task_name,
                    res.rsrc?.rsrc_short_name, formatCost(res.target_cost), formatCost(prevCost), 
                    formatCost(res.target_cost - prevCost)
                ]
            })
        }
    ),
    revisedUnits: new Change(
        "rs-units", "Revised Resource Budgeted Quantity",
        ['Act ID', '', 'Activity Name', 'Resource', 'New Qty', 'Old Qty', 'Var'],
        function() {
            return this.data.map(res => {
                const prevQty = projects.previous.getResource(res).target_qty;
                return [
                    res.task.task_code, statusImg(res.task), res.task.task_name, res.rsrc?.rsrc_short_name, 
                    formatNumber(res.target_qty), formatNumber(prevQty), 
                    formatVariance(res.target_qty - prevQty)
                ]
            })
        }
    ),
}

export let wbsChanges = {
    added: new Change(
        "wbs-added", "Added WBS Node",
        ['WBS ID', 'WBS Name',],
        function() {
            return this.data.map(wbs => [wbs.wbsId, wbs.wbs_name,])
        }
    ),
    deleted: new Change(
        "wbs-deleted", "Deleted WBS Node",
        ['WBS ID', 'WBS Name',],
        function() {
            return this.data.map(wbs => [wbs.wbsId, wbs.wbs_name,])
        }
    ),
    revised: new Change(
        "wbs-revised", "Revised WBS Name",
        ['WBS ID', 'New WBS Name', 'Old WBS Name'],
        function() {
            return this.data.map(wbs => [wbs.wbsId, wbs.wbs_name, projects.previous.getWbs(wbs).wbs_name])
        }
    ),
}

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
                cal.clndr_name, cal.type, , cal.week[0].hours, cal.week[1].hours, cal.week[2].hours, cal.week[3].hours, cal.week[4].hours, cal.week[5].hours, cal.week[6].hours 
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
//    addedException: new Change(
//        "cal-added-exception", "Added Calendar Exceptions",
//        ['Calendar', 'Type', 'Exception Date', 'Exception Hrs', 'Normal Hrs', 'Variance'],
//        function() {
//            return this.data.map(cal => {
//                return [
//                    cal.clndr_name, cal.type, '', '', '', ''
//                ]
//            })
//        }
//    ),
//    deletedException: {
//        id: "cal-deleted-exception",
//        title: "Deleted Calendar Exceptions",
//        columns: [
//            'Calendar', 'Type', 'Exception Date', 'Exception Hrs', 'Normal Hrs', 'Variance'
//        ],
//        data: [],
//        getRows: function() {
//            return this.data.map(cal => {
//                return [
//                    cal.clndr_name, cal.type, '', '', '', ''
//                ]
//            })
//        }
//    },
}

export let constraintChanges = {
    addedPrim: new Change(
        "cs-added-prim", "Added Primary Constraints",
        ['Act ID', '', 'Activity Name', 'Constraint', 'Date'],
        function() {
            return this.data.map(task => [
                task.task_code, statusImg(task), task.task_name,
                task.primeConstraint, formatDate(task.cstr_date)
            ])
        }
    ),
    addedSec: new Change(
        "cs-added-sec", "Added Secondary Constraints",
        ['Act ID', '', 'Activity Name', 'Constraint', 'Date'],
        function() {
            return this.data.map(task => [
                task.task_code, statusImg(task), task.task_name,
                task.secondConstraint, formatDate(task.cstr_date2)
            ])
        }
    ),
    deletedPrim: new Change(
        "cs-deleted-prim", "Deleted Primary Constraints",
        ['Act ID', '', 'Activity Name', 'Constraint', 'Date'],
        function() {
            return this.data.map(task => [
                task.task_code, statusImg(task), task.task_name,
                task.primeConstraint, formatDate(task.cstr_date)
            ])
        }
    ),
    deletedSec: new Change(
        "cs-deleted-sec", "Deleted Secondary Constraints",
        ['Act ID', '', 'Activity Name', 'Constraint', 'Date'],
        function() {
            return this.data.map(task => [
                task.task_code, statusImg(task), task.task_name,
                task.secondConstraint, formatDate(task.cstr_date2)
            ])
        }
    ),
    revisedPrim: new Change(
        "cs-revised-prim", "Revised Primary Constraint Dates",
        ['Act ID', '', 'Activity Name', 'Constraint', 'New Date', 'Old Date', 'Var'],
        function() {
            return this.data.map(task => {
                const prevDate = projects.previous.getTask(task).cstr_date
                const variance = dateVariance(task.cstr_date, prevDate) ?? "N/A"
                return [
                    task.task_code, statusImg(task), task.task_name, task.primeConstraint, 
                    formatDate(task.cstr_date), formatDate(projects.previous.getTask(task).cstr_date), 
                    formatVariance(variance)
                ]
            })
        }
    ),
    revisedSec: new Change(
        "cs-revised-sec", "Revised Secondary Constraint Dates",
        ['Act ID', '', 'Activity Name', 'Constraint', 'New Date', 'Old Date', 'Var'],
        function() {
            return this.data.map(task => {
                const prevDate = projects.previous.getTask(task).cstr_date2
                const variance = dateVariance(task.cstr_date2, prevDate) ?? "N/A"
                return [
                    task.task_code, statusImg(task), task.task_name, task.secondConstraint, 
                    formatDate(task.cstr_date2), formatDate(projects.previous.getTask(task).cstr_date2), 
                    formatVariance(variance)
                ]
            })
        }
    ),
}

let openEnds = {
    predecessor: new Change(
        "open-pred", "Activities With No Predecessor",
        ['Act ID', 'Activity Name', 'Status', 'Type'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.status, task.taskType
            ])
        }
    ),
    successor: new Change(
        "open-succ", "Activities With No Successor",
        ['Act ID', 'Activity Name', 'Status', 'Type'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.status, task.taskType
            ])
        }
    ),
    start: new Change(
        "open-start", "Activities With No Start (SS or FS) Predecessor",
        ['Act ID', 'Activity Name', 'Status', 'Type'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.status, task.taskType
            ])
        }
    ),
    finish: new Change(
        "open-finish", "Activities With No Finish (FS or FF) Successor",
        ['Act ID', 'Activity Name', 'Status', 'Type'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.status, task.taskType
            ])
        }
    ),
    duplicate: new Change(
        "open-duplicate", "Duplicate Relationships",
        ['Pred ID', 'Predecessor Name', 'Succ ID', 'Successor Name', "Link:Lag", "Duplicate\r\nLink:Lag"],
        function() {
            return this.data.map(task => [
                task[0].predTask.task_code, task[0].predTask.task_name, 
                task[0].succTask.task_code, task[0].succTask.task_name,
                `${task[0].link}:${task[0].lag}`, `${task[1].link}:${task[1].lag}`
            ])
        }
    )
}

let dateWarnings = {
    start: new Change(
        "inv-start", "Activities With Actual Start on or After Data Date",
        ['Act ID', 'Activity Name', 'Status', 'Actual\r\nStart', 'Data\r\nData'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.status, formatDate(task.start), 
                formatDate(projects.current.last_recalc_date)
            ])
        }
    ),
    finish: new Change(
        "inv-finish", "Activities With Actual Finish on or After Data Date",
        ['Act ID', 'Activity Name', 'Status', 'Actual\r\nFinish', 'Data\r\nData'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.status, formatDate(task.finish), 
                formatDate(projects.current.last_recalc_date)
            ])
        }
    ),
    expected: new Change(
        "inv-expected", "Activities With an Expected Finish Date",
        ['Act ID', 'Activity Name', 'Status', 'Expected\r\nFinish', 'Orig\r\nDur', 'Rem\r\nDur'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.status, formatDate(task.expect_end_date), 
                formatNumber(task.origDur), formatNumber(task.remDur)
            ])
        }
    ),
    suspend: new Change(
        "inv-suspend", "Activities With Suspend / Resume Dates",
        ['Act ID', 'Activity Name', 'Status', 'Suspend', 'Resume'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.status, formatDate(task.suspend_date), 
                formatDate(task.resume_date)
            ])
        }
    )
}

let durWarnings = {
    long: new Change(
        "dur-long", "Construction Activities With Original Durations Greater than 20 Days",
        ['Act ID', 'Activity Name', 'Act Type', 'Status', 'Cal', 'Orig\r\nDur'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.taskType, task.status, 
                task.calendar.clndr_name, task.origDur
            ])
        }
    ),
    zero: new Change(
        "dur-zero", "Activities With Original Durations Equal to 0 Days",
        ['Act ID', 'Activity Name', 'Act Type', 'Status', 'Cal', 'Orig\r\nDur'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.taskType, task.status, 
                task.calendar.clndr_name, task.origDur
            ])
        }
    ),
    rdzero: new Change(
        "dur-rdzero", "Open Activities with Zero Remaining Duration",
        ['Act ID', 'Activity Name', 'Act Type', 'Status', 'Cal', 'Orig\r\nDur', 'Rem\r\nDur'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.taskType, task.status, 
                task.calendar.clndr_name, task.origDur, task.remDur
            ])
        }
    ),
    odrd: new Change(
        "dur-odrd", "Open Activities With Unequal Original and Remaining Durations",
        ['Act ID', 'Activity Name', 'Act Type', 'Status', 'Cal', 'Orig\r\nDur', 'Rem\r\nDur'],
        function() {
            return this.data.map(task => [
                task.task_code, task.task_name, task.taskType, task.status, 
                task.calendar.clndr_name, task.origDur, task.remDur
            ])
        }
    )
}

let costWarnings = {
    budget: new Change(
        "cost-budget", "Budgeted Cost Differs from At Completion Cost",
        [
            'Act ID', 'Activity Name', 'Status', 'Resource', 'Budgeted\r\nCost', 
            'At Completion\r\nCost', 'Variance'
        ],
        function() {
            return this.data.map(res => {
                return [
                    res.task.task_code, res.task.task_name, res.task.status, 
                    res.rsrcName, formatCost(res.target_cost), formatCost(res.atCompletionCost), 
                    formatCost(res.atCompletionCost - res.target_cost)
                ]
            })
        }
    ),
    earned: new Change(
        "cost-ev", "Actual Cost to Date Differs from Earned Value",
        ['Act ID', 'Activity Name', 'Status', 'Resource', '%\r\nComp', 
         'Actual\r\nCost', 'Earned\r\nValue', 'Variance'],
        function() {
            return this.data.map(res => {
                return [
                    res.task.task_code, res.task.task_name, res.task.status, 
                    res.rsrcName, formatPercent(res.task.percent), formatCost(res.actualCost), 
                    formatCost(res.earnedValue), formatCost(res.actualCost - res.earnedValue)
                ]
            })
        }
    ),
    regress: new Change(
        "cost-regress", "Regressive This Period Cost",
        [
            'Act ID', 'Activity Name', 'Status', 
            'Resource', 'Budgeted\r\nCost', 'This Period\r\nCost'
        ],
        function() {
            return this.data.map(res => {
                return [
                    res.task.task_code, res.task.task_name, res.task.status, 
                    res.rsrcName, formatCost(res.target_cost), formatCost(res.act_this_per_cost)
                ]
            })
        }
    )
}

export let plannedProgress = {
    earlyStart: 0,
    lateStart: 0,
    earlyFinish: 0,
    lateFinish: 0,
}
