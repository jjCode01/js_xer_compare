import Change from "./change.js"

export let wbsChanges = {
    added: new Change(
        "wbs-added", "Added WBS Node",
        ['WBS ID', 'WBS Name',],
        function() {
            return this.data.map(wbs => [wbs.wbsId, wbs.wbs_name,])
        }
    ),
    deleted: new Change(
        "wbs-deleted", "Deleted WBS Node",
        ['WBS ID', 'WBS Name',],
        function() {
            return this.data.map(wbs => [wbs.wbsId, wbs.wbs_name,])
        }
    ),
    revised: new Change(
        "wbs-revised", "Revised WBS Name",
        ['WBS ID', 'New WBS Name', 'Old WBS Name'],
        function() {
            return this.data.map(wbs => [wbs.wbsId, wbs.wbs_name, projects.previous.get(wbs).wbs_name])
        }
    ),
}