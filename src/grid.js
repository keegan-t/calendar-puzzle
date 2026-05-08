export const GRID_ROWS = [
    ["jan", "feb", "mar", "apr", "may", "jun", null],
    ["jul", "aug", "sep", "oct", "nov", "dec", null],
    ["1", "2", "3", "4", "5", "6", "7"],
    ["8", "9", "10", "11", "12", "13", "14"],
    ["15", "16", "17", "18", "19", "20", "21"],
    ["22", "23", "24", "25", "26", "27", "28"],
    ["29", "30", "31", "sun", "mon", "tue", "wed"],
    [null, null, null, null, "thu", "fri", "sat"],
];

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const MONTH_LABELS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Convert any Date to a "today" object for the game
export function dateToToday(d) {
    const month = MONTH_KEYS[d.getMonth()];
    const day = String(d.getDate());
    const weekday = WEEKDAY_KEYS[d.getDay()];
    const weekdayTitle = weekday[0].toUpperCase() + weekday.slice(1);
    const display = `${weekdayTitle} · ${MONTH_LABELS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
    return {month, day, weekday, display};
}

export function renderGrid(container, today) {
    container.innerHTML = "";
    for (const cell of GRID_ROWS.flat()) {
        const div = document.createElement("div");
        if (cell === null) {
            div.className = "puz-cell disabled";
        } else {
            const isToday = cell === today.month || cell === today.day || cell === today.weekday;
            div.className = isToday ? "puz-cell today" : "puz-cell";
            div.textContent = cell;
            div.dataset.cell = cell;
        }
        container.appendChild(div);
    }
}
