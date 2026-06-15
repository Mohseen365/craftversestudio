// Scratch test script for scheduler logic
function toDateOnly(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
}

const DAILY_PRODUCTION_CAPACITY = 3;

function scheduleOrdersInMemory(today, orders, capacityLimits) {
  const futureAllocations = new Map();
  const consumedCapacity = new Map();

  const getRemainingCapacity = (dateStr) => {
    const limit = capacityLimits.get(dateStr) ?? DAILY_PRODUCTION_CAPACITY;
    const consumed = consumedCapacity.get(dateStr) ?? 0;
    return Math.max(0, limit - consumed);
  };

  // Calculate remaining needs and constraints for all orders
  const ordersToSchedule = orders
    .map((order) => {
      const remainingToSchedule = order.requiredCapacity - order.lockedCapacity;
      if (remainingToSchedule <= 0) {
        return null;
      }

      const deadline = toDateOnly(order.productionDeadline);
      const availableDates = [];
      let current = addDays(today, 1);
      while (current <= deadline) {
        availableDates.push(new Date(current));
        current = addDays(current, 1);
      }

      const availableDays = availableDates.length;
      const slack = availableDays - remainingToSchedule;

      return {
        order,
        remainingToSchedule,
        availableDates,
        availableDays,
        slack,
      };
    })
    .filter((o) => o !== null);

  // Sort orders by constraint:
  // 1. fewer possible dates (availableDays ASC)
  // 2. lower slack (slack ASC)
  // 3. earlier deadlines (deadline ASC)
  ordersToSchedule.sort((a, b) => {
    if (a.availableDays !== b.availableDays) {
      return a.availableDays - b.availableDays;
    }
    if (a.slack !== b.slack) {
      return a.slack - b.slack;
    }
    return (
      a.order.productionDeadline.getTime() -
      b.order.productionDeadline.getTime()
    );
  });

  // Allocate backwards from deadline to today + 1
  for (const {
    order,
    remainingToSchedule,
    availableDates,
  } of ordersToSchedule) {
    let needed = remainingToSchedule;
    const orderAllocations = [];

    for (let i = availableDates.length - 1; i >= 0; i--) {
      if (needed <= 0) break;
      const date = availableDates[i];
      const dateStr = date.toISOString().split("T")[0];
      const remainingCap = getRemainingCapacity(dateStr);

      if (remainingCap > 0) {
        const allocate = Math.min(needed, remainingCap);
        consumedCapacity.set(
          dateStr,
          (consumedCapacity.get(dateStr) ?? 0) + allocate
        );
        orderAllocations.push({ date, quantity: allocate });
        needed -= allocate;
      }
    }

    if (needed > 0) {
      return {
        success: false,
        allocations: new Map(),
        reason: `Order ${order.orderNumber} (ID: ${
          order.id
        }) cannot be completed before its deadline (${
          order.productionDeadline.toISOString().split("T")[0]
        }). Missing ${needed} capacity units.`,
      };
    }

    futureAllocations.set(order.id, orderAllocations);
  }

  return {
    success: true,
    allocations: futureAllocations,
  };
}

function toDate(day) {
  return new Date(`2026-06-${day}`);
}

function runTests() {
  console.log("Starting scheduler tests...");

  // Example 1
  // Today = 15
  // Orders:
  // O2: Deadline = 18, Needs = 2
  // O4: Deadline = 17, Needs = 1
  const today1 = toDate(15);
  const orders1 = [
    {
      id: "O2",
      orderNumber: "O2",
      productionDeadline: toDate(18),
      requiredCapacity: 2,
      lockedCapacity: 0,
      status: "ACCEPTED",
    },
    {
      id: "O4",
      orderNumber: "O4",
      productionDeadline: toDate(17),
      requiredCapacity: 1,
      lockedCapacity: 0,
      status: "ACCEPTED",
    },
  ];

  const capacityLimits = new Map(); // Empty map defaults to 3 per day

  const result1 = scheduleOrdersInMemory(today1, orders1, capacityLimits);
  console.log("Example 1 Success:", result1.success);
  console.log("Example 1 Allocations:");
  for (const [orderId, allocs] of result1.allocations.entries()) {
    console.log(
      `  ${orderId}:`,
      allocs.map((a) => `${a.date.getDate()} (${a.quantity} units)`).join(", ")
    );
  }

  // Example 2
  // Today = 15
  // Orders:
  // O2: Deadline = 18, Needs = 2
  // O4: Deadline = 19, Needs = 1
  const today2 = toDate(15);
  const orders2 = [
    {
      id: "O2",
      orderNumber: "O2",
      productionDeadline: toDate(18),
      requiredCapacity: 2,
      lockedCapacity: 0,
      status: "ACCEPTED",
    },
    {
      id: "O4",
      orderNumber: "O4",
      productionDeadline: toDate(19),
      requiredCapacity: 1,
      lockedCapacity: 0,
      status: "ACCEPTED",
    },
  ];

  const result2 = scheduleOrdersInMemory(today2, orders2, capacityLimits);
  console.log("Example 2 Success:", result2.success);
  console.log("Example 2 Allocations:");
  for (const [orderId, allocs] of result2.allocations.entries()) {
    console.log(
      `  ${orderId}:`,
      allocs.map((a) => `${a.date.getDate()} (${a.quantity} units)`).join(", ")
    );
  }

  // Example 3 (Failure Case)
  // Today = 15
  // Orders:
  // O5: Deadline = 16, Needs = 5
  // Only 1 day available (16), capacity per day = 3
  // => Impossible to fulfill
  const today3 = toDate(15);
  const orders3 = [
    {
      id: "O5",
      orderNumber: "O5",
      productionDeadline: toDate(16),
      requiredCapacity: 5,
      lockedCapacity: 0,
      status: "ACCEPTED",
    },
  ];

  const result3 = scheduleOrdersInMemory(today3, orders3, capacityLimits);
  console.log("Example 3 Success:", result3.success);
  if (!result3.success) {
    console.log("Example 3 Failure Reason:", result3.reason);
  } else {
    console.log("Example 3 Allocations:");
    for (const [orderId, allocs] of result3.allocations.entries()) {
      console.log(
        `  ${orderId}:`,
        allocs
          .map((a) => `${a.date.getDate()} (${a.quantity} units)`)
          .join(", ")
      );
    }
  }
}

try {
  runTests();
} catch (err) {
  console.error(err);
}
