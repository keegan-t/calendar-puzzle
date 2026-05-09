import "./styles.css";
import { dateToToday, renderGrid, MONTH_LABELS } from "./grid.js";
import {
    initGame,
    resetBoard,
    rotateLast,
    rotateLastCCW,
    flipLast,
    updateToday,
    triggerHint,
    getHintsLeft,
    isBoardSolved
} from "./drag.js";

const savedDateStr = localStorage.getItem("cal-puz:active-date");
const startDate = (() => {
    if (savedDateStr) {
        const [y, m, d] = savedDateStr.split("-").map(Number);
        return new Date(y, m - 1, d); // local midnight
    }
    return new Date();
})();
const today = dateToToday(startDate);

// === App skeleton ===
document.getElementById("app").innerHTML = `
<header class="app-header">
    <span class="title">Calendar Puzzle</span>
    <button class="gear-btn" id="settings-btn" aria-label="How to play">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
            <path d="M513.5-254.5Q528-269 528-290t-14.5-35.5Q499-340 478-340t-35.5 14.5Q428-311 428-290t14.5 35.5Q457-240 478-240t35.5-14.5ZM442-394h74q0-33 7.5-52t42.5-52q26-26 41-49.5t15-56.5q0-56-41-86t-97-30q-57 0-92.5 30T342-618l66 26q5-18 22.5-39t53.5-21q32 0 48 17.5t16 38.5q0 20-12 37.5T506-526q-44 39-54 59t-10 73Zm38 314q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
        </svg>
    </button>
</header>

<div class="game-area" id="game-area">
    <div class="today-pill" id="today-pill" role="button" aria-label="Select date" tabindex="0">
        <span class="dot"></span>
        <span id="pill-date">${today.display}</span>
    </div>
    <button class="hint-btn" id="hint-btn" aria-label="Hint">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
            <path d="M400-240q-33 0-56.5-23.5T320-320v-50q-57-39-88.5-100T200-600q0-117 81.5-198.5T480-880q117 0 198.5 81.5T760-600q0 69-31.5 129.5T640-370v50q0 33-23.5 56.5T560-240H400Zm0-80h160v-92l34-24q41-28 63.5-71.5T680-600q0-83-58.5-141.5T480-800q-83 0-141.5 58.5T280-600q0 49 22.5 92.5T366-436l34 24v92Zm0 240q-17 0-28.5-11.5T360-120v-40h240v40q0 17-11.5 28.5T560-80H400Zm80-520Z"/>
        </svg>
        <span class="hint-badge" id="hint-badge">3</span></button>

    <div class="grid-wrapper">
        <div class="puz-grid" id="puzzle-grid"></div>
    </div>
</div>

<footer class="app-footer">
    <button class="footer-btn" id="reset-btn" aria-label="Reset">
        <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor">
            <path d="M440-122q-121-15-200.5-105.5T160-440q0-66 26-126.5T260-672l57 57q-38 34-57.5 79T240-440q0 88 56 155.5T440-202v80Zm80 0v-80q87-16 143.5-83T720-440q0-100-70-170t-170-70h-3l44 44-56 56-140-140 140-140 56 56-44 44h3q134 0 227 93t93 227q0 121-79.5 211.5T520-122Z"/>
        </svg>
        <span>Reset</span>
    </button>
    <button class="footer-btn" id="rotate-btn" aria-label="Rotate clockwise">
        <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor">
            <path d="M522-80v-82q34-5 66.5-18t61.5-34l56 58q-42 32-88 51.5T522-80Zm-80 0Q304-98 213-199.5T122-438q0-75 28.5-140.5t77-114q48.5-48.5 114-77T482-798h6l-62-62 56-58 160 160-160 160-56-56 64-64h-8q-117 0-198.5 81.5T202-438q0 104 68 182.5T442-162v82Zm322-134-58-56q21-29 34-61.5t18-66.5h82q-5 50-24.5 96T764-214Zm76-264h-82q-5-34-18-66.5T706-606l58-56q32 39 51 86t25 98Z"/>
        </svg>
        <span>Rotate</span>
    </button>
    <button class="footer-btn" id="rotate-ccw-btn" aria-label="Rotate counter-clockwise">
        <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor">
            <path d="M440-80q-50-5-96-24.5T256-156l56-58q29 21 61.5 34t66.5 18v82Zm80 0v-82q104-15 172-93.5T760-438q0-117-81.5-198.5T480-718h-8l64 64-56 56-160-160 160-160 56 58-62 62h6q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-438q0 137-91 238.5T520-80ZM198-214q-32-42-51.5-88T122-398h82q5 34 18 66.5t34 61.5l-58 56Zm-76-264q6-51 25-98t51-86l58 56q-21 29-34 61.5T204-478h-82Z"/>
        </svg>
        <span>Rotate</span>
    </button>
    <button class="footer-btn" id="flip-btn" aria-label="Flip">
        <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor">
            <path d="M280-280 80-480l200-200 56 56-103 104h494L624-624l56-56 200 200-200 200-56-56 103-104H233l103 104-56 56Z"/>
        </svg>
        <span>Flip</span>
    </button>
</footer>

<div class="modal-overlay" id="modal-overlay" role="dialog" aria-modal="true" aria-label="How to play">
    <div class="modal">
        <div class="modal-header">
            <h5>How to Play</h5>
            <button class="modal-close-btn" id="modal-close" aria-label="Close">✕</button>
        </div>
        <div class="guide-section">
            <div class="guide-label">Objective</div>
            <p class="guide-text">Place all 10 pieces on the board. The three highlighted cells - today's month, day, and weekday - must be the only cells left uncovered.</p>
        </div>
        <div class="guide-section">
            <div class="guide-label">Controls</div>
            <p class="guide-text">Drag pieces onto the board - they snap to the grid when close enough. Rotate and flip pieces using the footer buttons or keyboard shortcuts.</p>
        </div>
        <div class="guide-section">
            <div class="guide-label">Hints</div>
            <p class="guide-text">You get 3 hints per puzzle. Each hint places one piece in its correct position. Hints reset when you change the date.</p>
        </div>
        <div class="guide-section">
            <div class="guide-label">Shortcuts</div>
            <div class="shortcut-row"><kbd>R</kbd><span>Rotate clockwise</span></div>
            <div class="shortcut-row"><kbd>Shift</kbd>+<kbd>R</kbd><span>Rotate counter-clockwise</span></div>
            <div class="shortcut-row"><kbd>F</kbd><span>Flip horizontally</span></div>
        </div>
    </div>
</div>

<div class="win-badge" id="win-badge" role="status" aria-live="polite">✓ Solved!</div>
`;

