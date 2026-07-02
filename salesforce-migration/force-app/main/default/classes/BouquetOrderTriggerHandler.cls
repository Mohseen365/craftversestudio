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
                // Better unique ID generation
                ord.Order_Number__c = 'BQ-' + String.valueOf(DateTime.now().getTime()).right(4) + String.valueOf(Crypto.getRandomInteger()).right(4).replace('-', '0');
            }
        }
    }

    private void afterUpdate(List<Bouquet_Order__c> newOrders, Map<Id, Bouquet_Order__c> oldOrders) {
        Boolean rebuildNeeded = false;
        List<Bouquet_Notification_Event__e> notifications = new List<Bouquet_Notification_Event__e>();

        // Native Optimization: Bulk fetch contact emails for notifications
        Set<Id> customerIds = new Set<Id>();
        for (Bouquet_Order__c ord : newOrders) customerIds.add(ord.Customer__c);
        Map<Id, Contact> customerMap = new Map<Id, Contact>([SELECT Email FROM Contact WHERE Id IN :customerIds]);

        for (Bouquet_Order__c ord : newOrders) {
            Bouquet_Order__c oldOrd = oldOrders.get(ord.Id);
            if (ord.Status__c != oldOrd.Status__c) {
                // Scheduling check
                Boolean wasSchedulable = BouquetScheduler.SCHEDULABLE_STATUSES.contains(oldOrd.Status__c);
                Boolean isSchedulable = BouquetScheduler.SCHEDULABLE_STATUSES.contains(ord.Status__c);
                if (wasSchedulable != isSchedulable) {
                    rebuildNeeded = true;
                }

                // Native Optimization: Decoupled Notifications via Platform Events with real Emails
                String email = customerMap.get(ord.Customer__c)?.Email;
                if (String.isNotBlank(email)) {
                    if (ord.Status__c == 'ACCEPTED') {
                        notifications.add(new Bouquet_Notification_Event__e(Template_Name__c = 'Order_Accepted', Recipient_Email__c = email, Order_Id__c = ord.Id));
                    } else if (ord.Status__c == 'CONFIRMED') {
                        notifications.add(new Bouquet_Notification_Event__e(Template_Name__c = 'Payment_Verified', Recipient_Email__c = email, Order_Id__c = ord.Id));
                    }
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
