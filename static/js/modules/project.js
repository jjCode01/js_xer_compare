import { FLOAT } from "../main.js"
import {budgetedCost, actualCost, thisPeriodCost, remainingCost, budgetedQty, actualQty, thisPeriodQty, remainingQty} from "../utilities.js"
import Memo from "./memo.js"
import Relationship from "./relationship.js"
import Resource from "./resource.js"
import Task from "./task.js"

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
    #tasksByCode
    constructor(obj) {
        Object.assign(this, obj)
        this.tasks = new Map();
        this.#tasksByCode = new Map()
        this.rels = [];
        this.relsById = new Map();
        this.resources = [];
        this.resById = new Map();
        this.notes = new Map();
        this.start = this.last_recalc_date;
        this.lateEnd = this.scd_end_date;
        this.wbs = new Map();
        this.name = '';
    }
  
    /**
     * @param { Task } task
     */
    set addTask(task) {
        if (task instanceof Task){
            this.tasks.set(task.task_id, task)
            this.#tasksByCode.set(task.task_code, task)
        }
    }

    set addWbs(wbs) {
        this.wbs.set(wbs.wbs_id, wbs)
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

    get notStarted() {
        return Array.from(this.tasks.values()).filter(task => task.notStarted)
    }

    get inProgress() {
        return Array.from(this.tasks.values()).filter(task => task.inProgress)
    }

    getTask(task) {
        if (task instanceof Task) return this.#tasksByCode.get(task.task_code)
        if (task instanceof String) return this.#tasksByCode.get(task)
        return
    }

    hasTask(task) {
        if (task instanceof Task) return this.#tasksByCode.has(task.task_code)
        if (task instanceof String) return this.#tasksByCode.has(task)
    }

    deepAnalysis() {
        const tasks = [...this.tasks.values()]
        this.months = getMonthIntervalObj(this);    
        const getMonthID = date => `${MONTHNAMES[date.getMonth()]}-${date.getFullYear()}`
    
        tasks.forEach(task => {
            const startMonth = getMonthID(task.start)
            const finishMonth = getMonthID(task.finish)
            if (!task.completed) this.months[finishMonth].earlyFinish += 1;
            if (!task.notStarted) this.months[startMonth].actualStart += 1;
            if (task.notStarted) this.months[startMonth].earlyStart += 1;
            if (task.completed) this.months[finishMonth].actualFinish += 1;
        })
    
        this.completed = tasks.filter(task => task.completed)
        this.open = tasks.filter(task => !task.completed)
        this.milestones = tasks.filter(task => task.isMilestone)
        this.longestPath = tasks.filter(task => task.longestPath && !task.completed)
        this.critical = tasks.filter(task => task.totalFloat <= FLOAT.critical)
        this.nearCritical = tasks.filter(task => task.totalFloat > FLOAT.critical && task.totalFloat <= FLOAT.nearCritical)
        this.normalFloat = tasks.filter(task => task.totalFloat > FLOAT.nearCritical && task.totalFloat < FLOAT.high)
        this.highFloat = tasks.filter(task => task.totalFloat >= FLOAT.high)
    
        this.scheduleDuration = (this.scd_end_date.getTime() - this.start.getTime()) / (1000 * 3600 * 24)
        this.remScheduleDuration = (this.scd_end_date.getTime() - this.last_recalc_date.getTime()) / (1000 * 3600 * 24)
    
        this.origDurSum = [...this.tasks.values()].reduce((od, task) => od += task.origDur, 0)
        this.remDurSum = [...this.tasks.values()].reduce((rd, task) => rd += task.remDur, 0)
    
        const actDateTerm = (this.inProgress.length / 2 + this.completed.length) / this.tasks.size
        const durTerm = (1 - this.remDurSum / this.origDurSum)
        this.physPercentComp = (actDateTerm + durTerm) / 2
        this.schedPercentComp = 1 - this.remScheduleDuration / this.scheduleDuration
    
        this.budgetCost = budgetedCost(this)
        this.actualCost = actualCost(this)
        this.thisPeriodCost = thisPeriodCost(this)
        this.remainingCost = remainingCost(this)
        this.budgetQty = budgetedQty(this)
        this.actualQty = actualQty(this)
        this.thisPeriodQty = thisPeriodQty(this)
        this.remainingQty = remainingQty(this)
    }
    
}