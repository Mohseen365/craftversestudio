public with sharing class BouquetOrderTriggerHandler {
    public void run() {
        if (Trigger.isBefore && Trigger.isInsert) {
            beforeInsert((List<Bouquet_Order__c>)Trigger.new);
        } else if (Trigger.isAfter && Trigger.isUpdate) {
            afterUpdate((List<Bouquet_Order__c>)Trigger.new, (Map<Id, Bouquet_Order__c>)Trigger.oldMap);
        }
    }

    private void beforeInsert(List<Bouquet_Order__c> newOrders) {
        for (Bouquet_Order__c ord : newOrders) {
            if (String.isBlank(ord.Order_Number__c)) {
                ord.Order_Number__c = 'BQ-' + String.valueOf(Crypto.getRandomInteger()).right(8);
            }
        }
    }

    private void afterUpdate(List<Bouquet_Order__c> newOrders, Map<Id, Bouquet_Order__c> oldOrders) {
        Boolean rebuildNeeded = false;
        for (Bouquet_Order__c ord : newOrders) {
            Bouquet_Order__c oldOrd = oldOrders.get(ord.Id);
            if (ord.Status__c != oldOrd.Status__c) {
                Boolean wasSchedulable = BouquetScheduler.SCHEDULABLE_STATUSES.contains(oldOrd.Status__c);
                Boolean isSchedulable = BouquetScheduler.SCHEDULABLE_STATUSES.contains(ord.Status__c);
                if (wasSchedulable != isSchedulable) {
                    rebuildNeeded = true;
                    break;
                }
            }
        }

        if (rebuildNeeded) {
            // Optimized: Publish platform event to trigger async queueable rebuild
            EventBus.publish(new Bouquet_Schedule_Request__e());
        }
    }
}
