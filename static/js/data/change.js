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
}