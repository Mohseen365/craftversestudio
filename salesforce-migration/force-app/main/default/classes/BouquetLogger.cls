public with sharing class BouquetLogger {

    public enum Severity { INFO, WARNING, ERROR }

    public static void log(String message, Severity sev, String stackTrace) {
        Bouquet_Log__c log = new Bouquet_Log__c(
            Message__c = message,
            Severity__c = sev.name(),
            Stack_Trace__c = stackTrace
        );
        insert Security.stripInaccessible(AccessType.CREATABLE, new List<Bouquet_Log__c>{log}).getRecords();
    }

    public static void error(String message, Exception e) {
        log(message + ': ' + e.getMessage(), Severity.ERROR, e.getStackTraceString());
    }

    public static void logEvent(String eventType, Id userId, Id productId, Id orderId, Map<String, Object> metadata) {
        Bouquet_Event__c evt = new Bouquet_Event__c(
            User__c = userId,
            Product__c = productId,
            Order__c = orderId,
            Event_Type__c = eventType,
            Metadata__c = metadata != null ? JSON.serialize(metadata) : null
        );
        insert Security.stripInaccessible(AccessType.CREATABLE, new List<Bouquet_Event__c>{evt}).getRecords();
    }

    public static void logAudit(String action, Id entityId, String entityType, String beforeJson, String afterJson) {
        Bouquet_Audit_Log__c audit = new Bouquet_Audit_Log__c(
            Action__c = action,
            Entity_Id__c = entityId,
            Entity_Type__c = entityType,
            Before_Data__c = beforeJson,
            After_Data__c = afterJson,
            User__c = UserInfo.getUserId()
        );
        insert Security.stripInaccessible(AccessType.CREATABLE, new List<Bouquet_Audit_Log__c>{audit}).getRecords();
    }
}
