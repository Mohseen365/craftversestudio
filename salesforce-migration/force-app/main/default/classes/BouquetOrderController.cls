public with sharing class BouquetOrderController {

    @AuraEnabled(cacheable=true)
    public static List<Bouquet_Order__c> getOrdersByStatus(String status) {
        try {
            return BouquetOrderSelector.getOrdersByStatus(status);
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching orders: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static BouquetScheduler.AcceptabilityResult getCapacityPreview(Id orderId, Integer shippingDurationDays) {
        try {
            Bouquet_Order__c order = BouquetOrderSelector.getOrderById(orderId);
            if (order.Occasion_Date__c == null) {
                throw new AuraHandledException('Order needs an occasion date before acceptance');
            }
            Date shippingDate = order.Occasion_Date__c.addDays(-shippingDurationDays);
            Date productionDeadline = shippingDate.addDays(-1);
            Decimal requiredHours = BouquetScheduler.calculateOrderHours(orderId);
            return BouquetScheduler.checkAcceptability(order.Id, order.Order_Number__c, productionDeadline, requiredHours, null);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static Bouquet_Order__c getOrderTracking(Id orderId) {
        try {
            return [
                SELECT Id, Order_Number__c, Status__c, Total_Amount__c, Tracking_Number__c,
                    (SELECT Id, Status__c FROM Payments__r ORDER BY CreatedDate DESC LIMIT 1)
                FROM Bouquet_Order__c
                WHERE Id = :orderId
                WITH SECURITY_ENFORCED
            ];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void acceptOrder(Id orderId, Map<String, Object> params) {
        try {
            Integer shippingDurationDays = Integer.valueOf(params.get('shippingDurationDays'));
            Decimal customCharge = params.get('customizationCharge') != null ? Decimal.valueOf(String.valueOf(params.get('customizationCharge'))) : 0;
            Decimal deliveryCharge = params.get('deliveryCharge') != null ? Decimal.valueOf(String.valueOf(params.get('deliveryCharge'))) : 0;
            Decimal urgentCharge = params.get('urgentOrderCharge') != null ? Decimal.valueOf(String.valueOf(params.get('urgentOrderCharge'))) : 0;

            BouquetOrderService.acceptOrder(orderId, shippingDurationDays, customCharge, deliveryCharge, urgentCharge);
        } catch (BouquetException e) {
            throw new AuraHandledException(e.getMessage());
        } catch (Exception e) {
            throw new AuraHandledException('An unexpected error occurred: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static void updateOrderStatus(Id orderId, String newStatus, String trackingNumber) {
        try {
            Bouquet_Order__c order = new Bouquet_Order__c(Id = orderId, Status__c = newStatus);
            if (trackingNumber != null) {
                order.Tracking_Number__c = trackingNumber;
            }
            update Security.stripInaccessible(AccessType.UPDATABLE, new List<Bouquet_Order__c>{order}).getRecords();
        } catch (Exception e) {
            throw new AuraHandledException('Error updating order: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static Map<String, Object> placeGuestOrder(Map<String, Object> orderData) {
        Savepoint sp = Database.setSavepoint();
        try {
            String email = (String)orderData.get('email');
            List<Contact> contacts = [SELECT Id FROM Contact WHERE Email = :email WITH SECURITY_ENFORCED LIMIT 1];
            Contact c;
            if (contacts.isEmpty()) {
                c = new Contact(
                    FirstName = (String)orderData.get('firstName'),
                    LastName = (String)orderData.get('lastName'),
                    Email = email,
                    Phone = (String)orderData.get('phone')
                );
                insert Security.stripInaccessible(AccessType.CREATABLE, new List<Contact>{c}).getRecords();
            } else {
                c = contacts[0];
            }

            Bouquet_Address__c addr = new Bouquet_Address__c(
                Customer__c = c.Id,
                Address__c = (String)orderData.get('address'),
                City__c = (String)orderData.get('city'),
                Pincode__c = (String)orderData.get('pincode'),
                Name = 'Home'
            );
            insert Security.stripInaccessible(AccessType.CREATABLE, new List<Bouquet_Address__c>{addr}).getRecords();

            Bouquet_Order__c ord = new Bouquet_Order__c(
                Customer__c = c.Id,
                Status__c = 'PENDING_REVIEW',
                Occasion_Date__c = Date.valueOf((String)orderData.get('occasionDate')),
                Occasion_Type__c = (String)orderData.get('occasionType'),
                Total_Amount__c = (Decimal)orderData.get('totalAmount'),
                Notes__c = (String)orderData.get('notes')
            );
            insert Security.stripInaccessible(AccessType.CREATABLE, new List<Bouquet_Order__c>{ord}).getRecords();

            Bouquet_Order_Item__c item = new Bouquet_Order_Item__c(
                Bouquet_Order__c = ord.Id,
                Product__c = (Id)orderData.get('productId'),
                Quantity__c = (Decimal)orderData.get('quantity'),
                Production_Hours__c = (Decimal)orderData.get('productionHours'),
                Hours_Required__c = ((Decimal)orderData.get('productionHours') * (Decimal)orderData.get('quantity'))
            );
            insert Security.stripInaccessible(AccessType.CREATABLE, new List<Bouquet_Order_Item__c>{item}).getRecords();

            return new Map<String, Object>{
                'orderId' => ord.Id,
                'orderNumber' => ord.Order_Number__c
            };
        } catch (Exception e) {
            Database.rollback(sp);
            throw new AuraHandledException(e.getMessage());
        }
    }
}
