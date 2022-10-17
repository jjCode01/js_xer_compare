export default class WbsNode {
    constructor(obj) {
        Object.assign(this, obj)
        // this.project = project
        this.path = undefined
        this.parent = undefined
    }

    get isProjectNode() {
        return this.proj_node_flag === 'Y'
    }

    // get parentNode() {
    //     if (
    //         this.project.wbs.has(node.parent_wbs_id) && 
    //         !this.project.wbs.get(node.parent_wbs_id).isProjectNode
    //     ) return this.project.wbs.get(node.parent_wbs_id)
    // }

    get wbsId() {
        if (!this.path) return ""
        return this.path.join('.')
        // if (this.isProjectNode) return ''
        // if (this.#id) return this.#id

        // let id = [this.wbs_short_name];
        // let node = this;


        // while (true) {
            // if (this.project.wbs.get(node.parent_wbs_id).isProjectNode) {
            //     break;
            // }

            // if (!this.project.wbs.get(node.parent_wbs_id)) {
            //     console.log(node)
            // }

        //     node = this.project.wbs.get(node.parent_wbs_id);
        //     if (!node) break
        //     if (node.isProjectNode) break
        //     id.unshift(node.wbs_short_name)
        // }
        // console.log(this.wbs_name, id.join('.'))
        // this.#id = id.join('.')
        // return this.#id
    }
}