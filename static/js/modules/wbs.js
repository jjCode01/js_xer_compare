export default class WbsNode {
    constructor(obj) {
        Object.assign(this, obj)
        this.path = undefined
        this.parent = undefined
    }

    get isProjectNode() {
        return this.proj_node_flag === 'Y'
    }

    get wbsId() {
        if (!this.path) return ""
        return this.path.join('.')
    }
}