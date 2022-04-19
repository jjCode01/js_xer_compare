const linkTypes = {
    PR_FS: 'FS',
    PR_FF: 'FF',
    PR_SF: 'SF',
    PR_SS: 'SS'
}

export default class Relationship {
    constructor(obj, predTask, succTask) {
        Object.assign(this, obj)
        this.predTask = predTask;
        this.succTask = succTask;
    }
    get lag() {
        return this.lag_hr_cnt / 8
    }
    get link() {
        return this.pred_type.slice(-2)
    }
    get logicId() {
        return `${this.predTask.task_code}|${this.succTask.task_code}|${this.link}`;
    }
}