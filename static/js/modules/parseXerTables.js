import Calendar from "./calendar.js";
import Project from "./project.js";
import Task from "./task.js";

const regExFindTable = /%T\t/gm;

const setDataType = (col, val) => {
    if (!val) return;
    if (col === /.+_date2*/) return new Date(val.replace(' ', 'T'))
    if (col.endsWith('_num')) return parseInt(val);
    
    const floatType = ['_cost', '_qty', '_cnt']
    if (floatType.some(s => col.endsWith(s))) return parseFloat(val)
    return val;
}

const setObjType = (tableName, obj) => {
    if (tableName === 'CALENDAR') return new Calendar(obj)
    return obj
}

class XerTable {
    constructor(name, labels, rows) {
        this.name = name
        this.labels = labels
        this.rows = rows
    }
    print() {
        console.log(this.name, `Entries: ${this.rows.length}`)
    }
}

const analyzeTables = (tables) => {
    // Object.values(tables.PROJECT.rows).forEach(proj => proj = new Project(proj))
    for (let proj in tables.PROJECT.rows) {
        tables.PROJECT.rows[proj] = new Project(tables.PROJECT.rows[proj])
    }
    return tables
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
        this.tables = parseTableObjects(file)
    }
    print() {
        console.log(this)
    }
}
