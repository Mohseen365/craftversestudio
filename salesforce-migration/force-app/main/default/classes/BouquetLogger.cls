public with sharing class BouquetLogger {

    public static void logEvent(String eventType, Id userId, Id productId, Id orderId, Map<String, Object> metadata) {
        Bouquet_Event__c evt = new Bouquet_Event__c();
        evt.User__c = userId;
        evt.Product__c = productId;
        evt.Order__c = orderId;
        evt.Event_Type__c = eventType;
        if (metadata != null) {
            evt.Metadata__c = JSON.serialize(metadata);
        }
        insert evt;
    }

    public static void logAudit(String action, String entityId, String entityType, String beforeJson, String afterJson) {
        insert new Bouquet_Audit_Log__c(
            Action__c = action,
            Entity_Id__c = entityId,
            Entity_Type__c = entityType,
            Before_JSON__c = beforeJson,
            After_JSON__c = afterJson,
            User__c = UserInfo.getUserId()
        );
    }
}
