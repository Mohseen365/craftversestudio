public with sharing class BouquetScheduler {
    public static final Decimal DEFAULT_HOURS_PER_DAY = 8.0;
    public static final Integer HOUR_PRECISION = 4;

    public static final Set<String> SCHEDULABLE_STATUSES = new Set<String>{
        'ACCEPTED', 'PAYMENT_PENDING', 'PAYMENT_SUBMITTED', 'PAYMENT_VERIFICATION',
        'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP'
    };

    public static final Set<String> INACTIVE_STATUSES = new Set<String>{
        'CANCELLED', 'REFUNDED', 'REJECTED', 'SHIPPED', 'DELIVERED', 'PAYMENT_REJECTED'
    };

    // ==================== Types ====================
    public class ScheduledAllocation {
        @AuraEnabled public Date allocationDate;
        @AuraEnabled public Decimal hours;
    }

    public class OrderScheduleInput {
        @AuraEnabled public Id orderId;
        @AuraEnabled public String orderNumber;
        @AuraEnabled public Date productionDeadline;
        @AuraEnabled public Decimal requiredHours;
        @AuraEnabled public Decimal lockedHours;
        @AuraEnabled public String status;
        @AuraEnabled public Boolean isLate;
    }

    public class SchedulerData {
        @AuraEnabled public Date todayDate;
        @AuraEnabled public List<OrderScheduleInput> inputs;
        @AuraEnabled public Map<Date, Decimal> capacityLimits;
        @AuraEnabled public Map<Date, Decimal> completedWorkMap;
    }

    public class SchedulingResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public Map<Id, List<ScheduledAllocation>> allocations;
        @AuraEnabled public String reason;
    }

    public class AcceptabilityResult {
        @AuraEnabled public Boolean canAccept;
        @AuraEnabled public String reason;
        @AuraEnabled public List<ScheduledAllocation> suggestedDates;
        @AuraEnabled public Map<Id, List<ScheduledAllocation>> allocations;
        @AuraEnabled public SchedulerData schedulerData;
    }

    // ==================== Hours Helpers ====================
    public static Decimal calculateOrderHours(Id orderId) {
        Decimal total = 0;
        List<Bouquet_Order_Item__c> items = [
            SELECT Quantity__c, Product__r.Production_Hours__c
            FROM Bouquet_Order_Item__c
            WHERE Bouquet_Order__c = :orderId
        ];
        for (Bouquet_Order_Item__c item : items) {
            Decimal hoursPerUnit = item.Product__r.Production_Hours__c != null ? item.Product__r.Production_Hours__c : 0.5;
            total += item.Quantity__c * hoursPerUnit;
        }
        return total <= 0.001 ? 0.25 : total;
    }

    // ==================== Core Scheduling Algorithm ====================
    public static SchedulingResult scheduleOrdersInMemory(
        Date todayDate,
        List<OrderScheduleInput> orders,
        Map<Date, Decimal> capacityLimits,
        Map<Date, Decimal> completedWorkMap
    ) {
        SchedulingResult result = new SchedulingResult();
        result.allocations = new Map<Id, List<ScheduledAllocation>>();
        Map<Date, Decimal> consumedHours = new Map<Date, Decimal>();

        List<PendingOrder> pendingOrders = new List<PendingOrder>();

        for (OrderScheduleInput o : orders) {
            Decimal remaining = o.requiredHours - o.lockedHours;
            if (remaining <= 0.001) continue;

            List<Date> viableDates = new List<Date>();
            Date currentDate = todayDate;
            while (currentDate <= o.productionDeadline) {
                viableDates.add(currentDate);
                currentDate = currentDate.addDays(1);
            }
            if (viableDates.isEmpty()) {
                viableDates.add(todayDate);
            }

            Decimal windowCapacity = 0;
            for (Date d : viableDates) {
                Decimal limitHours = capacityLimits.containsKey(d) ? capacityLimits.get(d) : DEFAULT_HOURS_PER_DAY;
                Decimal completed = completedWorkMap.containsKey(d) ? completedWorkMap.get(d) : 0;
                windowCapacity += Math.max(0, limitHours - completed);
            }

            Decimal slack = windowCapacity - remaining;
            pendingOrders.add(new PendingOrder(o, remaining, viableDates, slack));
        }

        pendingOrders.sort();

        for (PendingOrder po : pendingOrders) {
            Decimal need = po.remaining;
            List<ScheduledAllocation> allocs = new List<ScheduledAllocation>();

            for (Date d : po.dates) {
                if (need <= 0.001) break;

                Decimal limitHours = capacityLimits.containsKey(d) ? capacityLimits.get(d) : DEFAULT_HOURS_PER_DAY;
                Decimal completed = completedWorkMap.containsKey(d) ? completedWorkMap.get(d) : 0;
                Decimal consumed = consumedHours.containsKey(d) ? consumedHours.get(d) : 0;

                Decimal available = Math.max(0, limitHours - completed - consumed);

                if (available > 0.001) {
                    Decimal allocate = Math.min(need, available);
                    consumedHours.put(d, (consumed + allocate));

                    ScheduledAllocation sa = new ScheduledAllocation();
                    sa.allocationDate = d;
                    sa.hours = allocate.setScale(HOUR_PRECISION, RoundingMode.HALF_UP);
                    allocs.add(sa);
                    need -= allocate;
                }
            }

            if (need > 0.001) {
                result.success = false;
                result.reason = 'Order ' + po.order.orderNumber + ' (' + po.order.orderId + ') cannot be satisfied. Missing ' + need.setScale(2) + 'h before ' + po.order.productionDeadline;
                return result;
            }
            result.allocations.put(po.order.orderId, allocs);
        }

        result.success = true;
        return result;
    }

    private class PendingOrder implements Comparable {
        public OrderScheduleInput order;
        public Decimal remaining;
        public List<Date> dates;
        public Decimal slack;
        public Integer windowSize;

        public PendingOrder(OrderScheduleInput o, Decimal rem, List<Date> d, Decimal s) {
            this.order = o;
            this.remaining = rem;
            this.dates = d;
            this.slack = s;
            this.windowSize = d.size();
        }

        public Integer compareTo(Object compareTo) {
            PendingOrder other = (PendingOrder)compareTo;
            if (this.windowSize != other.windowSize) return this.windowSize - other.windowSize;
            if (this.slack != other.slack) {
                return this.slack < other.slack ? -1 : 1;
            }
            if (this.order.productionDeadline != other.order.productionDeadline) {
                return this.order.productionDeadline < other.order.productionDeadline ? -1 : 1;
            }
            return 0;
        }
    }

    // ==================== Data Loading ====================
    public static SchedulerData getSchedulerData(Date todayDate) {
        SchedulerData data = new SchedulerData();
        data.todayDate = todayDate;

        List<Bouquet_Order__c> orders = [
            SELECT Id, Order_Number__c, Production_Deadline__c, Status__c,
                   (SELECT Quantity__c, Product__r.Production_Hours__c FROM Order_Items__r),
                   (SELECT Completed_Hours__c FROM Capacity_Reservations__r)
            FROM Bouquet_Order__c
            WHERE Status__c IN :SCHEDULABLE_STATUSES
              AND Production_Deadline__c != null
        ];

        Date maxDeadline = todayDate;
        for (Bouquet_Order__c o : orders) {
            if (o.Production_Deadline__c > maxDeadline) maxDeadline = o.Production_Deadline__c;
        }

        List<Bouquet_Capacity__c> caps = [
            SELECT Date__c, Maximum_Hours__c
            FROM Bouquet_Capacity__c
            WHERE Date__c >= :todayDate AND Date__c <= :maxDeadline
        ];
        data.capacityLimits = new Map<Date, Decimal>();
        for (Bouquet_Capacity__c c : caps) {
            data.capacityLimits.put(c.Date__c, c.Maximum_Hours__c);
        }

        List<Bouquet_Capacity_Reservation__c> reservations = [
            SELECT Completed_Hours__c, Bouquet_Capacity__r.Date__c
            FROM Bouquet_Capacity_Reservation__c
            WHERE Bouquet_Capacity__r.Date__c >= :todayDate
              AND Bouquet_Capacity__r.Date__c <= :maxDeadline
              AND Completed_Hours__c > 0
        ];
        data.completedWorkMap = new Map<Date, Decimal>();
        for (Bouquet_Capacity_Reservation__c r : reservations) {
            Decimal current = data.completedWorkMap.get(r.Bouquet_Capacity__r.Date__c);
            data.completedWorkMap.put(r.Bouquet_Capacity__r.Date__c, (current != null ? current : 0) + r.Completed_Hours__c);
        }

        data.inputs = new List<OrderScheduleInput>();
        for (Bouquet_Order__c o : orders) {
            OrderScheduleInput input = new OrderScheduleInput();
            input.orderId = o.Id;
            input.orderNumber = o.Order_Number__c;
            input.productionDeadline = o.Production_Deadline__c;
            input.status = o.Status__c;

            Decimal req = 0;
            for (Bouquet_Order_Item__c item : o.Order_Items__r) {
                Decimal h = item.Product__r.Production_Hours__c != null ? item.Product__r.Production_Hours__c : 0.5;
                req += item.Quantity__c * h;
            }
            input.requiredHours = req <= 0.001 ? 0.25 : req;

            Decimal locked = 0;
            for (Bouquet_Capacity_Reservation__c r : o.Capacity_Reservations__r) {
                locked += r.Completed_Hours__c != null ? r.Completed_Hours__c : 0;
            }
            input.lockedHours = locked;
            input.isLate = o.Production_Deadline__c < todayDate;

            data.inputs.add(input);
        }

        return data;
    }

    // ==================== Job and Snapshot ====================
    public static void createSchedulingJob(String eventType, Map<String, Object> payload) {
        insert new Bouquet_Scheduling_Job__c(
            Status__c = 'PENDING',
            Event_Type__c = eventType,
            Payload__c = JSON.serialize(payload)
        );
    }

    public static void takeSnapshot(Date snapshotDate, SchedulerData data) {
        insert new Bouquet_Scheduling_Snapshot__c(
            Date__c = snapshotDate,
            Snapshot__c = JSON.serialize(data)
        );
    }

    // ==================== Acceptability Check ====================
    public static AcceptabilityResult checkAcceptability(
        Id candidateOrderId,
        String candidateOrderNumber,
        Date productionDeadline,
        Decimal requiredHours,
        SchedulerData preloaded
    ) {
        SchedulerData data = preloaded != null ? preloaded : getSchedulerData(Date.today());

        OrderScheduleInput candidateInput = new OrderScheduleInput();
        candidateInput.orderId = candidateOrderId;
        candidateInput.orderNumber = candidateOrderNumber;
        candidateInput.productionDeadline = productionDeadline;
        candidateInput.requiredHours = requiredHours;
        candidateInput.lockedHours = 0;
        candidateInput.status = 'ACCEPTED';

        List<OrderScheduleInput> allInputs = new List<OrderScheduleInput>();
        Boolean replaced = false;
        for (OrderScheduleInput i : data.inputs) {
            if (i.orderId == candidateOrderId) {
                allInputs.add(candidateInput);
                replaced = true;
            } else {
                allInputs.add(i);
            }
        }
        if (!replaced) allInputs.add(candidateInput);

        SchedulingResult result = scheduleOrdersInMemory(data.todayDate, allInputs, data.capacityLimits, data.completedWorkMap);

        AcceptabilityResult ar = new AcceptabilityResult();
        if (!result.success) {
            ar.canAccept = false;
            ar.reason = result.reason;
            return ar;
        }

        ar.canAccept = true;
        ar.suggestedDates = result.allocations.get(candidateOrderId);
        ar.allocations = result.allocations;
        ar.schedulerData = data;
        ar.schedulerData.inputs = allInputs;
        return ar;
    }

    // ==================== Persistence ====================
    public static void persistAllocations(Map<Id, List<ScheduledAllocation>> allocations, Date todayDate) {
        Set<Date> allDates = new Set<Date>();
        for (List<ScheduledAllocation> allocs : allocations.values()) {
            if (allocs == null) continue;
            for (ScheduledAllocation a : allocs) allDates.add(a.allocationDate);
        }

        List<Bouquet_Capacity__c> existingCaps = [SELECT Date__c FROM Bouquet_Capacity__c WHERE Date__c IN :allDates];
        Set<Date> existingDates = new Set<Date>();
        for (Bouquet_Capacity__c c : existingCaps) existingDates.add(c.Date__c);

        List<Bouquet_Capacity__c> newCaps = new List<Bouquet_Capacity__c>();
        for (Date d : allDates) {
            if (!existingDates.contains(d)) {
                newCaps.add(new Bouquet_Capacity__c(Date__c = d, Name = d.toString(), Maximum_Hours__c = DEFAULT_HOURS_PER_DAY));
            }
        }
        if (!newCaps.isEmpty()) insert newCaps;

        Map<Date, Id> capIdByDate = new Map<Date, Id>();
        for (Bouquet_Capacity__c c : [SELECT Id, Date__c FROM Bouquet_Capacity__c WHERE Date__c >= :todayDate]) {
            capIdByDate.put(c.Date__c, c.Id);
        }

        // Delete future non-manual reservations with no progress
        delete [
            SELECT Id FROM Bouquet_Capacity_Reservation__c
            WHERE Bouquet_Capacity__r.Date__c >= :todayDate
              AND Is_Manual__c = false
              AND Completed_Hours__c = 0
        ];

        // Reset remaining future reservations
        List<Bouquet_Capacity_Reservation__c> remaining = [
            SELECT Id, Completed_Hours__c FROM Bouquet_Capacity_Reservation__c
            WHERE Bouquet_Capacity__r.Date__c >= :todayDate
              AND Is_Manual__c = false
        ];
        for (Bouquet_Capacity_Reservation__c r : remaining) {
            r.Planned_Hours__c = r.Completed_Hours__c;
        }
        update remaining;

        List<Bouquet_Capacity_Reservation__c> toInsert = new List<Bouquet_Capacity_Reservation__c>();
        for (Id orderId : allocations.keySet()) {
            if (allocations.get(orderId) == null) continue;
            for (ScheduledAllocation sa : allocations.get(orderId)) {
                Id capId = capIdByDate.get(sa.allocationDate);
                if (capId == null) continue;

                toInsert.add(new Bouquet_Capacity_Reservation__c(
                    Bouquet_Capacity__c = capId,
                    Bouquet_Order__c = orderId,
                    Planned_Hours__c = sa.hours
                ));
            }
        }
        if (!toInsert.isEmpty()) insert toInsert;
    }

    public static void rebuildSchedule() {
        Date todayDate = Date.today();
        SchedulerData data = getSchedulerData(todayDate);
        SchedulingResult result = scheduleOrdersInMemory(todayDate, data.inputs, data.capacityLimits, data.completedWorkMap);

        if (!result.success) {
            throw new AuraHandledException('Cannot rebuild schedule: ' + result.reason);
        }

        persistAllocations(result.allocations, todayDate);
        takeSnapshot(todayDate, data);
    }
}
