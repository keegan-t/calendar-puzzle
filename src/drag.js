import { PIECES, buildPieceEl, updatePieceEl, rotateCW, rotateCCW, flipH } from "./pieces.js";
import {
    GRID_GAP,
    getGridMetrics, cellToPos, posToCell,
    createBoard, canPlace, placePiece, liftPiece, isSolved,
} from "./board.js";
import { solve } from "./solver.js";

// === Module state ===
let board = createBoard();
let pieceMap = {}; // id: { piece, shape, el, onGrid, gridRow, gridCol, homeX, homeY }
let activeDrag = false;
let lastPieceId = null; // target for rotate / flip when not dragging
let todayRef = null;
let onSolvedCb = null;
let hintSolution = null; // [{id, shape, row, col}, ...] from solver
let hintsUsed = 0;
let hintIndex = 0; // next solution index to consider for hinting
let zCounter = 0; // keeping last touched piece above others
let onLoadedCb = null;
let lastMetrics = null;

// === localStorage Persistence ===

function dateKey() {
    return `cal-puz:${todayRef.month}-${todayRef.day}`;
}

function saveState() {
    if (!todayRef) return;
    const data = {};
    for (const id in pieceMap) {
        const s = pieceMap[id];
        data[id] = {shape: s.shape, onGrid: s.onGrid, gridRow: s.gridRow, gridCol: s.gridCol};
    }
    data.__hints__ = {used: hintsUsed, index: hintIndex};
    try {
        localStorage.setItem(dateKey(), JSON.stringify(data));
    } catch (_) {
    }
}

function loadSavedState(metrics) {
    if (!todayRef) return false;
    let saved;
    try {
        const raw = localStorage.getItem(dateKey());
        if (!raw) return false;
        saved = JSON.parse(raw);
    } catch (_) {
        return false;
    }

    if (saved.__hints__) {
        hintsUsed = saved.__hints__.used ?? 0;
        hintIndex = saved.__hints__.index ?? 0;
    }

    for (const id in saved) {
        if (id === "__hints__") continue;
        const s = pieceMap[id];
        if (!s) continue;
        const sv = saved[id];
        s.shape = sv.shape;
        updatePieceEl(s.el, s.shape, metrics.cellSize);
        if (sv.onGrid && sv.gridRow !== null) {
            if (canPlace(s.shape, sv.gridRow, sv.gridCol, board)) {
                board = placePiece(s.shape, sv.gridRow, sv.gridCol, board, id);
                s.onGrid = true;
                s.gridRow = sv.gridRow;
                s.gridCol = sv.gridCol;
                s.el.style.zIndex = "1";
                const pos = cellToPos(sv.gridRow, sv.gridCol, metrics);
                s.el.style.left = `${pos.x}px`;
                s.el.style.top = `${pos.y}px`;
            }
        }
    }
    return isSolved(board, todayRef);
}

// === Public API ===

export function updateToday(newToday) {
    todayRef = newToday;
    resetBoard(false);
    const m = getGridMetrics();
    const solved = loadSavedState(m);
    lastMetrics = m;
    setTimeout(() => {
        hintSolution = solve(todayRef);
    }, 0);
    if (solved) {
        document.getElementById("win-badge").classList.add("visible");
        onLoadedCb?.();
    }
}

export function initGame(today, onSolved, onLoaded) {
    todayRef = today;
    onSolvedCb = onSolved;
    onLoadedCb = onLoaded;

    requestAnimationFrame(() => {
        const metrics = getGridMetrics();
        const positions = scatter(PIECES, metrics);
        const gameArea = document.getElementById("game-area");

        PIECES.forEach((piece, i) => {
            const {x, y} = positions[i];
            const el = buildPieceEl(piece, metrics.cellSize);
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            gameArea.appendChild(el);

            pieceMap[piece.id] = {
                piece,
                shape: piece.shape,
                el,
                onGrid: false,
                gridRow: null,
                gridCol: null,
                homeX: x,
                homeY: y,
            };
        });

        const solved = loadSavedState(metrics);
        lastMetrics = metrics;
        setTimeout(() => {
            hintSolution = solve(todayRef);
        }, 0);
        if (solved) document.getElementById("win-badge").classList.add("visible");
        onLoadedCb?.();
        gameArea.addEventListener("pointerdown", handleDown);

        window.addEventListener("resize", relayout);
    });
}

