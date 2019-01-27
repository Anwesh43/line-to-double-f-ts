const nodes : number = 1
const lines : number = 2
const scGap : number = 0.05
const scDiv : number = 0.51
const strokeFactor : number = 90
const sizeFactor : number = 2.8
const foreColor : string = "#1565C0"
const backColor : string = "#bdbdbd"
const w : number = window.innerWidth
const h : number = window.innerHeight
const gapFactor : number = 1.3
const gapSizeFactor : number = 2

const maxScale : Function = (scale : number, i : number, n : number) : number => {
    return Math.max(0, scale - i / n)
}
const divideScale : Function = (scale : number, i : number, n : number) : number => {
    return Math.min(1/n, maxScale(scale, i, n)) * n
}
const scaleFactor : Function  = (scale : number) => Math.floor(scale / scDiv)
const mirrorValue : Function = (scale : number, a : number, b : number) : number => {
    const k : number = scaleFactor(scale)
    return (1 - k) / a + k / b
}
const updateValue : Function = (scale : number, dir : number, a : number, b : number) : number => {
    return mirrorValue(scale, a, b) * dir * scGap
}

const drawLine : Function = (context : CanvasRenderingContext2D, x1 : number, y1 : number, x2 : number, y2 : number) => {
    context.beginPath()
    context.moveTo(x1, y1)
    context.lineTo(x2, y2)
    context.stroke()
}

const translateTo : Function = (context : CanvasRenderingContext2D, x : number, y : number, cb : Function) => {
    context.save()
    context.translate(x, y)
    cb(context)
    context.restore()
}

const drawF : Function = (context : CanvasRenderingContext2D, size : number, scale : number) => {
    translateTo(context, 0, -size, (ctx : CanvasRenderingContext2D) => {
        drawLine(ctx, 0, 0, 0, 2 * size)
        for (var i = 0; i < lines; i++) {
            drawLine(ctx, 0, i * size, size/2 * (2 - i) * divideScale(scale, i, lines), i * size)
        }
    })
}

const drawLTDNode : Function = (context : CanvasRenderingContext2D, i : number, scale : number) => {
    const gap : number = w / (nodes + 1)
    const size : number = gap / sizeFactor
    const dSize : number = size / gapSizeFactor
    const sc1 : number = divideScale(scale, 0, 2)
    const sc2 : number = divideScale(scale, 1, 2)
    const dgap : number = size / gapFactor
    context.strokeStyle = foreColor
    context.lineWidth = Math.min(w, h) / strokeFactor
    context.lineCap = 'round'
    context.save()
    context.translate(gap * (i + 1), h/2)
    for (var j = 0; j < lines; j++) {
        translateTo(context, dgap - 2 * dgap * sc2 * j, 0, (ctx : CanvasRenderingContext2D) => {
            ctx.rotate(Math.PI * j * (1 - sc2))
            drawF(ctx, dSize, divideScale(sc1, j, lines))
        })
    }
    context.restore()
}

class LineToDoubleFStage {
    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D
    renderer : Renderer = new Renderer()

    initCanvas() {
        this.canvas.width = w
        this.canvas.height = h
        this.context = this.canvas.getContext('2d')
        document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = backColor
        this.context.fillRect(0, 0, w, h)
        this.renderer.render(this.context)
    }

    handleTap() {
        this.canvas.onmousedown = () => {
            this.renderer.handleTap(() => {
                this.render()
            })
        }
    }

    static init() {
        const stage : LineToDoubleFStage = new LineToDoubleFStage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }
}

class State {

    scale : number = 0
    dir : number = 0
    prevScale : number = 0

    update(cb : Function) {
        this.scale += updateValue(this.scale, this.dir, lines, 1)
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir
            this.dir = 0
            this.prevScale = this.scale
            cb(this.prevScale)
        }
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale
            cb()
        }
    }
}

class Animator {
    animated : boolean = false
    interval : number

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true
            this.interval = setInterval(cb, 50)
        }
    }

    stop() {
        if (this.animated) {
            this.animated = false
            clearInterval(this.interval)
        }
    }
}

class LTDNode {

    next : LTDNode
    prev : LTDNode
    state : State = new State()

    constructor(private i : number) {
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < nodes - 1) {
            this.next = new LTDNode(this.i + 1)
            this.next.prev = this
        }
    }

    draw(context : CanvasRenderingContext2D) {
        drawLTDNode(context, this.i, this.state.scale)
        if (this.next) {
            this.next.draw(context)
        }
    }

    update(cb : Function) {
        this.state.update(cb)
    }

    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }

    getNext(dir : number, cb : Function) : LTDNode {
        var curr : LTDNode = this.prev
        if (dir == 1) {
            curr = this.next
        }
        if (curr) {
            return curr
        }
        cb()
        return this
    }
}

class LineToDoubleF {

    root : LTDNode = new LTDNode(0)
    curr : LTDNode = this.root
    dir : number = 1

    draw(context : CanvasRenderingContext2D) {
        this.root.draw(context)
    }

    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () => {
                this.dir *= -1
            })
            cb()
        })
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }
}

class Renderer {
    ltd : LineToDoubleF = new LineToDoubleF()
    animator : Animator = new Animator()

    render(context : CanvasRenderingContext2D) {
        this.ltd.draw(context)
    }

    handleTap(cb : Function) {
        this.ltd.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.ltd.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}
