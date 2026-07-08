public with sharing class BouquetCapacityService {

    public static void overrideCapacity(Date overrideDate, Decimal maximumHours, String reason) {
        List<Bouquet_Capacity__c> caps = [SELECT Id FROM Bouquet_Capacity__c WHERE Date__c = :overrideDate WITH USER_MODE LIMIT 1];
        Bouquet_Capacity__c cap;
        if (caps.isEmpty()) {
            cap = new Bouquet_Capacity__c(
                Date__c = overrideDate,
                Name = overrideDate.toString(),
                Maximum_Hours__c = maximumHours,
                Is_Overridden__c = true,
                Override_Reason__c = reason
            );
            insert as user cap;
        } else {
            cap = caps[0];
            cap.Maximum_Hours__c = maximumHours;
            cap.Is_Overridden__c = true;
            cap.Override_Reason__c = reason;
            update as user cap;
        }

        BouquetLogger.logAudit('CAPACITY_OVERRIDE', cap.Id, 'Bouquet_Capacity__c', null, 'New Limit: ' + maximumHours + ' Reason: ' + reason);

        EventBus.publish(new Bouquet_Schedule_Request__e());
    }
}
