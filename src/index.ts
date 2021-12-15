import {writeFile} from "fs/promises";

class ElementType {
    toString() {
        return ''
    }
}

class None extends ElementType {
    constructor() {
        super()
    }
}

class Raw extends ElementType {
    private text: string;

    constructor(text: string) {
        super()
        this.text = text
    }

    toString() {
        return this.text;
    }
}

class Insert extends ElementType {
    private text: string;

    constructor(text: string) {
        super()
        this.text = text
    }

    toString() {
        return `{${this.text}}`;
    }
}

class Wire extends ElementType {
    constructor() {
        super()
    }

    toString() {
        return '\\qw'
    }
}

class WireX extends ElementType {
    private dist: number;

    constructor(dist: number) {
        super()
        this.dist = dist
    }

    toString() {
        return `\\qwx[${this.dist}]`
    }
}

class Meter extends ElementType {
    constructor() {
        super()
    }

    toString() {
        return `\\meter`;
    }
}

class Ctrl extends ElementType {
    private dist: number;

    constructor(dist: number) {
        super()
        this.dist = dist
    }

    toString() {
        return `\\ctrl{${this.dist}}`;
    }
}

class Barrier extends ElementType {
    private height: number;

    constructor(height: number) {
        super()
        this.height = height
    }

    toString() {
        return `\\barrier[0em]{${this.height}}`
    }
}

class Hdots extends ElementType {
    constructor() {
        super()
    }

    toString() {
        return '\\push{\\ \\dots \\ } \\qw'
    }
}

class Gate extends ElementType {
    private name: string;

    constructor(name: string) {
        super()
        this.name = name
    }

    toString() {
        return `\\gate{${this.name}}`
    }
}

class HGate extends ElementType {
    constructor() {
        super()
    }

    toString() {
        return `\\gate{H}`
    }
}

class Swap extends ElementType {
    constructor() {
        super()
    }

    toString() {
        return `\\qswap`
    }
}

class Ket extends ElementType {
    private name: string;

    constructor(name: string) {
        super()
        this.name = name
    }

    toString() {
        return `\\ket{${this.name}}`
    }
}

class Lstick extends ElementType {
    private name: string;

    constructor(name: string | ElementType) {
        super()
        this.name = name.toString()
    }

    toString() {
        return `\\lstick{${this.name}}`
    }
}

class Cell {
    public type: ElementType;

    constructor(type: ElementType) {
        this.type = type
    }
}

class Circuit {
    modifiedWidth = 0
    private width: number;
    private height: number;
    private elements: any;
    private separators: any[];
    private labelRow: boolean;
    private colSize: number;
    private rowSize: number;

    constructor(width: number, height: number, labelRow: boolean = false, colSize: number = 0.8, rowSize: number = 0.2) {
        this.width = width
        this.height = height
        this.elements = Array.from({length: height + (labelRow as unknown as number)}, () => Array.from({length: width}, () => new Cell(new Wire())))
        this.separators = Array()
        this.labelRow = labelRow
        this.colSize = colSize
        this.rowSize = rowSize

        if (labelRow) {
            this.elements[0] = Array.from({length: width}, () => new Cell(new None()))
        }
    }

    setElement(x: number, y: number, type: ElementType) {
        this.elements[y+(this.labelRow as unknown as number)][x].type = type
        if (x > this.modifiedWidth) {
            this.modifiedWidth = x
        }
    }

    addElement(x: number, y: number, type: ElementType) {
        this.elements[y+(this.labelRow as unknown as number)][x].type += type
        if (x > this.modifiedWidth) {
            this.modifiedWidth = x
        }
    }

    setControl(x: number, y: number, dist: number) {
        if (y+dist < 0 || y+dist >= this.height) {
            throw new Error('Control out of bounds')
        }
        this.setElement(x, y+dist, new Ctrl(-dist))
    }

    addControl(x: number, y: number, dist: number) {
        if (y+dist < 0 || y+dist >= this.height) {
            throw new Error('Control out of bounds')
        }
        this.addElement(x, y+dist, new Ctrl(-dist))
    }

