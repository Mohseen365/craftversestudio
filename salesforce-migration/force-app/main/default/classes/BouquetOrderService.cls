public with sharing class BouquetOrderService {

    public static Map<String, Object> acceptOrder(Id orderId, Integer shippingDurationDays) {
        try {
            Bouquet_Order__c order = BouquetOrderSelector.getOrderById(orderId);

            if (order == null || order.Status__c != 'PENDING_REVIEW') {
                throw new BouquetException('Order is not in valid status for acceptance.');
            }

            Date shippingDate = order.Occasion_Date__c.addDays(-shippingDurationDays);
            Date productionDeadline = shippingDate.addDays(-1);
            Decimal requiredHours = order.Required_Hours__c;

            BouquetScheduler.AcceptabilityResult check = BouquetScheduler.checkAcceptability(
                order.Id, order.Order_Number__c, productionDeadline, requiredHours, null
            );

            if (!check.canAccept) {
                throw new BouquetException(check.reason);
            }

            order.Status__c = 'ACCEPTED';
            order.Shipping_Duration_Days__c = shippingDurationDays;
            order.Shipping_Date__c = shippingDate;
            order.Production_Deadline__c = productionDeadline;

            update Security.stripInaccessible(AccessType.UPDATABLE, new List<Bouquet_Order__c>{order}).getRecords();

            BouquetScheduler.persistAllocations(check.allocations, Date.today());

            return new Map<String, Object>{
                'success' => true,
                'suggestedDates' => check.suggestedDates
            };
        } catch (Exception e) {
            BouquetLogger.error('Failed to accept order', e);
            throw e;
        }
    }
}
