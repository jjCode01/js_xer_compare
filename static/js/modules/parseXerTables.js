const RETABLE = /%T\t/g;

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

const createTableObjects = (file) =>{
    const tablesArr = file.split(RETABLE).slice(1).map(el => el.split('\n'))
    const tablesObj = tablesArr.reduce((obj, tbl) => {
        const name = tbl.shift().replace('\r', '')
        const labels = tbl.shift().replace('\r', '').split('\t').slice(1)
        const rows = tbl.map(row => {
            const rowArr = row.replace('\r', '').split('\t').slice(1)
            if (rowArr.length) {
                const rowObj = rowArr.reduce((col, val, i) => {
                    col[labels[i]] = val
                    return col
                }, {})
                return rowObj
            }
        })
            
        obj[name] = new XerTable(name, labels, rows)
        return obj
    }, {})
    return tablesObj
}

export default class ParsXer{
    constructor(file, name) {
        this.name = name
        this.tables = createTableObjects(file)
    }
    print() {
        console.log(this.name)
        console.log(this.tables)
    }
}