    setSwap(x: number, y: number, dist: number) {
        if (y+dist < 0 || y+dist >= this.height) {
            throw new Error('Swap out of bounds')
        }
        this.setElement(x, y+dist, new Swap())
        this.setElement(x, y, new Swap())
        this.addElement(x, y, new WireX(dist))
    }

    addLabel(x: number, text: string) {
        if (!this.labelRow) throw new Error('Label row not set')

        if (x < 0) {
            throw new Error('Label out of bounds')
        }

        if (x >= this.width) {
            // this.elements.
            this.elements[0][x] = new Cell(new Raw(text))
        }

        this.elements[0][x].type = new Insert(text)
    }

    addSeparator(x: number, label: string | null = null) {
        // this.addElement(x, 0, new Barrier(this.height-1))
        // if (label != null) this.addLabel(x+1, label)
        this.separators.push({x: x, label: label})
    }

    getElement(x: number, y: number) {
        return this.elements[y+(this.labelRow as unknown as number)][x].type;
    }

    toString() {
        let labelOffset = 0
        for (let separator in this.separators) {
            this.addElement(this.separators[separator].x, 0, new Barrier(this.height-1))
            for (let row = 0; row < this.height; row++) {
                this.addElement(this.separators[separator].x, row, new Raw(' & \\qw'))
            }
            if (this.separators[separator].label != null) this.addLabel(this.separators[separator].x+1+labelOffset, this.separators[separator].label)
            labelOffset++
        }

        let gates = this.elements.map((row: any[]) => row.map(element => element.type.toString()).join(' & ')).join('\\\\\n');
        return `\\Qcircuit @C=${this.colSize}em @R=${this.rowSize}em @!R {\n${gates}\n}`;
    }

    printCircuit() {
        console.log(this.toString());
    }
}

let myCircuit = new Circuit(14, 3, true);

myCircuit.setElement(0, 0, new Lstick(new Ket('0')))
myCircuit.setElement(0, 1, new Lstick(new Ket('0') + '^{\\otimes C}'))
myCircuit.setElement(0, 2, new Lstick(new Ket('b')))
myCircuit.addSeparator(2, '\\psi_1')
myCircuit.addSeparator(5, '\\psi_2')
myCircuit.addElement(1, 1, new Insert('/'))
myCircuit.setElement(2, 1, new Gate('H^{\\otimes C}'))
myCircuit.addElement(1, 2, new Insert('/'))
myCircuit.setElement(2, 2, new Wire())
myCircuit.setElement(3, 2, new Gate('U^{2^{n-1}}'))
myCircuit.setControl(3, 2, -1)
myCircuit.setElement(4, 2, new Hdots())
myCircuit.setElement(5, 2, new Gate('U^{2^{0}}'))
myCircuit.setControl(5, 2, -1)
myCircuit.setElement(6, 1, new Gate('IQFT'))
myCircuit.addSeparator(6, '\\psi_3')
myCircuit.setElement(7, 0, new Gate('RY'))
myCircuit.setControl(7, 0, 1)
myCircuit.addSeparator(7, '\\psi_4')
myCircuit.setElement(8, 1, new Gate('QFT'))
myCircuit.addSeparator(8, '\\psi_5')
myCircuit.setElement(9, 2, new Gate('U^{-2^{n-1}}'))
myCircuit.setControl(9, 2, -1)
myCircuit.setElement(10, 2, new Hdots())
myCircuit.setElement(11, 2, new Gate('U^{-2^{n}}'))
myCircuit.setControl(11, 2, -1)
myCircuit.addSeparator(11, '\\psi_6')
myCircuit.setElement(12, 1, new Gate('H^{\\otimes C}'))
myCircuit.addSeparator(12, '\\psi_7')
myCircuit.setElement(13, 0, new Meter())
myCircuit.setElement(13, 2, new Meter())

let latex = myCircuit.toString()

writeFile("test.tex", latex)
    .then(() => {
    console.log("File written successfully!");
}).catch((error) => {
    console.log("Error writing file: ", error);
});