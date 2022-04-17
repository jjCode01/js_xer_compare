import Calendar from "./calendar.js";
import Project from "./project.js";
import Relationship from "./relationship.js";
import Resource from "./resource.js";
import Task from "./task.js";

const regExFindTable = /%T\t/gm;

const setDataType = (col, val) => {
    if (!val) return;
    if (/.+_date2*/.test(col)) return new Date(val.replace(' ', 'T'))
    if (col.endsWith('_num')) return parseInt(val);
    if (/.+_(cost|qty|cnt)/.test(col)) return parseFloat(val)
    return val;
}

const setObjType = (tableName, obj) => {
    if (tableName === 'CALENDAR') return new Calendar(obj)
    if (tableName === 'PROJECT') return new Project(obj)
    return obj
}

const convertArrToObj = (arr, key) => {
    if (!key) return
    return arr.reduce((obj, el) => {
        obj[el[key]] = el
        return obj
    }, {})
}

const tblKeyMap = {
    ACCOUNT: 'account_id',
    CALENDAR: 'clndr_id',
    MEMOTYPE: 'memo_type_id',
    PROJECT: 'proj_id',
    RSRC: 'rsrc_id',
}

class XerTable {
    constructor(name, labels, rows) {
        this.name = name
        this.labels = labels
        this.rows = convertArrToObj(rows, tblKeyMap[name]) ?? rows
    }
}

const parseTableObjects = (file) =>{
    let tables = {}
    const tablesArr = file.split(regExFindTable).slice(1).map(table => table.split('\r\n').slice(0, -1))
    tablesArr.forEach(tbl => {
        const name = tbl.shift()
        const labels = tbl.shift().split('\t').slice(1)
        const rows = tbl.map(row => {
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

export default class ParseXer{
    #tables
    constructor(file, name) {
        this.name = name
        this.#tables = parseTableObjects(file)
        this.#tables.PROJWBS.rows.forEach(wbs => this.PROJECT[wbs.proj_id].addWbs = wbs)
        if ('TASK' in this.#tables) {
            this.#tables.TASK.rows.forEach(task => {
                this.PROJECT[task.proj_id].addTask = new Task(
                    task, this.PROJECT[task.proj_id], this.CALENDAR[task.clndr_id]
                )
            })
        }
        if ('TASKPRED' in this.#tables) {
            this.#tables.TASKPRED.rows.forEach(rel => {
                const predTask = this.PROJECT[rel.pred_proj_id].tasks.get(rel.pred_task_id)
                const succTask = this.PROJECT[rel.proj_id].tasks.get(rel.task_id)
                this.PROJECT[rel.proj_id].addRelationship = new Relationship(rel, predTask, succTask)
            })
        }
        if ('TASKRSRC' in this.#tables) {
            this.#tables.TASKRSRC.rows.forEach(rsrc => {
                if (!(rsrc.target_cost === 0 && rsrc.target_qty === 0)) {
                    const task = this.PROJECT[rsrc.proj_id].tasks.get(rsrc.task_id);
                    const account = this.#tables?.ACCOUNT?.rows[rsrc.acct_id]
                    const resType = this.#tables?.RSRC?.rows[rsrc.rsrc_id]
                    this.PROJECT[rsrc.proj_id].addResource = new Resource(rsrc, resType, task, account)
                }
            })
        }
    }
    get CALENDAR() {
        return this.#tables.CALENDAR.rows
    }
    get PROJECT() {
        return this.#tables.PROJECT.rows
    }
    get RSRC() {
        return this.#tables?.RSRC?.rows
    }
    print() {
        console.log(this)
    }
}
