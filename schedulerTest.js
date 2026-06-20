// Exhaustive Logic Validation for Bouquet Scheduler
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
    if (a.order.productionDeadlineKey !== b.order.productionDeadlineKey) {
        return a.order.productionDeadlineKey < b.order.productionDeadlineKey ? -1 : 1;
    }
    return a.order.id < b.order.id ? -1 : 1;
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
            allocs.forEach(a => console.log(`    Date: ${a.dateKey}, Quantity: ${a.quantity.toFixed(2)}`));
        }
    } else {
        console.log("  Failure Reason:", result.reason);
    }
}

function main() {
  const today = "2026-06-17";
  let capacityLimits = new Map();
  let completedWorkMap = new Map();

  // Scenario 1: Basic Allocation
  const orders1 = [
    { id: "O1", orderNumber: "ORD-1", productionDeadlineKey: "2026-06-20", requiredCapacity: 2.0, lockedCapacity: 0, status: "ACCEPTED" }
  ];
  runScenario("Standard multi-day order", today, orders1, capacityLimits, completedWorkMap);

  // Scenario 2: Mid-Day Progress Locking
  completedWorkMap.set("2026-06-17", 0.5);
  const orders2 = [
    { id: "O1", orderNumber: "ORD-1", productionDeadlineKey: "2026-06-20", requiredCapacity: 2.0, lockedCapacity: 0.5, status: "ACCEPTED" }
  ];
  runScenario("Respecting locked progress (0.5 done today)", today, orders2, capacityLimits, completedWorkMap);

  // Scenario 3: Urgent Order Stealing Capacity
  const orders3 = [
    { id: "O1", orderNumber: "ORD-1", productionDeadlineKey: "2026-06-20", requiredCapacity: 2.0, lockedCapacity: 0.5, status: "ACCEPTED" },
    { id: "O2", orderNumber: "ORD-2", productionDeadlineKey: "2026-06-17", requiredCapacity: 0.5, lockedCapacity: 0, status: "ACCEPTED" }
  ];
  runScenario("Urgent order O2 takes remaining capacity today", today, orders3, capacityLimits, completedWorkMap);

  // Scenario 4: Capacity Override (Shortage)
  capacityLimits.set("2026-06-18", 0.2);
  runScenario("Staff shortage tomorrow (Limit 0.2)", today, orders3, capacityLimits, completedWorkMap);

  // Scenario 5: Determinism Check (Same constraints, different IDs)
  const orders5 = [
    { id: "B", orderNumber: "B", productionDeadlineKey: "2026-06-18", requiredCapacity: 0.5, lockedCapacity: 0, status: "ACCEPTED" },
    { id: "A", orderNumber: "A", productionDeadlineKey: "2026-06-18", requiredCapacity: 0.5, lockedCapacity: 0, status: "ACCEPTED" }
  ];
  runScenario("Determinism: Order A should be scheduled before B based on ID", "2026-06-18", orders5, capacityLimits, completedWorkMap);

  // Scenario 6: Holiday (Zero Capacity)
  capacityLimits.set("2026-06-18", 0);
  runScenario("Holiday management (Zero capacity 18th)", today, orders3, capacityLimits, completedWorkMap);

  // Scenario 7: Full Mid-Day Reallocation (Editing Down)
  console.log("\n>>> SCENARIO: Editing progress down to free up capacity");
  completedWorkMap.set("2026-06-17", 0.1); // Admin edited O1 progress from 0.5 -> 0.1
  const orders7 = [
    { id: "O1", orderNumber: "ORD-1", productionDeadlineKey: "2026-06-20", requiredCapacity: 2.0, lockedCapacity: 0.1, status: "ACCEPTED" },
    { id: "O4", orderNumber: "ORD-4", productionDeadlineKey: "2026-06-17", requiredCapacity: 0.9, lockedCapacity: 0, status: "ACCEPTED" }
  ];
  runScenario("Freeing capacity for ORD-4 (needs 0.9 today)", today, orders7, capacityLimits, completedWorkMap);
}

main();
