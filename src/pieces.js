import { GRID_GAP } from "./board.js";

export const PIECES = [
    {
        id: "I", shape: [
            [1, 1, 1, 1],
        ]
    },
    {
        id: "U", shape: [
            [1, 0, 1],
            [1, 1, 1],
        ]
    },
    {
        id: "P", shape: [
            [1, 0],
            [1, 1],
            [1, 1],
        ]
    },
    {
        id: "L", shape: [
            [1, 0, 0],
            [1, 0, 0],
            [1, 1, 1],
        ]
    },
    {
        id: "S5", shape: [
            [0, 1, 1],
            [0, 1, 0],
            [1, 1, 0],
        ]
    },
    {
        id: "S4", shape: [
            [1, 1, 0],
            [0, 1, 1],
        ]
    },
    {
        id: "Y", shape: [
            [0, 1],
            [1, 1],
            [1, 0],
            [1, 0],
        ]
    },
    {
        id: "T", shape: [
            [1, 1, 1],
            [0, 1, 0],
            [0, 1, 0],
        ]
    },
    {
        id: "J4", shape: [
            [1, 1],
            [0, 1],
            [0, 1],
        ]
    },
    {
        id: "J5", shape: [
            [1, 1],
            [0, 1],
            [0, 1],
            [0, 1],
        ]
    },
];

// === Shape transforms ===

export function rotateCW(shape) {
    const R = shape.length, C = shape[0].length;
    return Array.from({length: C}, (_, c) =>
        Array.from({length: R}, (_, r) => shape[R - 1 - r][c])
    );
}

export function rotateCCW(shape) {
    const R = shape.length, C = shape[0].length;
    return Array.from({length: C}, (_, c) =>
        Array.from({length: R}, (_, r) => shape[r][C - 1 - c])
    );
}

export function flipH(shape) {
    return shape.map(row => [...row].reverse());
}

// === Element builder / updater ===

// Returns an SVG path string tracing every edge between a filled cell and empty space
function buildPerimeterPath(shape, step) {
    const segs = [];
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            const x = c * step, y = r * step;
            if (r === 0 || !shape[r - 1][c]) segs.push(`M${x},${y}H${x + step}`);
            if (r === shape.length - 1 || !shape[r + 1]?.[c]) segs.push(`M${x},${y + step}H${x + step}`);
            if (c === 0 || !shape[r][c - 1]) segs.push(`M${x},${y}V${y + step}`);
            if (c === shape[r].length - 1 || !shape[r][c + 1]) segs.push(`M${x + step},${y}V${y + step}`);
        }
    }
    return segs.join(" ");
}

// Update an existing piece element with unit cells and SVG border
export function updatePieceEl(el, shape, cellSize) {
    const cols = shape[0].length;
    const rows = shape.length;
    const step = cellSize + GRID_GAP;

    el.style.setProperty("--cols", cols);
    el.style.width = `${cols * step}px`;
    el.style.height = `${rows * step}px`;
    el.innerHTML = "";

    for (const row of shape) {
        for (const v of row) {
            const pc = document.createElement("div");
            pc.className = v ? "pc" : "pc empty";
            el.appendChild(pc);
        }
    }

    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", cols * step);
    svg.setAttribute("height", rows * step);
    svg.setAttribute("viewBox", `0 0 ${cols * step} ${rows * step}`);
    svg.setAttribute("overflow", "visible");
    svg.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;overflow:visible";
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", buildPerimeterPath(shape, step));
    path.setAttribute("stroke", "#000");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-linecap", "square");
    svg.appendChild(path);
    el.appendChild(svg);
}

export function buildPieceEl(piece, cellSize) {
    const el = document.createElement("div");
    el.className = "piece";
    el.dataset.pieceId = piece.id;
    el.style.position = "absolute";
    updatePieceEl(el, piece.shape, cellSize);
    return el;
}
