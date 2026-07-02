public with sharing class BouquetOrderService {

    public static void acceptOrder(Id orderId, Integer shippingDurationDays, Decimal customCharge, Decimal deliveryCharge, Decimal urgentCharge) {
        Bouquet_Order__c order = BouquetOrderSelector.getOrderById(orderId);

        if (order == null || order.Status__c != 'PENDING_REVIEW') {
            throw new BouquetException('Order is not in valid status for acceptance.');
        }

        Date shippingDate = order.Occasion_Date__c.addDays(-shippingDurationDays);
        Date productionDeadline = shippingDate.addDays(-1);
        Decimal requiredHours = BouquetScheduler.calculateOrderHours(orderId);

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
        order.Customization_Charge__c = customCharge;
        order.Delivery_Charge__c = deliveryCharge;
        order.Urgent_Order_Charge__c = urgentCharge;

        update Security.stripInaccessible(AccessType.UPDATABLE, new List<Bouquet_Order__c>{order}).getRecords();

        BouquetScheduler.persistAllocations(check.allocations, Date.today());
    }
}