export function resetBoard(persist = true) {
    board = createBoard();
    const m = getGridMetrics();
    for (const id in pieceMap) {
        const s = pieceMap[id];
        s.shape = s.piece.shape;
        s.onGrid = false;
        s.gridRow = null;
        s.gridCol = null;
        s.el.style.left = `${s.homeX}px`;
        s.el.style.top = `${s.homeY}px`;
        s.el.style.zIndex = "";
        s.el.classList.remove("dragging");
        updatePieceEl(s.el, s.shape, m.cellSize);
    }
    lastMetrics = m;
    clearPreview();
    document.getElementById("win-badge").classList.remove("visible");
    hintsUsed = 0;
    hintIndex = 0;
    zCounter = 0;
    if (persist) saveState();
}

export function rotateLast() {
    if (activeDrag || !lastPieceId) return;
    applyTransform(lastPieceId, rotateCW, "anim-rotate");
}

export function rotateLastCCW() {
    if (activeDrag || !lastPieceId) return;
    applyTransform(lastPieceId, rotateCCW, "anim-rotate-ccw");
}

export function flipLast() {
    if (activeDrag || !lastPieceId) return;
    applyTransform(lastPieceId, flipH, "anim-flip");
}

export function getHintsLeft() {
    return Math.max(0, 3 - hintsUsed);
}

export function isBoardSolved() {
    return todayRef ? isSolved(board, todayRef) : false;
}

export function triggerHint() {
    if (!hintSolution || hintsUsed >= 3) return {placed: false, hintsLeft: 0};

    const m = getGridMetrics();

    while (hintIndex < hintSolution.length) {
        const h = hintSolution[hintIndex];
        hintIndex++;
        const s = pieceMap[h.id];
        if (!s) continue;

        // Skip if already correctly placed by the user
        if (
            s.onGrid &&
            s.gridRow === h.row &&
            s.gridCol === h.col &&
            JSON.stringify(s.shape) === JSON.stringify(h.shape)
        ) continue;

        // Lift from board if placed elsewhere
        if (s.onGrid) {
            board = liftPiece(h.id, board);
            s.onGrid = false;
            s.gridRow = null;
            s.gridCol = null;
        }

        // Place at hint position
        s.shape = h.shape;
        updatePieceEl(s.el, s.shape, m.cellSize);
        board = placePiece(s.shape, h.row, h.col, board, h.id);
        s.onGrid = true;
        s.gridRow = h.row;
        s.gridCol = h.col;
        const pos = cellToPos(h.row, h.col, m);
        s.el.style.left = `${pos.x}px`;
        s.el.style.top = `${pos.y}px`;
        s.el.style.zIndex = String(++zCounter);

        hintsUsed++;
        saveState();
        if (isSolved(board, todayRef)) onSolvedCb?.();
        return {placed: true, hintsLeft: 3 - hintsUsed};
    }

    return {placed: false, hintsLeft: 3 - hintsUsed};
}

// === Transform helper ===

