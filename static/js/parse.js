import Task from './modules/task.js'
import Calendar from './modules/calendar.js';
import Project from './modules/project.js';
import Memo from './modules/memo.js';
// import { getTask } from './main.js';

// let tables = {}

const setDataType = (col, val) => {
    if (!val) return;

    if (col.endsWith('_date') || col.endsWith('_date2')) {
        return new Date(val.split(' ').join('T'));
    }
    if (col.endsWith('_num')) return parseInt(val);
    
    const floatType = ['_cost', '_qty', '_cnt']
    if (floatType.some(s => col.endsWith(s))) return parseFloat(val)
    return val;
}

export const parseFile = (file, name) => {
    let tables = {};
    let currTable = '';
    let columns = [];

    const getTaskbyID = (projId, taskId) => tables.PROJECT[projId]?.tasks?.get(taskId)

    const newRelationship = rel => {
        rel.lag = rel.lag_hr_cnt / 8;
        rel.link = rel.pred_type.substring(rel.pred_type.length - 2);
        rel.predTask = getTaskbyID(rel.pred_proj_id, rel.pred_task_id);
        rel.succTask = getTaskbyID(rel.proj_id, rel.task_id);
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
                    case 'MEMOTYPE':
                        tables.MEMOTYPE[row.memo_type_id] = row;
                        break;
                    case 'CALENDAR':
                        tables.CALENDAR[row.clndr_id] = new Calendar(row);
                        break;
                    case 'ACCOUNT':
                        tables.ACCOUNT[row.acct_id] = row;
                        break;
                    case 'PROJECT':
                        tables.PROJECT[row.proj_id] = new Project(row);
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
                        let task = new Task(row, tables.PROJECT[row.proj_id], tables.CALENDAR[row.clndr_id])
                        let wbs = task.wbs
                        while (true) {
                            if (!task.project.wbs.has(wbs.parent_wbs_id)) break;
                            wbs = task.project.wbs.get(wbs.parent_wbs_id);
                            task.wbsStruct.unshift(wbs)
                        }
                        tables.PROJECT[task.proj_id].addTask = task;
                        // tables.PROJECT[task.proj_id].tasksByCode.set(task.task_code, task); 
                        if (task.start < tables.PROJECT[task.proj_id].start) {
                            tables.PROJECT[task.proj_id].start = task.start;
                        }
                        if (!task.completed && task.late_end_date.getTime() > tables.PROJECT[task.proj_id].lateEnd.getTime()) {
                            tables.PROJECT[task.proj_id].lateEnd = task.late_end_date
                        }
                        break;
                    case 'TASKPRED':
                        let rel = newRelationship(row);
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
                    case 'TASKMEMO':
                        let memTask = getTaskbyID(row.proj_id, row.task_id)
                        let memType = tables?.MEMOTYPE[row.memo_type_id]
                        let memo = new Memo(row, memTask, memType)
                        tables.PROJECT[memo.proj_id].addNote = memo
                        tables.TASKMEMO[memo.id] = memo
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