import Project from "./project.js";
import Task from "./task.js";

const regExFindTable = /%T\t/gm;

const setDataType = (col, val) => {
    if (!val) return;

    if (col.endsWith('_date') || col.endsWith('_date2')) {
        return new Date(val.replace(' ', 'T'));
    }
    if (col.endsWith('_num')) return parseInt(val);
    
    const floatType = ['_cost', '_qty', '_cnt']
    if (floatType.some(s => col.endsWith(s))) return parseFloat(val)
    return val;
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
    const tablesArr = file.split(regExFindTable).slice(1).map(table => table.split('\r\n'))
    tablesArr.forEach(tbl => {
        tables[tbl.shift()] = {
            labels: tbl.shift().split('\t').slice(1),
            rows: tbl
        }

    })
    // const tablesObj = tablesArr.reduce((obj, tbl) => {
    //     const name = tbl.shift().replace('\r', '')
    //     const labels = tbl.shift().replace('\r', '').split('\t').slice(1)
    //     const rows = tbl.map(row => {
    //         const rowArr = row.replace('\r', '').split('\t').slice(1)
    //         if (rowArr.length) {
    //             const rowObj = rowArr.reduce((col, val, i) => {
    //                 col[labels[i]] = setDataType(labels[i], val)
    //                 return col
    //             }, {})
    //             return rowObj
    //         }
    //     })
            
    //     obj[name] = new XerTable(name, labels, rows)
    //     return obj
    // }, {})
    return tables
}

export default class ParsXer{
    constructor(file, name) {
        this.name = name
        this.tables = parseTableObjects(file)
    }
    print() {
        console.log(this)
    }
}
