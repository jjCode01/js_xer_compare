import Change from "./change.js";

let cols = ['Act ID', 'Act Name', 'Notebook', 'Memo']
let row = memo => [memo.task.task_code, memo.task.task_name, memo.noteBook.memo_type, memo.note]

export let noteBookChanges = {
    added: new Change(
        "nb-added", "Added Notebook Memos", cols,
        function() {
            return this.data.map(memo => row(memo))
        }
    ),
    deleted: new Change(
        "nb-deleted", "Deleted Notebook Memos", cols,
        function() {
            return this.data.map(memo => row(memo))
        }
    ),
    revised: new Change(
        "nb-revised", "Revised Notebook Memos",
        [...cols, 'Old Memo'],
        function() {
            return this.data.map((memo, i) => [
                ...row(memo), this.prev[i].note
            ])
        }
    ),
}
