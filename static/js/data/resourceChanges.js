import Change from "./change.js"
import { formatNumber, formatCost, formatVariance } from "../utilities.js"

const cols = ['Act ID', '', 'Activity Name', 'Resource']
const row = res => [res.task.task_code, res.task.img, res.task.task_name, res.rsrc.rsrc_short_name,]

export let resourceChanges = {
    added: new Change(
        "rs-added", "Added Resources",
        [...cols, 'Qty', 'Cost'],
        function() {
            return this.data.map(res => [...row(res), formatNumber(res.target_qty), formatCost(res.target_cost)])
        }
    ),
    deleted: new Change(
        "rs-deleted", "Deleted Resources",
        [...cols, 'Qty', 'Cost'],
        function() {
            return this.data.map(res => [...row(res), formatNumber(res.target_qty), formatCost(res.target_cost)])
        }
    ),
    revisedCost: new Change(
        "rs-cost", "Revised Resource Budgeted Cost",
         [...cols, 'New Cost', 'Old Cost', 'Var'],
        function() {
            return this.data.map(res => {
                const prevCost = projects.previous.get(res).target_cost;
                return [...row(res), formatCost(res.target_cost), formatCost(prevCost), formatCost(res.target_cost - prevCost)]
            })
        }
    ),
    revisedUnits: new Change(
        "rs-units", "Revised Resource Budgeted Quantity",
        [...cols, 'New Qty', 'Old Qty', 'Var'],
        function() {
            return this.data.map(res => {
                const prevQty = projects.previous.get(res).target_qty;
                return [...row(res), formatNumber(res.target_qty), formatNumber(prevQty), formatVariance(res.target_qty - prevQty)]
            })
        }
    ),
}