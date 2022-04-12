import { FLOAT } from "../main.js"
import {budgetedCost, actualCost, thisPeriodCost, remainingCost, budgetedQty, actualQty, thisPeriodQty, remainingQty} from "../utilities.js"

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
    
        this.notStarted = tasks.filter(task => task.notStarted)
        this.inProgress = tasks.filter(task => task.inProgress)
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