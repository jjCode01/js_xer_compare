const parseHtmltoString = data => {
    const parser = new DOMParser()
    let memoStr = data.replace(/<BR>/g, '\n')
    memoStr = memoStr.replace(/(\x7F)+/g, '')
    return parser.parseFromString(memoStr, 'text/html')
}

const getPTagMemos = (el) => {
    const pMems = el.getElementsByTagName('p')
    if (!pMems.length) return
    return Array.from(pMems).map(m => m.innerText).join('\n').trim()
}

const getBodyTagMemos = (el) => {
    const bodyMems = el.getElementsByTagName('body')
    if (!bodyMems.length) return
    return Array.from(bodyMems).map(m => m.innerText).join('\n').trim()
}

export default class Memo {
    constructor(obj, task, noteBook) {
        Object.assign(this, obj)
        this.task = task
        this.noteBook = noteBook
        const memoHTML = parseHtmltoString(this.task_memo)
        this.note = getPTagMemos(memoHTML) ?? getBodyTagMemos(memoHTML)
        this.id = `${this.task.task_code}|${this.noteBook.memo_type}`
    }
    print() {
        console.log(this.noteBook.memo_type)
        console.log(this.note)
    }
}