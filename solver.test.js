import { solve } from "./src/solver.js";
import { dateToToday } from "./src/grid.js";

const YEAR = 2024;
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const SLOW_MS = 150;

let total = 0, failed = 0;
let slowest = {ms: 0, label: ""};
const slow = [];

for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(YEAR, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const base = dateToToday(new Date(YEAR, month, day));

        for (const weekday of WEEKDAYS) {
            const today = {...base, weekday};
            const t0 = performance.now();
            const solution = solve(today);
            const ms = performance.now() - t0;

            total++;

            if (!solution) {
                console.error(`FAIL  ${base.display}  weekday=${weekday}`);
                failed++;
            }

            if (ms > slowest.ms) slowest = {ms, label: `${base.display} (${weekday})`};
            if (ms > SLOW_MS) slow.push(`  ${base.display}  weekday=${weekday}  ${ms.toFixed(0)}ms`);
        }
    }
}

console.log(`\n${total - failed} / ${total} passed${failed ? `  <- ${failed} FAILURES` : ''}`);

if (slow.length) {
    console.log(`\n${slow.length} slow case(s) over ${SLOW_MS}ms:`);
    slow.forEach(s => console.log(s));
} else {
    console.log(`No cases exceeded ${SLOW_MS}ms`);
}

console.log(`\nSlowest: ${slowest.label} - ${slowest.ms.toFixed(1)}ms`);
