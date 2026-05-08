import { PIECES, rotateCW, flipH } from "./pieces.js";
import { createBoard, canPlace, placePiece, isSolved } from "./board.js";
import { GRID_ROWS } from "./grid.js";

function genOrientations(shape) {
    const seen = new Set();
    const result = [];
    let cur = shape;
    for (let f = 0; f < 2; f++) {
        for (let r = 0; r < 4; r++) {
            const key = JSON.stringify(cur);
            if (!seen.has(key)) {
                seen.add(key);
                result.push(cur);
            }
            cur = rotateCW(cur);
        }
        cur = flipH(cur);
    }
    return result;
}

function hashDate(today) {
    const s = today.month + today.day;
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h >>> 0;
}

function mulberry32(seed) {
    return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function seededShuffle(arr, seed) {
    const rng = mulberry32(seed);
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

export function solve(today) {
    // Build initial board with today's 3 cells blocked
    let initial = createBoard();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 7; c++) {
            const cell = GRID_ROWS[r][c];
            if (cell === today.month || cell === today.day || cell === today.weekday) {
                initial[r][c] = "__today__";
            }
        }
    }

    const seed = hashDate(today);
    const pieces = seededShuffle(PIECES, seed).map(p => ({
        id: p.id,
        orientations: genOrientations(p.shape),
    }));

    function backtrack(board, remaining, solution) {
        if (remaining.length === 0) return isSolved(board, today) ? solution : null;

        // First empty non-disabled, non-blocked cell
        let tr = -1, tc = -1;
        outer: for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 7; c++) {
                if (GRID_ROWS[r][c] === null) continue;
                if (board[r][c] !== null) continue;
                tr = r;
                tc = c;
                break outer;
            }
        }
        if (tr === -1) return null;

        for (let pi = 0; pi < remaining.length; pi++) {
            const {id, orientations} = remaining[pi];
            const rest = [...remaining.slice(0, pi), ...remaining.slice(pi + 1)];
            for (const shape of orientations) {
                for (let dr = 0; dr < shape.length; dr++) {
                    for (let dc = 0; dc < shape[dr].length; dc++) {
                        if (!shape[dr][dc]) continue;
                        const row = tr - dr, col = tc - dc;
                        if (!canPlace(shape, row, col, board)) continue;
                        const result = backtrack(
                            placePiece(shape, row, col, board, id),
                            rest,
                            [...solution, {id, shape, row, col}],
                        );
                        if (result) return result;
                    }
                }
            }
        }
        return null;
    }

    return backtrack(initial, pieces, []);
}