// === Render grid ===
renderGrid(document.getElementById("puzzle-grid"), today);

// === Initialise drag-and-drop ===
function triggerSweep() {
    const gameArea = document.getElementById("game-area");
    const grid = document.getElementById("puzzle-grid");
    const gaRect = gameArea.getBoundingClientRect();
    const gr = grid.getBoundingClientRect();

    const wrap = document.createElement("div");
    wrap.style.cssText = `position:absolute;top:${gr.top - gaRect.top}px;left:${gr.left - gaRect.left}px;width:${gr.width}px;height:${gr.height}px;border-radius:8px;overflow:hidden;pointer-events:none;z-index:9999`;

    const sweep = document.createElement("div");
    sweep.className = "shimmer-sweep";
    wrap.appendChild(sweep);
    gameArea.appendChild(wrap);
    sweep.addEventListener("animationend", () => wrap.remove(), {once: true});
}

function updateHintBtn() {
    const hintBtn = document.getElementById("hint-btn");
    const hintBadge = document.getElementById("hint-badge");
    const left = getHintsLeft();
    hintBadge.textContent = left;
    hintBtn.disabled = left === 0 || isBoardSolved();
}

initGame(today, () => {
    document.getElementById("win-badge").classList.add("visible");
    document.getElementById("hint-btn").disabled = true;
    triggerSweep();
}, updateHintBtn);

// === Settings modal ===
const overlay = document.getElementById("modal-overlay");
const settingsBtn = document.getElementById("settings-btn");
const closeBtn = document.getElementById("modal-close");

const openModal = () => overlay.classList.add("open");
const closeModal = () => overlay.classList.remove("open");

settingsBtn.addEventListener("click", openModal);
closeBtn.addEventListener("click", closeModal);
overlay.addEventListener("click", e => {
    if (e.target === overlay) closeModal();
});

// === Hint button ===
document.getElementById("hint-btn").addEventListener("click", () => {
    triggerHint();
    updateHintBtn();
});

// === Footer buttons ===
document.getElementById("reset-btn").addEventListener("click", () => {
    resetBoard();
    updateHintBtn();
});
document.getElementById("rotate-ccw-btn").addEventListener("click", rotateLastCCW);
document.getElementById("rotate-btn").addEventListener("click", rotateLast);
document.getElementById("flip-btn").addEventListener("click", flipLast);

// Blur footer buttons after click to prevent clicks triggering highlight
document.querySelector(".app-footer").addEventListener("click", e => {
    e.target.closest("button")?.blur();
});

