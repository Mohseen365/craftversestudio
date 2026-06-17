// Updated scheduler test for Mid-Day Reallocation Logic (Exhaustive)
const DAILY_PRODUCTION_CAPACITY = 1;

function addDaysToKey(key, days) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function scheduleOrdersInMemory(todayKey, orders, capacityLimits, completedWorkMap) {
  const futureAllocations = new Map();
  const consumedCapacity = new Map();

  const getRemaining = (dateKey) => {
    const limit = capacityLimits.get(dateKey) ?? DAILY_PRODUCTION_CAPACITY;
    const completed = completedWorkMap.get(dateKey) ?? 0;
    const consumed = consumedCapacity.get(dateKey) ?? 0;
    return Math.max(0, limit - completed - consumed);
  };

  const toSchedule = orders
    .map((o) => {
      const remaining = o.requiredCapacity - o.lockedCapacity;
      if (remaining <= 0.001) return null;
      const dates = [];
      let cur = todayKey;
      while (cur <= o.productionDeadlineKey) {
        dates.push(cur);
        cur = addDaysToKey(cur, 1);
      }
      const windowCapacity = dates.reduce((sum, d) => {
        const limit = capacityLimits.get(d) ?? DAILY_PRODUCTION_CAPACITY;
        const completed = completedWorkMap.get(d) ?? 0;
        return sum + Math.max(0, limit - completed);
      }, 0);
      const slack = windowCapacity - remaining;
      return { order: o, remaining, dates, slack, windowSize: dates.length };
    })
    .filter((x) => x !== null);

  toSchedule.sort((a, b) => {
    if (a.windowSize !== b.windowSize) return a.windowSize - b.windowSize;
    if (Math.abs(a.slack - b.slack) > 0.001) return a.slack - b.slack;
    return a.order.productionDeadlineKey < b.order.productionDeadlineKey ? -1 : 1;
  });

  for (const { order, remaining, dates } of toSchedule) {
    let need = remaining;
    const allocs = [];
    for (const d of dates) {
      if (need <= 0.001) break;
      const avail = getRemaining(d);
      if (avail > 0.001) {
        const use = Math.min(need, avail);
        consumedCapacity.set(d, (consumedCapacity.get(d) ?? 0) + use);
        allocs.push({ dateKey: d, quantity: use });
        need -= use;
      }
    }
    if (need > 0.001) {
      return {
        success: false,
        allocations: new Map(),
        reason: `Order ${order.orderNumber} cannot be satisfied. Missing ${need.toFixed(2)} units.`,
      };
    }
    futureAllocations.set(order.id, allocs);
  }

  return { success: true, allocations: futureAllocations };
}

function runScenario(label, today, orders, capacityLimits, completedWorkMap) {
    console.log(`\n>>> SCENARIO: ${label}`);
    const result = scheduleOrdersInMemory(today, orders, capacityLimits, completedWorkMap);
    console.log("Success:", result.success);
    if (result.success) {
        for (const [id, allocs] of result.allocations) {
            console.log(`  Order ${id} allocations:`);
            allocs.forEach(a => console.log(`    Date: ${a.dateKey}, Quantity: ${a.quantity}`));
        }
    } else {
        console.log("  Failure Reason:", result.reason);
    }
    return result;
}

function main() {
  const today = "2026-06-17";
  let capacityLimits = new Map();
  let completedWorkMap = new Map();

  // CASE 1: Standard Multi-day Order A
  const orders1 = [
    { id: "O1", orderNumber: "O1", productionDeadlineKey: "2026-06-20", requiredCapacity: 2.0, lockedCapacity: 0, status: "ACCEPTED" }
  ];
  runScenario("Order A (2.0) with no constraints", today, orders1, capacityLimits, completedWorkMap);

  // CASE 2: Mid-Day Progress recorded for O1 (0.5 units done today)
  completedWorkMap.set("2026-06-17", 0.5);
  const orders2 = [
    { id: "O1", orderNumber: "O1", productionDeadlineKey: "2026-06-20", requiredCapacity: 2.0, lockedCapacity: 0.5, status: "ACCEPTED" }
  ];
  runScenario("Order A after 0.5 progress today", today, orders2, capacityLimits, completedWorkMap);

  // CASE 3: Urgent Order O2 added (0.5 units, deadline TODAY)
  const orders3 = [
    { id: "O1", orderNumber: "O1", productionDeadlineKey: "2026-06-20", requiredCapacity: 2.0, lockedCapacity: 0.5, status: "ACCEPTED" },
    { id: "O2", orderNumber: "O2", productionDeadlineKey: "2026-06-17", requiredCapacity: 0.5, lockedCapacity: 0, status: "ACCEPTED" }
  ];
  runScenario("Urgent Order O2 arrives (Deadline Today)", today, orders3, capacityLimits, completedWorkMap);

  // CASE 4: Capacity Override (Staff Shortage Tomorrow)
  capacityLimits.set("2026-06-18", 0.2);
  runScenario("O1 and O2 with shortage tomorrow (0.2)", today, orders3, capacityLimits, completedWorkMap);

  // CASE 5: Holiday (Tomorrow limit = 0)
  capacityLimits.set("2026-06-18", 0);
  runScenario("Holiday Tomorrow (0 capacity)", today, orders3, capacityLimits, completedWorkMap);

  // CASE 6: Complex Multi-Order shuffle
  // O1: 0.5 locked today, needs 1.5 more. Deadline 20th.
  // O2: Needs 0.5. Deadline Today (17th).
  // O3: Needs 1.0. Deadline 19th.
  // Tomorrow (18th) is 0 capacity.
  // 17th: 0.5 used by O1-lock. 0.5 remaining. O2 takes it.
  // 18th: 0 used. 0 remaining.
  // 19th: 1.0 limit. O3 takes it (more constrained than O1).
  // 20th: 1.0 limit. O1 takes 1.0.
  // 21st: O1 needs 0.5 more. BUT Deadline is 20th. FAIL.
  const orders6 = [
    ...orders3,
    { id: "O3", orderNumber: "O3", productionDeadlineKey: "2026-06-19", requiredCapacity: 1.0, lockedCapacity: 0, status: "ACCEPTED" }
  ];
  runScenario("Complex Multi-Order shuffle (Should Fail if O1 deadline tight)", today, orders6, capacityLimits, completedWorkMap);

  // CASE 7: Adjusting O1 progress down to 0.1 to make room for O4
  console.log("\n>>> SCENARIO: Reducing O1 progress to free up today's capacity");
  completedWorkMap.set("2026-06-17", 0.1);
  const orders7 = [
    { id: "O1", orderNumber: "O1", productionDeadlineKey: "2026-06-20", requiredCapacity: 2.0, lockedCapacity: 0.1, status: "ACCEPTED" },
    { id: "O4", orderNumber: "O4", productionDeadlineKey: "2026-06-17", requiredCapacity: 0.9, lockedCapacity: 0, status: "ACCEPTED" }
  ];
  runScenario("Freeing capacity for O4 (0.9 today)", today, orders7, capacityLimits, completedWorkMap);
}

main();
