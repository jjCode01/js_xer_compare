const STATUSTYPES = {
    TK_NotStart: 'Not Started',
    TK_Active: 'In Progress',
    TK_Complete: 'Completed'
}

const PERCENTTYPES = {
    CP_Phys: 'Physical',
    CP_Drtn: 'Duration',
    CP_Units: 'Unit'
}

const TASKTYPES = {
    TT_Mile: 'Start Milestone',
    TT_FinMile: 'Finish Milestone',
    TT_LOE: 'Level of Effort',
    TT_Task: 'Task Dependent',
    TT_Rsrc: 'Resource Dependent',
    TT_WBS: 'WBS Summary'
}

const CONSTRAINTTYPES = {
    CS_ALAP: 'As Late as Possible',
    CS_MEO: 'Finish On',
    CS_MEOA: 'Finish on or After',
    CS_MEOB: 'Finish on or Before',
    CS_MANDFIN: 'Mandatory Finish',
    CS_MANDSTART: 'Mandatory Start',
    CS_MSO: 'Start On',
    CS_MSOA: 'Start On or After',
    CS_MSOB: 'Start On or Before',
}

const CALENDARTYPES = {
    CA_Base: 'Global',
    CA_Rsrc: 'Resource',
    CA_Project: 'Project',
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const REGEXSHIFT = /s\|[0-1][0-9]:[0-5][0-9]\|f\|[0-1][0-9]:[0-5][0-9]/g;
const REGEXHOUR = /[0-1][0-9]:[0-5][0-9]/g;

const setDataType = (col, val) => {
    if (!val) {
        return;
    }
    if (col.endsWith('_date') || col.endsWith('_date2')) {
        return new Date(val.split(' ').join('T'));
    }
    if (col.endsWith('_num')) {
        return parseInt(val);
    }
    if (col.endsWith('_cost') || col.endsWith('_qty') || col.endsWith('_cnt')) {
        return parseFloat(val);
    }
    return val;
}

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
    return exceptionStrings = data.split(/\(d\|/g).slice(1);
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

const newCalendar = cal => {
    cal.default = cal.default_flag === 'Y';
    cal.type = CALENDARTYPES[cal.clndr_type];
    cal.id = (cal.clndr_type === 'CA_Project') ? cal.clndr_name : cal.clndr_id;
    cal.assignments = 0;
    cal.week = parseWorkWeek(cal);
    cal.holidays = parseHolidays(cal);
    cal.exceptions = parseExceptions(cal);
    return cal;
}

const newProj = proj => {
    proj.tasks = new Map();
    proj.tasksByCode = new Map();
    proj.rels = [];
    proj.relsById = new Map();
    proj.resources = [];
    proj.resById = new Map();
    proj.start = proj.last_recalc_date;
    proj.lateEnd = proj.scd_end_date;
    proj.wbs = new Map()
    return proj;
}

const calcPercent = task => {
    if (task.notStarted) return 0.0;
    const pt = {
        CP_Phys: task.phys_complete_pct / 100,
        CP_Drtn: (task.remDur >= task.origDur) ? 0 : 1 - task.remDur / task.origDur,
        CP_Units: 1 - (task.act_work_qty + task.act_equip_qty) / (task.target_work_qty = task.target_equip_qty)
    }
    return pt[task.complete_pct_type];
}

const parseFile = (file, name) => {
    let tables = {};
    let currTable = '';
    let columns = [];

    const getTask = (projId, taskId) => tables.PROJECT[projId]?.tasks?.get(taskId)

    const newTask = task => {
        task.notStarted = task.status_code === 'TK_NotStart';
        task.inProgress = task.status_code === 'TK_Active';
        task.completed = task.status_code === 'TK_Complete';
        task.longestPath = task.driving_path_flag === 'Y';
        task.isMilestone = task.task_type.endsWith('Mile');
        task.isLOE = task.task_type === 'TT_LOE';
        task.status = STATUSTYPES[task.status_code];
        task.origDur = task.target_drtn_hr_cnt / 8;
        task.remDur = task.remain_drtn_hr_cnt / 8;
        task.totalFloat = task.completed ? NaN : task.total_float_hr_cnt / 8
        task.freeFloat = task.completed ? NaN : task.free_float_hr_cnt / 8
        task.resources = [];
        task.predecessors = [];
        task.successors = [];
        task.wbsMap = [];
        task.start = task.act_start_date ?? task.early_start_date;
        task.finish = task.act_end_date ?? task.early_end_date;
        task.percentType = PERCENTTYPES[task.complete_pct_type];
        task.taskType = TASKTYPES[task.task_type];
        task.primeConstraint = CONSTRAINTTYPES[task.cstr_type];
        task.secondConstraint = CONSTRAINTTYPES[task.cstr_type2];
        task.percent = calcPercent(task);
        task.project = tables.PROJECT[task.proj_id]
        task.calendar = tables.CALENDAR[task.clndr_id];
	task.calendar.assignments += 1;
        task.wbs = task.project.wbs.get(task.wbs_id);
        task.wbsStruct = [task.wbs];
        return task;
    }

    const newRelationship = rel => {
        rel.lag = rel.lag_hr_cnt / 8;
        rel.link = rel.pred_type.substring(rel.pred_type.length - 2);
        rel.predTask = getTask(rel.pred_proj_id, rel.pred_task_id);
        rel.succTask = getTask(rel.proj_id, rel.task_id);
        rel.logicId = `${rel.predTask.task_code}|${rel.succTask.task_code}|${rel.link}`;
        return rel;
    }

    const lines = file.split('\n');
    lines.forEach(line => {
        let cols = line.trim().split('\t');
        switch (cols.shift()) {
            case 'ERMHDR':
                tables.version = cols[0];
                tables.dateCreated = cols[1];
                tables.createdBy = cols[4];
                break;
            case '%T':
                currTable = cols[0];
                tables[currTable] = {};
                break;
            case '%F':
                columns = cols;
                break;
            case '%R':
                let row = {};
                columns.forEach((k, i) => row[k] = setDataType(k, cols[i]));
                switch (currTable) {
                    case 'CALENDAR':
                        tables.CALENDAR[row.clndr_id] = newCalendar(row);
                        break;
                    case 'ACCOUNT':
                        tables.ACCOUNT[row.acct_id] = row;
                        break;
                    case 'PROJECT':
                        tables.PROJECT[row.proj_id] = newProj(row);
                        break;
                    case 'PROJWBS':
                        tables.PROJECT[row.proj_id].wbs.set(row.wbs_id, row);
                        if (row.proj_node_flag === 'Y') {
                            tables.PROJECT[row.proj_id].name = row.wbs_name;
                        }
                        break;
                    case 'RSRC':
                        tables.RSRC[row.rsrc_id] = row;
                        break;
                    case 'TASK':
                        task = newTask(row);
                        let wbs = task.wbs
                        while (true) {
                            if (!task.project.wbs.has(wbs.parent_wbs_id)) break;
                            wbs = task.project.wbs.get(wbs.parent_wbs_id);
                            task.wbsStruct.unshift(wbs)
                        }
                        tables.PROJECT[task.proj_id].tasks.set(task.task_id, task);
                        tables.PROJECT[task.proj_id].tasksByCode.set(task.task_code, task); 
                        if (task.start < tables.PROJECT[task.proj_id].start) {
                            tables.PROJECT[task.proj_id].start = task.start;
                        }
                        if (!task.completed && task.late_end_date.getTime() > tables.PROJECT[task.proj_id].lateEnd.getTime()) {
                            tables.PROJECT[task.proj_id].lateEnd = task.late_end_date
                        }
                        break;
                    case 'TASKPRED':
                        rel = newRelationship(row);
                        tables.PROJECT[rel.proj_id].rels.push(rel);
                        tables.PROJECT[rel.proj_id].relsById.set(rel.logicId, rel);
                        tables.PROJECT[rel.proj_id].tasks.get(rel.task_id).predecessors.push(rel);
                        tables.PROJECT[rel.pred_proj_id].tasks.get(rel.pred_task_id).successors.push(rel);
                        break;
                    case 'TASKRSRC':
                        if (row.target_cost === 0 && row.target_qty === 0) break;
                        row.task = tables.PROJECT[row.proj_id].tasks.get(row.task_id);
                        row.actualCost = row.act_reg_cost + row.act_ot_cost;
                        row.atCompletionCost = row.actualCost + row.remain_cost;
                        row.earnedValue = row.task.percent * row.target_cost
                        if (row.acct_id && tables.hasOwnProperty('ACCOUNT')) {
                            row.account = tables.ACCOUNT[row.acct_id];
                        }
                        tables.PROJECT[row.proj_id].resources.push(row);
                        tables.PROJECT[row.proj_id].tasks.get(row.task_id).resources.push(row);
                        if (tables.hasOwnProperty('RSRC')) {
                            row.rsrcName = tables.RSRC[row.rsrc_id].rsrc_short_name;
                            row.resId = `${row.task.task_code}|${row.rsrcName}|${row?.account?.acct_short_name}`;
                            tables.PROJECT[row.proj_id].resById.set(row.resId, row);
                        } 
                        break;
                }
            break;
        }
    })

    Object.values(tables.PROJECT).forEach(proj => {
        proj.wbs.forEach(wbs => {

            let id = [wbs.wbs_short_name];
            let node = wbs;

            while (true) {
                if (!proj.wbs.has(node.parent_wbs_id) || 
                    proj.wbs.get(node.parent_wbs_id).proj_node_flag === 'Y') break;

                node = proj.wbs.get(node.parent_wbs_id);
                id.unshift(node.wbs_short_name)
            }
            wbs.wbsID = id.join('.')
        })
    })

    return tables;
}