function applyTransform(id, fn, animClass) {
    const s = pieceMap[id];
    if (!s) return;
    const m = getGridMetrics();

    if (s.onGrid) {
        board = liftPiece(id, board);
        s.onGrid = false;
        s.gridRow = null;
        s.gridCol = null;
    }

    // Pin the visual center before the rebuild
    const oldLeft = parseFloat(s.el.style.left) || 0;
    const oldTop = parseFloat(s.el.style.top) || 0;
    const oldW = parseFloat(s.el.style.width);
    const oldH = parseFloat(s.el.style.height);
    const cx = oldLeft + oldW / 2;
    const cy = oldTop + oldH / 2;

    s.shape = fn(s.shape);
    updatePieceEl(s.el, s.shape, m.cellSize);

    // Reposition so the center stays at the same screen point
    const newW = parseFloat(s.el.style.width);
    const newH = parseFloat(s.el.style.height);
    s.el.style.left = `${cx - newW / 2}px`;
    s.el.style.top = `${cy - newH / 2}px`;

    // Trigger animation on the element
    s.el.classList.remove("anim-rotate", "anim-rotate-ccw", "anim-flip");
    void s.el.offsetWidth; // force reflow so rapid presses restart the animation
    s.el.classList.add(animClass);
    s.el.addEventListener("animationend", () => s.el.classList.remove(animClass), {once: true});
    saveState();
}

// === Relayout on resize ===

function relayout() {
    if (activeDrag || !lastMetrics) return;
    const newM = getGridMetrics();
    const ratioX = newM.gameW / lastMetrics.gameW;
    const ratioY = newM.gameH / lastMetrics.gameH;

    for (const id in pieceMap) {
        const s = pieceMap[id];
        updatePieceEl(s.el, s.shape, newM.cellSize);
        if (s.onGrid) {
            const pos = cellToPos(s.gridRow, s.gridCol, newM);
            s.el.style.left = `${pos.x}px`;
            s.el.style.top = `${pos.y}px`;
        } else {
            const newX = parseFloat(s.el.style.left) * ratioX;
            const newY = parseFloat(s.el.style.top) * ratioY;
            s.el.style.left = `${newX}px`;
            s.el.style.top = `${newY}px`;
            s.homeX *= ratioX;
            s.homeY *= ratioY;
        }
    }
    lastMetrics = newM;
}

// === Drag handler ===

function handleDown(e) {
    if (activeDrag) return;
    const el = e.target.closest("[data-piece-id]");
    if (!el) return;
    e.preventDefault();

    activeDrag = true;
    const id = el.dataset.pieceId;
    lastPieceId = id;
    const s = pieceMap[id];

    const gameArea = document.getElementById("game-area");
    const elRect = el.getBoundingClientRect();
    const offsetX = e.clientX - elRect.left;
    const offsetY = e.clientY - elRect.top;

    // Lift off board if it was placed
    if (s.onGrid) {
        board = liftPiece(id, board);
        s.onGrid = false;
        s.gridRow = null;
        s.gridCol = null;
    }

    const pieceZ = ++zCounter;
    el.classList.add("dragging");
    el.style.zIndex = "10000";
    el.setPointerCapture(e.pointerId);

    // Track current snap target across move events
    let snapRow = null, snapCol = null, snapValid = false;

    function move(e) {
        const rect = gameArea.getBoundingClientRect();
        const x = e.clientX - rect.left - offsetX;
        const y = e.clientY - rect.top - offsetY;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;

        const m = getGridMetrics();
        const pos = posToCell(x, y, m);
        const valid = canPlace(s.shape, pos.row, pos.col, board);

        snapRow = pos.row;
        snapCol = pos.col;
        snapValid = valid;
        clearPreview();
        showPreview(s.shape, pos.row, pos.col, valid);
    }

    function up() {
        cleanup();
        clearPreview();

        // Snap to grid whenever any cell overlaps the board
        if (snapRow !== null && isNearGrid(s.shape, snapRow, snapCol)) {
            const m = getGridMetrics();
            const pos = cellToPos(snapRow, snapCol, m);
            el.style.left = `${pos.x}px`;
            el.style.top = `${pos.y}px`;

            if (snapValid) {
                board = placePiece(s.shape, snapRow, snapCol, board, id);
                s.onGrid = true;
                s.gridRow = snapRow;
                s.gridCol = snapCol;
                if (isSolved(board, todayRef)) onSolvedCb?.();
            }
            el.style.zIndex = String(pieceZ);
        } else {
            // Clamp to game area bounds
            const curX = parseFloat(el.style.left);
            const curY = parseFloat(el.style.top);
            el.style.left = `${Math.max(0, Math.min(gameArea.clientWidth - el.offsetWidth, curX))}px`;
            el.style.top = `${Math.max(0, Math.min(gameArea.clientHeight - el.offsetHeight, curY))}px`;
            el.style.zIndex = String(pieceZ);
        }
        saveState();
    }

    function cancel() {
        cleanup();
        clearPreview();
        const curX = parseFloat(el.style.left);
        const curY = parseFloat(el.style.top);
        el.style.left = `${Math.max(0, Math.min(gameArea.clientWidth - el.offsetWidth, curX))}px`;
        el.style.top = `${Math.max(0, Math.min(gameArea.clientHeight - el.offsetHeight, curY))}px`;
        el.style.zIndex = String(pieceZ);
    }

    function cleanup() {
        el.classList.remove("dragging");
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", cancel);
        activeDrag = false;
    }

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
}

