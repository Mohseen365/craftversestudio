public with sharing class BouquetCapacityController {

    public class CapacityRow {
        @AuraEnabled public Date capacityDate;
        @AuraEnabled public Decimal dailyCapacity;
        @AuraEnabled public Decimal used;
        @AuraEnabled public Decimal remaining;
        @AuraEnabled public Boolean isFull;
        @AuraEnabled public List<OrderReservation> orders;
    }

    public class OrderReservation {
        @AuraEnabled public Id reservationId;
        @AuraEnabled public Id orderId;
        @AuraEnabled public String orderNumber;
        @AuraEnabled public String customerName;
        @AuraEnabled public Decimal allocatedToday;
        @AuraEnabled public Decimal totalRequiredEffort;
        @AuraEnabled public Decimal completedEffort;
        @AuraEnabled public Decimal remainingEffort;
        @AuraEnabled public Date productionDeadline;
        @AuraEnabled public String status;
        @AuraEnabled public List<OrderItemDetail> items;
    }

    public class OrderItemDetail {
        @AuraEnabled public String productName;
        @AuraEnabled public Decimal quantity;
        @AuraEnabled public Decimal productionHours;
    }

    @AuraEnabled(cacheable=true)
    public static List<CapacityRow> getCapacityPlanningRows() {
        Date todayDate = Date.today();

        // Find latest deadline
        List<Bouquet_Order__c> latestOrder = [
            SELECT Production_Deadline__c
            FROM Bouquet_Order__c
            WHERE Status__c NOT IN :BouquetScheduler.INACTIVE_STATUSES
              AND Production_Deadline__c >= :todayDate
            ORDER BY Production_Deadline__c DESC
            LIMIT 1
        ];
        Date endDate = latestOrder.isEmpty() ? todayDate.addDays(7) : latestOrder[0].Production_Deadline__c;

        List<Bouquet_Capacity__c> caps = [
            SELECT Id, Date__c, Maximum_Hours__c,
                   (SELECT Id, Planned_Hours__c, Completed_Hours__c, Bouquet_Order__c,
                           Bouquet_Order__r.Order_Number__c, Bouquet_Order__r.Customer__r.Name,
                           Bouquet_Order__r.Production_Deadline__c, Bouquet_Order__r.Status__c
                    FROM Reservations__r)
            FROM Bouquet_Capacity__c
            WHERE Date__c >= :todayDate AND Date__c <= :endDate
            ORDER BY Date__c ASC
        ];

        // We need total required and completed for orders in these rows
        Set<Id> orderIds = new Set<Id>();
        for (Bouquet_Capacity__c c : caps) {
            for (Bouquet_Capacity_Reservation__c r : c.Reservations__r) {
                orderIds.add(r.Bouquet_Order__c);
            }
        }

        Map<Id, List<Bouquet_Order_Item__c>> itemsByOrder = new Map<Id, List<Bouquet_Order_Item__c>>();
        Map<Id, Decimal> completedByOrder = new Map<Id, Decimal>();

        if (!orderIds.isEmpty()) {
            for (Bouquet_Order_Item__c item : [SELECT Bouquet_Order__c, Product__r.Name, Quantity__c, Product__r.Production_Hours__c FROM Bouquet_Order_Item__c WHERE Bouquet_Order__c IN :orderIds]) {
                if (!itemsByOrder.containsKey(item.Bouquet_Order__c)) itemsByOrder.put(item.Bouquet_Order__c, new List<Bouquet_Order_Item__c>());
                itemsByOrder.get(item.Bouquet_Order__c).add(item);
            }
            for (AggregateResult ar : [SELECT Bouquet_Order__c, SUM(Completed_Hours__c) total FROM Bouquet_Capacity_Reservation__c WHERE Bouquet_Order__c IN :orderIds GROUP BY Bouquet_Order__c]) {
                completedByOrder.put((Id)ar.get('Bouquet_Order__c'), (Decimal)ar.get('total'));
            }
        }

        List<CapacityRow> rows = new List<CapacityRow>();
        for (Bouquet_Capacity__c cap : caps) {
            CapacityRow row = new CapacityRow();
            row.capacityDate = cap.Date__c;
            row.dailyCapacity = cap.Maximum_Hours__c;
            row.used = 0;
            row.orders = new List<OrderReservation>();

            for (Bouquet_Capacity_Reservation__c res : cap.Reservations__r) {
                row.used += res.Planned_Hours__c;

                OrderReservation orRes = new OrderReservation();
                orRes.reservationId = res.Id;
                orRes.orderId = res.Bouquet_Order__c;
                orRes.orderNumber = res.Bouquet_Order__r.Order_Number__c;
                orRes.customerName = res.Bouquet_Order__r.Customer__r.Name;
                orRes.allocatedToday = res.Planned_Hours__c;
                orRes.productionDeadline = res.Bouquet_Order__r.Production_Deadline__c;
                orRes.status = res.Bouquet_Order__r.Status__c;

                Decimal totalEffort = 0;
                orRes.items = new List<OrderItemDetail>();
                if (itemsByOrder.containsKey(res.Bouquet_Order__c)) {
                    for (Bouquet_Order_Item__c item : itemsByOrder.get(res.Bouquet_Order__c)) {
                        OrderItemDetail oid = new OrderItemDetail();
                        oid.productName = item.Product__r.Name;
                        oid.quantity = item.Quantity__c;
                        oid.productionHours = item.Product__r.Production_Hours__c;
                        orRes.items.add(oid);
                        totalEffort += item.Quantity__c * (item.Product__r.Production_Hours__c != null ? item.Product__r.Production_Hours__c : 0.5);
                    }
                }
                orRes.totalRequiredEffort = totalEffort;
                orRes.completedEffort = completedByOrder.containsKey(res.Bouquet_Order__c) ? completedByOrder.get(res.Bouquet_Order__c) : 0;
                orRes.remainingEffort = Math.max(0, orRes.totalRequiredEffort - orRes.completedEffort);

                row.orders.add(orRes);
            }
            row.remaining = Math.max(0, row.dailyCapacity - row.used);
            row.isFull = row.remaining <= 0.001;
            rows.add(row);
        }

        return rows;
    }

    @AuraEnabled
    public static void overrideCapacity(Date overrideDate, Decimal maximumHours) {
        List<Bouquet_Capacity__c> caps = [SELECT Id FROM Bouquet_Capacity__c WHERE Date__c = :overrideDate LIMIT 1];
        if (caps.isEmpty()) {
            insert new Bouquet_Capacity__c(Date__c = overrideDate, Name = overrideDate.toString(), Maximum_Hours__c = maximumHours);
        } else {
            caps[0].Maximum_Hours__c = maximumHours;
            update caps[0];
        }
    }

    @AuraEnabled
    public static Decimal updateProgress(Id orderId, Date progressDate, Decimal completedHours) {
        List<Bouquet_Capacity_Reservation__c> res = [
            SELECT Id, Completed_Hours__c
            FROM Bouquet_Capacity_Reservation__c
            WHERE Bouquet_Order__c = :orderId
              AND Bouquet_Capacity__r.Date__c = :progressDate
            LIMIT 1
        ];

        if (res.isEmpty()) {
            throw new AuraHandledException('No reservation found for this order on this date');
        }

        res[0].Completed_Hours__c = (res[0].Completed_Hours__c != null ? res[0].Completed_Hours__c : 0) + completedHours;
        update res[0];

        AggregateResult ar = [SELECT SUM(Completed_Hours__c) total FROM Bouquet_Capacity_Reservation__c WHERE Bouquet_Order__c = :orderId];
        return (Decimal)ar.get('total');
    }
}
