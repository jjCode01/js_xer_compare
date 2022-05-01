import { FLOAT } from "../main.js"
import Memo from "./memo.js"
import Relationship from "./relationship.js"
import Resource from "./resource.js"
import Task from "./task.js"
import WbsNode from "./wbs.js"

const MONTHNAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

class MonthData {
    constructor() {
        this.actualStart = 0
        this.actualFinish = 0
        this.earlyStart = 0
        this.earlyFinish = 0
        this.lateStart = 0
        this.lateFinish = 0
        this.actualCost = 0.0
        this.earlyCost = 0.0
        this.lateCost = 0.0
    }
}

const getMonthIntervalObj = proj => {
    let months = {};
    let endDate = proj.scd_end_date.getTime() > proj.lateEnd.getTime() ? proj.scd_end_date : proj.lateEnd;
    for (let y = proj.start.getFullYear(); y <= endDate.getFullYear(); y++) {
        let m = y === proj.start.getFullYear() ? proj.start.getMonth() : 0;
        let lastMonth = y === endDate.getFullYear() ? endDate.getMonth() : 11;
        for (; m <= lastMonth; m++){
            months[`${MONTHNAMES[m]}-${y}`] = new MonthData()
        }
    }
    return months;
}

export default class Project {
    // #tasksByCode
    constructor(obj) {
        Object.assign(this, obj)
        this.tasks = new Map();
        this.tasksByCode = new Map()
        this.rels = [];
        this.relsById = new Map();
        this.resources = [];
        this.resById = new Map();
        this.notes = new Map();
        this.start = this.last_recalc_date;
        this.lateEnd = this.scd_end_date;
        this.wbs = new Map();
        this.wbsById = new Map();
        this.name = '';
    }
    set addTask(task) {
        if (task instanceof Task){
            this.tasks.set(task.task_id, task)
            this.tasksByCode.set(task.task_code, task)
        }
        if (task.start < this.start) this.start = task.start;
    }
    set addWbs(wbs) {
        this.wbs.set(wbs.wbs_id, wbs)
        this.wbsById.set(wbs.wbsId, wbs)
        if (wbs.proj_node_flag === 'Y') this.name = wbs.wbs_name;
    }
    set addRelationship(rel) {
        if (rel instanceof Relationship) {
            this.rels.push(rel);
            this.relsById.set(rel.logicId, rel);
            if (this.tasks.has(rel.task_id)) {
                this.tasks.get(rel.task_id).predecessors.push(rel);
            }
            if (this.tasks.has(rel.pred_task_id)) {
                this.tasks.get(rel.pred_task_id).successors.push(rel);
            }
        }
    }
    set addResource(rsrc) {
        if (rsrc instanceof Resource) {
            this.resources.push(rsrc)
            this.resById.set(rsrc.resId, rsrc);
            this.tasks.get(rsrc.task_id).resources.push(rsrc);
        }
    }
    set addNote(memo) {
        if (memo instanceof Memo) {
            this.notes.set(memo.id, memo)
        }
    }
    get taskArray() {return Array.from(this.tasks.values())}
    get notStarted() {return this.taskArray.filter(task => task.notStarted)}
    get inProgress() {return this.taskArray.filter(task => task.inProgress)}
    get completed() {return this.taskArray.filter(task => task.completed)}
    get open() {return this.taskArray.filter(task => !task.completed)}
    get milestones() {return this.taskArray.filter(task => task.isMilestone)}
    get longestPath() {return this.taskArray.filter(task => task.longestPath && !task.completed)}
    get critical() {return this.taskArray.filter(task => task.totalFloat <= FLOAT.critical)}
    get nearCritical() {return this.taskArray.filter(task => task.totalFloat > FLOAT.critical && task.totalFloat <= FLOAT.nearCritical)}
    get normalFloat() {return this.taskArray.filter(task => task.totalFloat > FLOAT.nearCritical && task.totalFloat < FLOAT.high)}
    get highFloat() {return this.taskArray.filter(task => task.totalFloat >= FLOAT.high)}
    get scheduleDuration() {return (this.scd_end_date.getTime() - this.start.getTime()) / (1000 * 3600 * 24)}
    get remScheduleDuration() {return (this.scd_end_date.getTime() - this.last_recalc_date.getTime()) / (1000 * 3600 * 24)}
    get origDurSum() {return this.taskArray.reduce((od, task) => od += task.origDur, 0)}
    get remDurSum() {return this.taskArray.reduce((rd, task) => rd += task.remDur, 0)}
    get physPercentComp() {
        const actDateTerm = (this.inProgress.length / 2 + this.completed.length) / this.tasks.size
        const durTerm = (1 - this.remDurSum / this.origDurSum)
        return (actDateTerm + durTerm) / 2
    }
    get schedPercentComp() {return 1 - this.remScheduleDuration / this.scheduleDuration}
    get budgetCost() {return this.resources.reduce((a, r) => a + r.target_cost, 0.0)}
    get actualCost() {return this.resources.reduce((a, r) => a + r.act_reg_cost + r.act_ot_cost, 0.0)}
    get thisPeriodCost() {return this.resources.reduce((a, r) => a + r.act_this_per_cost, 0.0)}
    get remainingCost() {return this.resources.reduce((a, r) => a + r.remain_cost, 0.0)}
    get budgetQty() {return this.resources.reduce((a, r) => a + r.target_qty, 0.0)}
    get actualQty() {return this.resources.reduce((a, r) => a + r.act_reg_qty + r.act_ot_qty, 0.0)}
    get thisPeriodQty() {return this.resources.reduce((a, r) => a + r.act_this_per_qty, 0.0)}
    get remainingQty() {return this.resources.reduce((a, r) => a + r.remain_qty, 0.0)}

