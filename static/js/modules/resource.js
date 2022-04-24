export default class Resource {
    constructor(obj, rsrc, task, account) {
        Object.assign(this, obj)
        this.rsrc = rsrc
        this.task = task;
        this.account = account
    }
    get actualCost() {return this.act_reg_cost + this.act_ot_cost}
    get atCompletionCost() {return this.actualCost + this.remain_cost}
    get earnedValue() {return this.task.percent * this.target_cost}
    get name() {return this?.rsrc?.rsrc_short_name ?? "unknown"}
    get resId() {return `${this.task.task_code}|${this.name}|${this.account?.acct_short_name ?? ""}`}
}