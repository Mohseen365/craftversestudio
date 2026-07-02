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
        List<Bouquet_Notification_Event__e> notifications = new List<Bouquet_Notification_Event__e>();

        for (Bouquet_Order__c ord : newOrders) {
            Bouquet_Order__c oldOrd = oldOrders.get(ord.Id);
            if (ord.Status__c != oldOrd.Status__c) {
                // Scheduling check
                Boolean wasSchedulable = BouquetScheduler.SCHEDULABLE_STATUSES.contains(oldOrd.Status__c);
                Boolean isSchedulable = BouquetScheduler.SCHEDULABLE_STATUSES.contains(ord.Status__c);
                if (wasSchedulable != isSchedulable) {
                    rebuildNeeded = true;
                }

                // Native Optimization: Decoupled Notifications via Platform Events
                if (ord.Status__c == 'ACCEPTED') {
                    notifications.add(new Bouquet_Notification_Event__e(Template_Name__c = 'Order_Accepted', Recipient_Email__c = 'customer@example.com'));
                } else if (ord.Status__c == 'CONFIRMED') {
                    notifications.add(new Bouquet_Notification_Event__e(Template_Name__c = 'Payment_Verified', Recipient_Email__c = 'customer@example.com'));
                }
            }
        }

        if (rebuildNeeded) {
            EventBus.publish(new Bouquet_Schedule_Request__e());
        }
        if (!notifications.isEmpty()) {
            EventBus.publish(notifications);
        }
    }
}