// === Date picker ===
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const realToday = new Date();
realToday.setHours(0, 0, 0, 0);

let selectedDate = new Date(startDate);
let viewYear = selectedDate.getFullYear();
let viewMonth = selectedDate.getMonth();

const picker = document.createElement("div");
picker.className = "date-picker";
picker.id = "date-picker";
picker.innerHTML = `
<div class="dp-header">
    <button class="dp-nav" id="dp-prev">&#8249;</button>
    <span class="dp-month-label" id="dp-month-label"></span>
    <button class="dp-nav" id="dp-next">&#8250;</button>
</div>
<div class="dp-weekdays">${WEEKDAY_SHORT.map(d => `<div class="dp-weekday">${d}</div>`).join("")}</div>
<div class="dp-days" id="dp-days"></div>
<div class="dp-footer">
    <button class="dp-today-btn" id="dp-today-btn">Today</button>
</div>
`;
document.body.appendChild(picker);

function renderPicker() {
    document.getElementById("dp-month-label").textContent =
        `${MONTH_LABELS[viewMonth]} ${viewYear}`;

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

    const grid = document.getElementById("dp-days");
    grid.innerHTML = "";

    const total = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    for (let i = 0; i < total; i++) {
        const div = document.createElement("div");
        div.className = "dp-day";

        let d, m, y, otherMonth = false;
        if (i < firstDay) {
            d = daysInPrev - firstDay + 1 + i;
            m = viewMonth - 1;
            y = viewYear;
            if (m < 0) {
                m = 11;
                y--;
            }
            otherMonth = true;
        } else if (i >= firstDay + daysInMonth) {
            d = i - firstDay - daysInMonth + 1;
            m = viewMonth + 1;
            y = viewYear;
            if (m > 11) {
                m = 0;
                y++;
            }
            otherMonth = true;
        } else {
            d = i - firstDay + 1;
            m = viewMonth;
            y = viewYear;
        }

        const date = new Date(y, m, d);
        date.setHours(0, 0, 0, 0);
        div.textContent = d;
        if (otherMonth) div.classList.add("other-month");
        if (date.getTime() === realToday.getTime()) div.classList.add("is-today");
        if (date.getTime() === selectedDate.getTime()) div.classList.add("selected");

        div.addEventListener("click", () => selectDate(date));
        grid.appendChild(div);
    }
}

function selectDate(date) {
    selectedDate = new Date(date);
    viewYear = selectedDate.getFullYear();
    viewMonth = selectedDate.getMonth();

    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(selectedDate.getDate()).padStart(2, "0");
    localStorage.setItem("cal-puz:active-date", `${viewYear}-${mm}-${dd}`);

    const newToday = dateToToday(selectedDate);
    document.getElementById("pill-date").textContent = newToday.display;
    renderGrid(document.getElementById("puzzle-grid"), newToday);
    updateToday(newToday);
    updateHintBtn();

    renderPicker();
    closePicker();
}

function positionPicker() {
    const pill = document.getElementById("today-pill");
    const rect = pill.getBoundingClientRect();
    picker.style.top = `${rect.bottom + 8}px`;
    picker.style.left = `${rect.left}px`;
}

function openPicker() {
    viewYear = selectedDate.getFullYear();
    viewMonth = selectedDate.getMonth();
    renderPicker();
    positionPicker();
    picker.classList.add("open");
}

function closePicker() {
    picker.classList.remove("open");
}

const pill = document.getElementById("today-pill");

pill.addEventListener("click", () => {
    picker.classList.contains("open") ? closePicker() : openPicker();
});

pill.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPicker();
    }
});

document.getElementById("dp-prev").addEventListener("click", e => {
    e.stopPropagation();
    viewMonth--;
    if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
    }
    renderPicker();
});

document.getElementById("dp-next").addEventListener("click", e => {
    e.stopPropagation();
    viewMonth++;
    if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
    }
    renderPicker();
});

document.getElementById("dp-today-btn").addEventListener("click", e => {
    e.stopPropagation();
    selectDate(new Date(realToday));
});

document.addEventListener("pointerdown", e => {
    if (!picker.classList.contains("open")) return;
    if (!picker.contains(e.target) && !pill.contains(e.target)) closePicker();
});

// === Keyboard shortcuts ===
document.addEventListener("keydown", e => {
    if (e.ctrlKey) return;
    if (e.key === "Escape") {
        closeModal();
        closePicker();
    }
    if (e.key.toLowerCase() === "r") e.shiftKey ? rotateLastCCW() : rotateLast();
    if (e.key === "f" || e.key === "F") flipLast();
});
