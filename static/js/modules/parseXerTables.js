import Calendar from "./calendar.js";
import Project from "./project.js";
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
    CALENDAR: 'clndr_id',
    PROJECT: 'proj_id',
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
    constructor(file, name) {
        this.name = name
        Object.assign(this, parseTableObjects(file))
        this.#foo()
    }
    #foo() {
        this.PROJWBS.rows.forEach(wbs => {
            this.PROJECT.rows[wbs.proj_id].wbs.set(wbs.wbs_id, wbs)
            if (wbs.proj_node_flag === 'Y') {
                tables.PROJECT.rows[wbs.proj_id].name = wbs.wbs_name;
            }
        })
        this.TASK.rows.forEach(task => {
            this.PROJECT.rows[task.proj_id].addTask = new Task(task, this.PROJECT.rows[task.proj_id], this.CALENDAR.rows[task.clndr_id])
        })
    }
    print() {
        console.log(this)
    }
}
