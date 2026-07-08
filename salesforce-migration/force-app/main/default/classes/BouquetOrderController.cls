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
            Id userId = UserInfo.getUserId();
            List<User> users = [SELECT ContactId FROM User WHERE Id = :userId WITH USER_MODE LIMIT 1];

            if (users.isEmpty() || users[0].ContactId == null) {
                return new List<Bouquet_Order__c>();
            }

            return BouquetOrderSelector.getOrdersByCustomer(users[0].ContactId);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static Map<String, Object> trackOrder(String orderNumber, String mobileNo) {
        try {
            List<Bouquet_Order__c> orders = [
                SELECT Id
                FROM Bouquet_Order__c
                WHERE Order_Number__c = :orderNumber
                  AND Customer__r.Phone = :mobileNo
                WITH USER_MODE
                LIMIT 1
            ];

            if (orders.isEmpty()) {
                throw new BouquetException('Order not found. Please check your order number and mobile number.');
            }

            return new Map<String, Object>{ 'orderId' => orders[0].Id };
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static Map<String, Object> getCapacityPreview(Id orderId, Date productionDeadline) {
        try {
            Bouquet_Order__c ord = [SELECT Id, Order_Number__c, Required_Hours__c FROM Bouquet_Order__c WHERE Id = :orderId WITH USER_MODE];

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
            update as user ord;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static Map<String, Object> placeGuestOrder(Map<String, Object> orderData) {
        Savepoint sp = Database.setSavepoint();
        try {
            Id customerId;

            if (UserInfo.getUserType() != 'Guest') {
                List<User> currentUser = [SELECT ContactId FROM User WHERE Id = :UserInfo.getUserId() WITH USER_MODE LIMIT 1];
                customerId = currentUser[0].ContactId;
            } else {
                String email = (String)orderData.get('email');
                List<Contact> contacts = [SELECT Id FROM Contact WHERE Email = :email WITH USER_MODE LIMIT 1];
                if (contacts.isEmpty()) {
                    Contact guestContact = new Contact(
                        FirstName = (String)orderData.get('firstName'),
                        LastName = (String)orderData.get('lastName'),
                        Email = email,
                        Phone = (String)orderData.get('phone')
                    );
                    insert as user guestContact;
                    customerId = guestContact.Id;
                } else {
                    customerId = contacts[0].Id;
                }
            }

            // Create Address
            String street = (String)orderData.get('address');
            String city = (String)orderData.get('city');
            String state = (String)orderData.get('state');
            String pincode = (String)orderData.get('pincode');

            List<Bouquet_Address__c> existing = [SELECT Id FROM Bouquet_Address__c WHERE Customer__c = :customerId AND Address__c = :street AND City__c = :city LIMIT 1];
            if (existing.isEmpty()) {
                Bouquet_Address__c addr = new Bouquet_Address__c(
                    Customer__c = customerId, Address__c = street, City__c = city, State__c = state, Pincode__c = pincode
                );
                insert as user addr;
            }

            // Create Order
            Bouquet_Order__c ord = new Bouquet_Order__c();
            ord.Customer__c = customerId;
            ord.Status__c = 'PENDING_REVIEW';
            ord.Occasion_Type__c = (String)orderData.get('occasionType');
            ord.Occasion_Date__c = Date.valueOf((String)orderData.get('occasionDate'));
            ord.Notes__c = (String)orderData.get('notes');
            ord.Gift_Message__c = (String)orderData.get('giftMessage');
            insert as user ord;

            // Create Order Item
            Id productId = (Id)orderData.get('productId');
            Decimal quantity = Decimal.valueOf(String.valueOf(orderData.get('quantity')));
            Product2 prod = [SELECT Price__c, Production_Hours__c FROM Product2 WHERE Id = :productId WITH USER_MODE LIMIT 1];

            Bouquet_Order_Item__c oi = new Bouquet_Order_Item__c();
            oi.Bouquet_Order__c = ord.Id;
            oi.Product__c = productId;
            oi.Quantity__c = quantity;
            oi.Price__c = prod.Price__c;
            oi.Production_Hours__c = prod.Production_Hours__c;
            oi.Hours_Required__c = (prod.Production_Hours__c != null ? prod.Production_Hours__c : 0) * quantity;
            insert as user oi;

            ord.Subtotal__c = oi.Price__c * oi.Quantity__c;
            update as user ord;

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
                WITH USER_MODE
            ];

            return new Map<String, Object>{
                'order' => ord,
                'items' => ord.Order_Items__r
            };
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getOrderFiles(Id orderId) {
        try {
            List<ContentDocumentLink> links = BouquetOrderSelector.getPaymentFiles(orderId);
            List<Map<String, String>> files = new List<Map<String, String>>();
            for (ContentDocumentLink link : links) {
                files.add(new Map<String, String>{
                    'id' => link.ContentDocumentId,
                    'title' => link.ContentDocument.Title,
                    'versionId' => link.ContentDocument.LatestPublishedVersionId
                });
            }
            return files;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}
