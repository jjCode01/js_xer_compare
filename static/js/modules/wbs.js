export default class WbsNode {
    #id
    constructor(obj, project) {
        Object.assign(this, obj)
        this.project = project
        this.#id = undefined
    }

    get isProjectNode() {
        return this.proj_node_flag === 'Y'
    }

    get parentNode() {
        if (
            this.project.wbs.has(node.parent_wbs_id) && 
            !this.project.wbs.get(node.parent_wbs_id).isProjectNode
        ) return this.project.wbs.get(node.parent_wbs_id)
    }

    get wbsId() {
        if (this.isProjectNode) return ''
        if (this.#id) return this.#id

        let id = [this.wbs_short_name];
        let node = this;

        while (true) {
            if (!this.project.wbs.has(node.parent_wbs_id) || 
            this.project.wbs.get(node.parent_wbs_id).isProjectNode) break;

            node = this.project.wbs.get(node.parent_wbs_id);
            id.unshift(node.wbs_short_name)
        }
        this.#id = id.join('.')
        return this.#id
    }
}