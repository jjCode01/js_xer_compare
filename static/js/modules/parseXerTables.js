import Calendar from "./calendar.js";
import Memo from "./memo.js";
import Project from "./project.js";
import Relationship from "./relationship.js";
import Resource from "./resource.js";
import Task from "./task.js";
import WbsNode from "./wbs.js";

const tblKeyMap = {
    ACCOUNT: 'acct_id',
    CALENDAR: 'clndr_id',
    MEMOTYPE: 'memo_type_id',
    PROJECT: 'proj_id',
    RSRC: 'rsrc_id',
    PROJWBS: 'wbs_id',
}

class XerTable {
    constructor(name, labels, rows) {
        this.name = name
        this.labels = labels
        this.rows = convertArrToObj(rows, tblKeyMap[name]) ?? rows
    }
}

export default class ParseXer{
    #tables
    constructor(file, name) {
        this.name = name
        this.#tables = parseTableObjects(file)

        this.PROJWBS?.forEach(wbs => {
            if (!wbs.isProjectNode) {
                wbs.parent = this.#tables.PROJWBS.rows[wbs.parent_wbs_id]
            }
        })
        this.PROJWBS?.forEach(wbs => {
            if (wbs.isProjectNode) {
                wbs.path = []
            }
            else {
                let node = wbs
                let path = [wbs.wbs_short_name]
                while (true) {
                    node = node.parent;
                    if (!node || node.isProjectNode) break;
                    if (node.path) {
                        path = node.path.concat(path);
                        break;
                    }
                    else {
                        path.unshift(node.wbs_short_name)
                    }
                } 
                wbs.path = path
            }
            this.PROJECT[wbs.proj_id].addWbs = wbs
        })
        
        this.TASK?.forEach(task => {
            this.PROJECT[task.proj_id].addTask = new Task(task, this.CALENDAR[task.clndr_id])
        })
        this.TASKPRED?.forEach(rel => {
            const predTask = this.PROJECT[rel.pred_proj_id].tasks.get(rel.pred_task_id)
            const succTask = this.PROJECT[rel.proj_id].tasks.get(rel.task_id)
            this.PROJECT[rel.proj_id].addRelationship = new Relationship(rel, predTask, succTask)
        })
        if ('RSRC' in this.#tables) {
            this.TASKRSRC?.forEach(rsrc => {
                if (rsrc.target_cost !== 0 || rsrc.target_qty !== 0) {
                    const task = this.PROJECT[rsrc.proj_id].tasks.get(rsrc.task_id);
                    const account = this.#tables?.ACCOUNT?.rows[rsrc.acct_id]
                    const resType = this.#tables?.RSRC?.rows[rsrc.rsrc_id]
                    this.PROJECT[rsrc.proj_id].addResource = new Resource(rsrc, resType, task, account)
                }
            })
        }
        this.TASKMEMO?.forEach(memo => {
            const task = this.PROJECT[memo.proj_id].tasks.get(memo.task_id)
            const memoType = this?.MEMOTYPE[memo.memo_type_id]
            this.PROJECT[memo.proj_id].addNote = new Memo(memo, task, memoType)
        })
    }
    get CALENDAR() { return this.#tables?.CALENDAR.rows }
    get PROJECT() { return this.#tables?.PROJECT.rows }
    get PROJWBS() { return Object.values(this.#tables.PROJWBS.rows) }
    get RSRC() { return this.#tables?.RSRC?.rows }
    get MEMOTYPE() { return this.#tables?.MEMOTYPE?.rows }
    get TASK() { return this.#tables?.TASK?.rows }
    get TASKMEMO() { return this.#tables?.TASKMEMO?.rows }
    get TASKPRED() { return this.#tables?.TASKPRED?.rows }
    get TASKRSRC() { return this.#tables?.TASKRSRC?.rows }
    print() {console.log(this)}
    errors = (proj_id) => {
        return verifyXer(this.#tables, proj_id).join('\n')
    }
}

const setDataType = (col, val) => {
    if (!val || !col) return;
    if (/.+_date2*/.test(col)) return new Date(val.replace(' ', 'T'))
    if (col.endsWith('_num')) return parseInt(val);
    if (/.+_(cost|qty|cnt)/.test(col)) return parseFloat(val)
    return val;
}

const setObjType = (tableName, obj) => {
    if (tableName === 'CALENDAR') return new Calendar(obj)
    if (tableName === 'PROJECT') return new Project(obj)
    if (tableName === 'PROJWBS') return new WbsNode(obj)
    return obj
}

const convertArrToObj = (arr, key) => {
    if (!key) return
    return arr.reduce((obj, el) => {
        obj[el[key]] = el
        return obj
    }, {})
}

const parseTableObjects = (file) =>{
    let tables = {}
    const tablesArr = file.split(/%T\t/gm).slice(1).map(table => table.split('\r\n').slice(0, -1))
    tablesArr.forEach(tbl => {
        const name = tbl.shift()
        const labels = tbl.shift().split('\t').slice(1)
        const rows = tbl.filter(row => row && row.startsWith('%R')).map(row => {
            const obj = row.split('\t').slice(1).reduce((col, val, i) => {
                col[labels[i]] = setDataType(labels[i], val)
                return col
            }, {})
            return setObjType(name, obj)
        })
        tables[name] = new XerTable(name, labels, rows)
    })
    return tables
}

const verifyXer = (tables, proj_id) =>{
    const requiredTables = ['CALENDAR', 'PROJECT', 'PROJWBS', 'TASK', 'TASKPRED', 'SCHEDOPTIONS']
    const requiredTablePairs = {
        TASKFIN: 'FINDATES',
        TRSRCFIN: 'FINDATES',
        TASKRSRC: 'RSRC',
        TASKMEMO: 'MEMOTYPE',
        ACTVCODE: 'ACTVTYPE',
        TASKACTV: 'ACTVCODE',
        PCATVAL: 'PCATTYPE',
        PROJPCAT: 'PCATVAL',
        UDFVALUE: 'UDFTYPE',
    }
    let errors = []
    for (let table of requiredTables) {
        if (!(table in tables)) {
            errors.push(`Missing ${table} Table`)
        }
    }

    for (const [tbl1, tbl2] of Object.entries(requiredTablePairs)) {
        if (tbl1 in tables && !(tbl2 in tables)) {
            errors.push(`Missing ${tbl2} Table`)
        }
    }

    for (const task of tables.TASK.rows) {
        if (task.proj_id === proj_id && !(task.clndr_id in tables.CALENDAR.rows)) {
            errors.push('Missing entries in CALENDAR table')
            break
        }
    }
    
    return errors
}