    getTask(task) {
        if (task instanceof Task) return this.tasksByCode.get(task.task_code)
        if (task instanceof String) return this.tasksByCode.get(task)
        return
    }

    hasTask(task) {
        if (task instanceof Task) return this.tasksByCode.has(task.task_code)
        if (task instanceof String) return this.tasksByCode.has(task)
    }

    getLogic(rel) {return this.relsById.get(rel.logicId)}
    hasLogic(rel) {return this.relsById.has(rel.logicId)}

    hasResource(res) {return this.resById.has(res.resId)}
    getResource(res) {return this.resById.get(res.resId)}
    hasWbs(node) {return this.wbsById.has(node.wbsId)}
    getWbs(node) {return this.wbsById.get(node.wbsId)}

    getMemo(memo) {return this.notes.get(memo.id)}

    deepAnalysis() {
        this.months = getMonthIntervalObj(this);    
        const getMonthID = date => `${MONTHNAMES[date.getMonth()]}-${date.getFullYear()}`
    
        this.taskArray.forEach(task => {
            const startMonth = getMonthID(task.start)
            const finishMonth = getMonthID(task.finish)
            if (!task.completed) this.months[finishMonth].earlyFinish += 1;
            if (!task.notStarted) this.months[startMonth].actualStart += 1;
            if (task.notStarted) this.months[startMonth].earlyStart += 1;
            if (task.completed) this.months[finishMonth].actualFinish += 1;
        })
    }
}

Project.prototype.has = function(obj) {
    if (obj instanceof Task) return this.tasksByCode.has(obj.task_code)
    if (obj instanceof Resource) return this.resById.has(obj.resId)
    if (obj instanceof Relationship) return this.relsById.has(obj.logicId)
    if (obj instanceof WbsNode) return this.wbsById.has(obj.wbsId)
    console.log(obj)
    return false
}
Project.prototype.get = function(obj) {
    if (obj instanceof Task) return this.tasksByCode.get(obj.task_code)
    if (obj instanceof Resource) return this.resById.get(obj.resId)
    if (obj instanceof Relationship) return this.relsById.get(obj.logicId)
    if (obj instanceof WbsNode) return this.wbsById.get(obj.wbsId)
    console.log(obj)
    return
}