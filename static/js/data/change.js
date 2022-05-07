export default class Change {
    constructor(id, title, columns, getRowFunc, footer = "") {
        this.id = id;
        this.title = title;
        this.columns = columns;
        this.data = [];
        this.prev = [];
        this.getRows = getRowFunc;
        this.footer = footer;
    }
    set add(items) {
        if ('curr' in items) {
            this.data.push(items.curr)
            if ('prev' in items) this.prev.push(items.prev)
        } else {
            this.data.push(items)
        }
    }

    get table() {
        if (!this.data.length) return
        const align = this.columns.map(getAlign)
        const wrap = this.columns.map(getWrap)

        let table = document.createElement("table");
        let caption = document.createElement("caption")
        caption.innerText = `${this.title}: ${this.data.length}`
        caption.id = this.id + '-table'
        let head = document.createElement("thead")
        let body = document.createElement("tbody")
        let footer = document.createElement("tfoot")
        table.append(caption, head, body, footer)

        let row = head.insertRow(), cell;
        this.columns.forEach((val, i) => {
            cell = newCell('th', align[i], wrap[i], val)
            cell.style.verticalAlign = 'bottom';
            cell.classList.add('btm-border')
            row.append(cell);
        })

        this.getRows().forEach((task, r) => {
            row = body.insertRow();
            // row.classList.add('no-break')
            task.forEach((val, i) => {
                cell = newCell('td', align[i], wrap[i], val)
                cell.style.verticalAlign = 'top';
                if (r % 2 !== 0) row.style.backgroundColor = '#e7e7e7';
                row.append(cell);
            })
        })

        row = footer.insertRow();
        cell = document.createElement("td")
        cell.colSpan = `${this.columns.length}`
        cell.innerText = this.footer
        cell.style.color = '#5f5f5f'
        row.append(cell)
        return table
    }

    update() {
        if (!!document.getElementById(this.id)) {
            document.getElementById(this.id).textContent = this.data.length.toLocaleString()
        }
    }
}

const getAlign = name => {
    const center = ['Assignments', 'Date', 'Dur', 'Finish', 'Float', 'Hrs', 'Lag', 'Link', 'Start']
    const right = ['Cost', 'Qty', 'Var', 'Variance']
    if (center.some(n => name.endsWith(n))) return 'center'
    if (right.some(n => name.endsWith(n))) return 'right'
    return 'left'
}

const getWrap = name => {
    const normal = ['Name', 'Cal', 'WBS', 'Type', 'Resource', 'Constraint']
    if (normal.some(n => name.endsWith(n))) return 'normal'
    if (name.endsWith('Memo')) return 'pre-line'
    return 'nowrap'
}

const newCell = (type, align, wrap, value) => {
    const cell = document.createElement(type)
    cell.style.textAlign = align;
    cell.style.whiteSpace = wrap;
    cell.append(value)
    return cell
}