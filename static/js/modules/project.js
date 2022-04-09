export default class Project {
    constructor(obj) {
        Object.assign(this, obj)
        this.tasks = new Map();
        this.tasksByCode = new Map();
        this.rels = [];
        this.relsById = new Map();
        this.resources = [];
        this.resById = new Map();
        this.start = this.last_recalc_date;
        this.lateEnd = this.scd_end_date;
        this.wbs = new Map();
        this.name = '';
    }
}