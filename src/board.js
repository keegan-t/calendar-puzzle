import { GRID_ROWS } from "./grid.js";

export const GRID_GAP = 1;
export const GRID_PAD = 8;

// Live measurements from the rendered DOM
export function getGridMetrics() {
    const gameArea = document.getElementById("game-area");
    const grid = document.getElementById("puzzle-grid");
    const gameRect = gameArea.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();

    const firstCell = grid.querySelector(".puz-cell:not(.disabled)");
    const cellSize = firstCell.getBoundingClientRect().width;

    return {
        gridX: gridRect.left - gameRect.left,
        gridY: gridRect.top - gameRect.top,
        gridW: gridRect.width,
        gridH: gridRect.height,
        cellSize,
        gameW: gameArea.clientWidth,
        gameH: gameArea.clientHeight,
    };
}

// Game area pixel position of grid cell (row, col)
export function cellToPos(row, col, m) {
    return {
        x: m.gridX + GRID_PAD + col * (m.cellSize + GRID_GAP),
        y: m.gridY + GRID_PAD + row * (m.cellSize + GRID_GAP),
    };
}

// Nearest grid cell for a point (x, y) in game area coords
export function posToCell(x, y, m) {
    return {
        row: Math.round((y - m.gridY - GRID_PAD) / (m.cellSize + GRID_GAP)),
        col: Math.round((x - m.gridX - GRID_PAD) / (m.cellSize + GRID_GAP)),
    };
}

// Board state: 8x7 array of pieceId or null
export function createBoard() {
    return Array.from({length: 8}, () => Array(7).fill(null));
}

// Returns true if a shape can be placed at (row, col)
export function canPlace(shape, row, col, board, excludeId = null) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            const gr = row + r, gc = col + c;
            if (gr < 0 || gr >= 8 || gc < 0 || gc >= 7) return false;
            if (GRID_ROWS[gr][gc] === null) return false;
            const occ = board[gr][gc];
            if (occ !== null && occ !== excludeId) return false;
        }
    }
    return true;
}

export function placePiece(shape, row, col, board, id) {
    const next = board.map(r => [...r]);
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            next[row + r][col + c] = id;
        }
    }
    return next;
}

export function liftPiece(id, board) {
    return board.map(row => row.map(cell => (cell === id ? null : cell)));
}

// Checks if all active non-today cells are filled
export function isSolved(board, today) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 7; c++) {
            const cell = GRID_ROWS[r][c];
            if (cell === null) continue;
            if (cell === today.month || cell === today.day || cell === today.weekday) continue;
            if (board[r][c] === null) return false;
        }
    }
    return true;
}
