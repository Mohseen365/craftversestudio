public with sharing class BouquetOrderController {

    @AuraEnabled(cacheable=true)
    public static List<Bouquet_Order__c> getOrdersByStatus(String status) {
        return [
            SELECT Id, Name, Order_Number__c, Status__c, Occasion_Date__c, Total_Amount__c,
                   Shipping_Duration_Days__c, Shipping_Date__c, Production_Deadline__c, Tracking_Number__c,
                   Customer__r.Name,
                   (SELECT Id, Quantity__c, Product__r.Name, Product__r.Production_Hours__c FROM Order_Items__r)
            FROM Bouquet_Order__c
            WHERE Status__c = :status
            ORDER BY CreatedDate DESC
        ];
    }

    @AuraEnabled
    public static BouquetScheduler.AcceptabilityResult getCapacityPreview(Id orderId, Integer shippingDurationDays) {
        Bouquet_Order__c order = [
            SELECT Id, Order_Number__c, Occasion_Date__c
            FROM Bouquet_Order__c
            WHERE Id = :orderId
        ];

        if (order.Occasion_Date__c == null) {
            throw new AuraHandledException('Order needs an occasion date before acceptance');
        }

        Date shippingDate = order.Occasion_Date__c.addDays(-shippingDurationDays);
        Date productionDeadline = shippingDate.addDays(-1);
        Decimal requiredHours = BouquetScheduler.calculateOrderHours(orderId);

        return BouquetScheduler.checkAcceptability(
            order.Id,
            order.Order_Number__c,
            productionDeadline,
            requiredHours,
            null
        );
    }

    @AuraEnabled
    public static void acceptOrder(Id orderId, Integer shippingDurationDays) {
        Bouquet_Order__c order = [
            SELECT Id, Order_Number__c, Status__c, Occasion_Date__c
            FROM Bouquet_Order__c
            WHERE Id = :orderId
        ];

        if (order.Status__c != 'PENDING_REVIEW') {
            throw new AuraHandledException('Only orders in PENDING_REVIEW can be accepted');
        }

        if (order.Occasion_Date__c == null) {
            throw new AuraHandledException('Order needs an occasion date before acceptance');
        }

        Date shippingDate = order.Occasion_Date__c.addDays(-shippingDurationDays);
        Date productionDeadline = shippingDate.addDays(-1);
        Decimal requiredHours = BouquetScheduler.calculateOrderHours(orderId);

        BouquetScheduler.AcceptabilityResult check = BouquetScheduler.checkAcceptability(
            order.Id,
            order.Order_Number__c,
            productionDeadline,
            requiredHours,
            null
        );

        if (!check.canAccept) {
            throw new AuraHandledException(check.reason);
        }

        order.Status__c = 'ACCEPTED';
        order.Shipping_Duration_Days__c = shippingDurationDays;
        order.Shipping_Date__c = shippingDate;
        order.Production_Deadline__c = productionDeadline;
        update order;

        BouquetScheduler.persistAllocations(check.allocations, Date.today());
    }

    @AuraEnabled
    public static void updateOrderStatus(Id orderId, String newStatus, String trackingNumber) {
        Bouquet_Order__c order = [SELECT Id, Status__c FROM Bouquet_Order__c WHERE Id = :orderId];
        String oldStatus = order.Status__c;
        order.Status__c = newStatus;
        if (trackingNumber != null) {
            order.Tracking_Number__c = trackingNumber;
        }
        update order;

        // Logic to decide if rebuild is needed
        Boolean wasSchedulable = BouquetScheduler.SCHEDULABLE_STATUSES.contains(oldStatus);
        Boolean isSchedulable = BouquetScheduler.SCHEDULABLE_STATUSES.contains(newStatus);

        if (wasSchedulable != isSchedulable) {
            BouquetScheduler.rebuildSchedule();
        }
    }
}
