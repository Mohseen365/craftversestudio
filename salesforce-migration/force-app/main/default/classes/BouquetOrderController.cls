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

    @AuraEnabled
    public static Map<String, Object> placeGuestOrder(Map<String, Object> orderData) {
        Savepoint sp = Database.setSavepoint();
        try {
            // 1. Find or create Contact
            String email = (String)orderData.get('email');
            List<Contact> contacts = [SELECT Id FROM Contact WHERE Email = :email LIMIT 1];
            Contact c;
            if (contacts.isEmpty()) {
                c = new Contact(
                    FirstName = (String)orderData.get('firstName'),
                    LastName = (String)orderData.get('lastName'),
                    Email = email,
                    Phone = (String)orderData.get('phone')
                );
                insert c;
            } else {
                c = contacts[0];
            }

            // 2. Create Order
            Bouquet_Order__c ord = new Bouquet_Order__c(
                Customer__c = c.Id,
                Status__c = 'PENDING_REVIEW',
                Occasion_Date__c = Date.valueOf((String)orderData.get('occasionDate')),
                Order_Number__c = 'BQ-' + String.valueOf(DateTime.now().getTime()).right(8),
                Total_Amount__c = (Decimal)orderData.get('totalAmount')
            );
            insert ord;

            // 3. Create Order Item
            Bouquet_Order_Item__c item = new Bouquet_Order_Item__c(
                Bouquet_Order__c = ord.Id,
                Product__c = (Id)orderData.get('productId'),
                Quantity__c = (Decimal)orderData.get('quantity')
            );
            insert item;

            return new Map<String, Object>{
                'orderId' => ord.Id,
                'orderNumber' => ord.Order_Number__c
            };
        } catch (Exception e) {
            Database.rollback(sp);
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static Bouquet_Order__c getOrderTracking(Id orderId) {
        return [
            SELECT Id, Order_Number__c, Status__c, Total_Amount__c, Tracking_Number__c,
                   (SELECT Id, Status__c FROM Payments__r ORDER BY CreatedDate DESC LIMIT 1)
            FROM Bouquet_Order__c
            WHERE Id = :orderId
        ];
    }
}
