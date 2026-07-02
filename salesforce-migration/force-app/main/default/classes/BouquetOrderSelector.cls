public with sharing class BouquetOrderSelector {
    public static List<Bouquet_Order__c> getOrdersByStatus(String status) {
        return [
            SELECT Id, Order_Number__c, Status__c, Occasion_Date__c, Total_Amount__c,
                   Shipping_Duration_Days__c, Shipping_Date__c, Production_Deadline__c, Tracking_Number__c,
                   Customer__r.Name, Customization_Charge__c, Delivery_Charge__c, Urgent_Order_Charge__c, Notes__c,
                   (SELECT Id, Quantity__c, Product__r.Name, Product__r.Production_Hours__c FROM Order_Items__r)
            FROM Bouquet_Order__c
            WHERE Status__c = :status
            WITH SECURITY_ENFORCED
            ORDER BY CreatedDate DESC
        ];
    }

    public static Bouquet_Order__c getOrderById(Id orderId) {
        List<Bouquet_Order__c> orders = [
            SELECT Id, Order_Number__c, Status__c, Occasion_Date__c, Total_Amount__c,
                   Shipping_Duration_Days__c, Shipping_Date__c, Production_Deadline__c, Is_Urgent__c
            FROM Bouquet_Order__c
            WHERE Id = :orderId
            WITH SECURITY_ENFORCED
        ];
        return orders.isEmpty() ? null : orders[0];
    }

    public static List<ContentDocumentLink> getPaymentFiles(Id orderId) {
        return [
            SELECT ContentDocumentId, ContentDocument.Title, ContentDocument.LatestPublishedVersionId
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :orderId
            WITH SECURITY_ENFORCED
        ];
    }
}
