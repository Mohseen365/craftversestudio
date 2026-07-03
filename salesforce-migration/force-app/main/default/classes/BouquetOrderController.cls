public with sharing class BouquetOrderController {

    @AuraEnabled(cacheable=true)
    public static List<Bouquet_Order__c> getOrdersByStatus(String status) {
        try {
            return BouquetOrderSelector.getOrdersByStatus(status);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Bouquet_Order__c> getMyOrders() {
        try {
            // In a real app, we'd filter by current user's contact
            // For this demo, return recent orders for visibility
            return [
                SELECT Id, Order_Number__c, Status__c, Occasion_Date__c, Total_Amount__c, CreatedDate
                FROM Bouquet_Order__c
                WITH SECURITY_ENFORCED
                ORDER BY CreatedDate DESC
                LIMIT 10
            ];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static Map<String, Object> getCapacityPreview(Id orderId, Date productionDeadline) {
        try {
            Bouquet_Order__c ord = [SELECT Id, Order_Number__c, Required_Hours__c FROM Bouquet_Order__c WHERE Id = :orderId WITH SECURITY_ENFORCED];

            BouquetScheduler.SchedulerData data = BouquetScheduler.getSchedulerData(Date.today());
            BouquetScheduler.AcceptabilityResult result = BouquetScheduler.checkAcceptability(
                ord.Id,
                ord.Order_Number__c,
                productionDeadline,
                ord.Required_Hours__c,
                data
            );

            return new Map<String, Object>{
                'canAccept' => result.canAccept,
                'reason' => result.reason,
                'suggestedDates' => result.suggestedDates,
                'requiredCapacity' => ord.Required_Hours__c,
                'productionDeadline' => productionDeadline
            };
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static Map<String, Object> acceptOrder(Id orderId, Integer shippingDurationDays) {
        try {
            return BouquetOrderService.acceptOrder(orderId, shippingDurationDays);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void updateOrderStatus(Id orderId, String status, String trackingNumber) {
        try {
            Bouquet_Order__c ord = new Bouquet_Order__c(Id = orderId, Status__c = status);
            if (String.isNotBlank(trackingNumber)) {
                ord.Tracking_Number__c = trackingNumber;
            }
            update Security.stripInaccessible(AccessType.UPDATABLE, new List<Bouquet_Order__c>{ord}).getRecords();
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static Map<String, Object> placeGuestOrder(Map<String, Object> orderData) {
        Savepoint sp = Database.setSavepoint();
        try {
            // 1. Create or Find Contact
            String email = (String)orderData.get('email');
            List<Contact> contacts = [SELECT Id FROM Contact WHERE Email = :email LIMIT 1];
            Contact guestContact;
            if (contacts.isEmpty()) {
                guestContact = new Contact(
                    FirstName = (String)orderData.get('firstName'),
                    LastName = (String)orderData.get('lastName'),
                    Email = email,
                    Phone = (String)orderData.get('phone')
                );
                insert Security.stripInaccessible(AccessType.CREATABLE, new List<Contact>{guestContact}).getRecords();
            } else {
                guestContact = contacts[0];
            }

            // 2. Create Address
            Bouquet_Address__c addr = new Bouquet_Address__c(
                Customer__c = guestContact.Id,
                Address__c = (String)orderData.get('address'),
                City__c = (String)orderData.get('city'),
                State__c = (String)orderData.get('state'),
                Pincode__c = (String)orderData.get('pincode')
            );
            insert Security.stripInaccessible(AccessType.CREATABLE, new List<Bouquet_Address__c>{addr}).getRecords();

            // 3. Create Order
            Bouquet_Order__c ord = new Bouquet_Order__c();
            ord.Customer__c = guestContact.Id;
            ord.Status__c = 'PENDING_REVIEW';
            ord.Occasion_Type__c = (String)orderData.get('occasionType');
            ord.Occasion_Date__c = Date.valueOf((String)orderData.get('occasionDate'));
            ord.Notes__c = (String)orderData.get('notes');
            ord.Gift_Message__c = (String)orderData.get('giftMessage');

            insert Security.stripInaccessible(AccessType.CREATABLE, new List<Bouquet_Order__c>{ord}).getRecords();

            // 4. Create Order Item
            Id productId = (Id)orderData.get('productId');
            Decimal quantity = Decimal.valueOf(String.valueOf(orderData.get('quantity')));

            Product2 prod = [SELECT Price__c FROM Product2 WHERE Id = :productId LIMIT 1];

            Bouquet_Order_Item__c oi = new Bouquet_Order_Item__c();
            oi.Bouquet_Order__c = ord.Id;
            oi.Product__c = productId;
            oi.Quantity__c = quantity;
            oi.Price__c = prod.Price__c;

            insert Security.stripInaccessible(AccessType.CREATABLE, new List<Bouquet_Order_Item__c>{oi}).getRecords();

            // 5. Update Order Total
            ord.Subtotal__c = oi.Price__c * oi.Quantity__c;
            update Security.stripInaccessible(AccessType.UPDATABLE, new List<Bouquet_Order__c>{ord}).getRecords();

            return new Map<String, Object>{ 'orderId' => ord.Id };
        } catch (Exception e) {
            Database.rollback(sp);
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getOrderDetails(Id orderId) {
        try {
            Bouquet_Order__c ord = [
                SELECT Id, Order_Number__c, Status__c, Occasion_Date__c, Production_Deadline__c,
                       Shipping_Date__c, Tracking_Number__c, Total_Amount__c, Subtotal__c,
                       CreatedDate,
                       (SELECT Id, Product__r.Name, Quantity__c, Price__c FROM Order_Items__r)
                FROM Bouquet_Order__c
                WHERE Id = :orderId
                WITH SECURITY_ENFORCED
            ];

            return new Map<String, Object>{
                'order' => ord,
                'items' => ord.Order_Items__r
            };
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}
