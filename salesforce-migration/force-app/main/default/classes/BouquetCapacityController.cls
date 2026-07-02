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
    }

    @AuraEnabled(cacheable=true)
    public static List<CapacityRow> getCapacityPlanningRows() {
        try {
            Date todayDate = Date.today();

            // Find latest deadline efficiently
            List<Bouquet_Order__c> latestOrder = [
                SELECT Production_Deadline__c
                FROM Bouquet_Order__c
                WHERE Status__c NOT IN :BouquetScheduler.INACTIVE_STATUSES
                  AND Production_Deadline__c >= :todayDate
                ORDER BY Production_Deadline__c DESC
                LIMIT 1
            ];
            Date endDate = latestOrder.isEmpty() ? todayDate.addDays(7) : latestOrder[0].Production_Deadline__c;

            // Performance Optimization: Map-based join logic to handle large datasets
            List<Bouquet_Capacity__c> caps = [
                SELECT Id, Date__c, Maximum_Hours__c,
                       (SELECT Id, Planned_Hours__c, Completed_Hours__c, Bouquet_Order__c,
                               Bouquet_Order__r.Order_Number__c, Bouquet_Order__r.Customer__r.Name,
                               Bouquet_Order__r.Production_Deadline__c, Bouquet_Order__r.Status__c,
                               Bouquet_Order__r.Required_Hours__c, Bouquet_Order__r.Completed_Hours__c
                        FROM Reservations__r)
                FROM Bouquet_Capacity__c
                WHERE Date__c >= :todayDate AND Date__c <= :endDate
                WITH SECURITY_ENFORCED
                ORDER BY Date__c ASC
            ];

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

                    // Native Optimization: Use Roll-up Summary fields instead of manual SOQL loops
                    orRes.totalRequiredEffort = res.Bouquet_Order__r.Required_Hours__c;
                    orRes.completedEffort = res.Bouquet_Order__r.Completed_Hours__c;
                    orRes.remainingEffort = Math.max(0, orRes.totalRequiredEffort - orRes.completedEffort);

                    row.orders.add(orRes);
                }
                row.remaining = Math.max(0, row.dailyCapacity - row.used);
                row.isFull = row.remaining <= 0.001;
                rows.add(row);
            }
            return rows;
        } catch (Exception e) {
            BouquetLogger.error('Error fetching capacity rows', e);
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void overrideCapacity(Date overrideDate, Decimal maximumHours) {
        try {
            List<Bouquet_Capacity__c> caps = [SELECT Id FROM Bouquet_Capacity__c WHERE Date__c = :overrideDate WITH SECURITY_ENFORCED LIMIT 1];
            if (caps.isEmpty()) {
                Bouquet_Capacity__c newCap = new Bouquet_Capacity__c(Date__c = overrideDate, Name = overrideDate.toString(), Maximum_Hours__c = maximumHours);
                insert Security.stripInaccessible(AccessType.CREATABLE, new List<Bouquet_Capacity__c>{newCap}).getRecords();
            } else {
                caps[0].Maximum_Hours__c = maximumHours;
                update Security.stripInaccessible(AccessType.UPDATABLE, caps).getRecords();
            }
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static Decimal updateProgress(Id orderId, Date progressDate, Decimal completedHours) {
        try {
            List<Bouquet_Capacity_Reservation__c> res = [
                SELECT Id, Completed_Hours__c
                FROM Bouquet_Capacity_Reservation__c
                WHERE Bouquet_Order__c = :orderId
                  AND Bouquet_Capacity__r.Date__c = :progressDate
                WITH SECURITY_ENFORCED
                LIMIT 1
            ];

            if (res.isEmpty()) {
                throw new BouquetException('No reservation found for this order on this date');
            }

            res[0].Completed_Hours__c = (res[0].Completed_Hours__c != null ? res[0].Completed_Hours__c : 0) + completedHours;
            update Security.stripInaccessible(AccessType.UPDATABLE, res).getRecords();

            // Native Optimization: Use Order roll-up instead of manual aggregate query
            Bouquet_Order__c ord = [SELECT Completed_Hours__c FROM Bouquet_Order__c WHERE Id = :orderId];
            return ord.Completed_Hours__c;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}