// === Near-grid check ===
// Returns true if at least one cell of a shape falls inside the board

function isNearGrid(shape, row, col) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            const gr = row + r, gc = col + c;
            if (gr >= 0 && gr < 8 && gc >= 0 && gc < 7) return true;
        }
    }
    return false;
}

// === Snap preview ===

function showPreview(shape, row, col, valid) {
    const cells = document.getElementById("puzzle-grid").children;
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            const gr = row + r, gc = col + c;
            if (gr < 0 || gr >= 8 || gc < 0 || gc >= 7) continue;
            const cell = cells[gr * 7 + gc];
            if (!cell || cell.classList.contains("disabled") || cell.classList.contains("today")) continue;
            cell.classList.add(valid ? "preview-valid" : "preview-invalid");
        }
    }
}

function clearPreview() {
    for (const cell of document.getElementById("puzzle-grid").children) {
        cell.classList.remove("preview-valid", "preview-invalid");
    }
}

// === Scatter ===
// Desktop: exactly 5 pieces per side, randomly placed
// Mobile (<=768px): all pieces scattered below the grid

function scatter(pieces, metrics) {
    const {gridX, gridY, gridW, gridH, cellSize, gameW, gameH} = metrics;
    const M = 24;
    const excL = gridX - M;
    const excR = gridX + gridW + M;

    const isMobile = gameW <= 768;

    const sides = isMobile
        ? pieces.map(() => "B")
        : shuffleArr([...Array(5).fill("L"), ...Array(5).fill("R")]);

    const placed = [];

    return pieces.map((piece, i) => {
        const cols = piece.shape[0].length;
        const rows = piece.shape.length;
        const pw = cols * (cellSize + GRID_GAP);
        const ph = rows * (cellSize + GRID_GAP);
        const side = sides[i];

        let x = M, y = M;

        for (let attempt = 0; attempt < 120; attempt++) {
            if (side === "B") {
                const topY = gridY + gridH + M;
                x = M + Math.random() * Math.max(1, gameW - pw - M * 2);
                y = topY + Math.random() * Math.max(1, gameH - topY - ph - M);
            } else if (side === "L") {
                x = M + Math.random() * Math.max(1, excL - pw - M * 2);
                y = M + Math.random() * Math.max(1, gameH - ph - M * 2);
            } else {
                x = excR + M + Math.random() * Math.max(1, gameW - excR - pw - M * 2);
                y = M + Math.random() * Math.max(1, gameH - ph - M * 2);
            }

            const fits = placed.every(p =>
                x + pw + M <= p.x || x >= p.x + p.pw + M ||
                y + ph + M <= p.y || y >= p.y + p.ph + M
            );
            if (fits) break;
        }

        placed.push({x, y, pw, ph});
        return {x, y};
    });
}

function shuffleArr(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
