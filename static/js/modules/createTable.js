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

export default function createTable(id, title, labels, vals, foot=""){
    const align = labels.map(getAlign)
    const wrap = labels.map(getWrap)

    let table = document.createElement("table");
    let caption = document.createElement("caption")
    caption.innerText = `${title}: ${vals.length}`
    caption.id = id + '-table'
    table.append(caption)
    
    let head = document.createElement("thead")
    head.classList.add('no-break')
    table.append(head)
    let body = document.createElement("tbody")
    table.append(body)
    let footer = document.createElement("tfoot")
    table.append(footer)

    let row = head.insertRow(), cell;
    row.classList.add('no-break')
    labels.forEach((val, i) => {
        cell = newCell('th', align[i], 'pre', val)
        cell.style.verticalAlign = 'bottom';
        cell.classList.add('btm-border')
        row.append(cell);
    })

    vals.forEach((task, r) => {
        row = body.insertRow();
        row.classList.add('no-break')
        task.forEach((val, i) => {
            cell = newCell('td', align[i], wrap[i], val)
            cell.style.verticalAlign = 'top';
            if (r % 2 !== 0) row.style.backgroundColor = '#e7e7e7';
            row.append(cell);
        })
    })

    row = footer.insertRow();
    cell = document.createElement("td")
    cell.colSpan = `${labels.length}`
    cell.innerText = foot
    cell.style.color = '#5f5f5f'
    row.append(cell)
    return table
}