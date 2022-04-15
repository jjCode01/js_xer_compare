const parseMemo = memo => {
    //let memoStr = memo.replace(/+/g, '') // remove special character
    let memoStr = memo.replace(/\u007F+/g, '') // remove special character

    memoStr = memoStr.replace(/(?<!(<\/LI>|<[OU]L>)\s*)<LI>/g, '\n\u2022 ')  // check for list items that are not closed
    memoStr = memoStr.replace(/(<BR>|<\/P>|<\/LI>)/g, '\n')
    memoStr = memoStr.replace(/<LI>\s*/g, '\u2022 ')
    memoStr = memoStr.replace(/<!*\/*[A-Z]+.*?>/g, '')
    memoStr = memoStr.replace(/^[^\S\r\n]+(?=\S)/gm, '') // trim leading spaces
    return memoStr
}

export default class Memo {
    constructor(obj, task, noteBook) {
        Object.assign(this, obj)
        this.task = task
        this.noteBook = noteBook
        this.note = parseMemo(this.task_memo)
        this.id = `${this.task.task_code}|${this.noteBook.memo_type}`
    }
    get toArray() {
        return Array.from(this.note.split(/\n/g))
    }
    * iterNote() {
        const arr = this.toArray
        if (arr.length){
            let i = 0
            while (i < arr.length) {
                yield arr[i];
                i++;
            }
        }
    }
    print() {
        console.log(this.noteBook.memo_type)
        console.log(this.note)
    }
}