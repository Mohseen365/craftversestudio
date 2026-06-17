// Updated scheduler test for Mid-Day Reallocation Logic
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

  // Most constrained first
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

function testMidDayReallocation() {
  console.log("--- Testing Mid-Day Reallocation Logic ---");

  const today = "2026-06-17";

  // Scenario:
  // Order 1 needs 2.0 units total.
  // Admin records 0.5 units completed TODAY (17th).
  // Urgent Order 2 arrives, needs 0.5 units, deadline TODAY (17th).

  const orders = [
    {
      id: "O1",
      orderNumber: "O1",
      productionDeadlineKey: "2026-06-20",
      requiredCapacity: 2.0,
      lockedCapacity: 0.5, // 0.5 already done
      status: "ACCEPTED"
    },
    {
      id: "O2",
      orderNumber: "O2",
      productionDeadlineKey: "2026-06-17", // Deadline is TODAY
      requiredCapacity: 0.5,
      lockedCapacity: 0,
      status: "ACCEPTED"
    }
  ];

  const capacityLimits = new Map(); // Default 1.0 per day
  const completedWorkMap = new Map();
  completedWorkMap.set("2026-06-17", 0.5); // 0.5 already consumed by O1's progress

  const result = scheduleOrdersInMemory(today, orders, capacityLimits, completedWorkMap);

  console.log("Success:", result.success);
  if (result.success) {
    for (const [id, allocs] of result.allocations) {
      console.log(`Order ${id} allocations:`);
      allocs.forEach(a => console.log(`  Date: ${a.dateKey}, Quantity: ${a.quantity}`));
    }

    // Check if O2 got the remaining 0.5 on the 17th
    const o2Alloc = result.allocations.get("O2");
    const o2Today = o2Alloc.find(a => a.dateKey === "2026-06-17");
    if (o2Today && o2Today.quantity === 0.5) {
      console.log("\nPASS: Urgent Order 2 took the remaining 0.5 capacity on 17 Jun.");
    } else {
      console.log("\nFAIL: Urgent Order 2 did not get the expected allocation.");
    }
  } else {
    console.log("Reason:", result.reason);
  }
}

testMidDayReallocation();
