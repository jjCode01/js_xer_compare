import Change from "./change.js"
import { projects } from "../main.js"

const cols = ['Pred ID', '', 'Predecessor Name', 'Succ ID', '', 'Successor Name']
const row = rel => [
    rel.predTask.task_code, rel.predTask.img, rel.predTask.task_name,
    rel.succTask.task_code, rel.succTask.img, rel.succTask.task_name
]

export let logicChanges = {
    added: new Change(
        "rl-added", "Added Relationships",
        [...cols, 'Link', 'Lag'],
        function() {
            return this.data.map(rel => [...row(rel), rel.link, rel.lag])
        }
    ),
    deleted: new Change(
        "rl-deleted", "Deleted Relationships",
        [...cols, 'Link', 'Lag'],
        function() {
            return this.data.map(rel => [
                rel.predTask.task_code, statusImg(projects.current.get(rel.predTask)), rel.predTask.task_name, 
                rel.succTask.task_code, statusImg(projects.current.get(rel.succTask)), rel.succTask.task_name, rel.link, rel.lag 
            ])
        }
    ),
    revised: new Change(
        "rl-revised", "Revised Relationships",
        [...cols, 'New\r\nLink:Lag', 'Old\r\nLink:Lag'],
        function() {
            return this.data.map((rel, i) => {
                return [...row(rel), `${rel.link}:${rel.lag}`, `${this.prev[i].link}:${this.prev[i].lag}`]
            })
        }
    ),
}

const statusImg = task => {
    if (!task) {
        let img = new Image(20, 10);
	    img.src = "./static/img/deleted.png";
        return img;
    }
    return task.img
}