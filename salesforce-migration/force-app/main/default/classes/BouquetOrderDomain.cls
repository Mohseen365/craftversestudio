public with sharing class BouquetOrderDomain {
    private List<Bouquet_Order__c> records;
    private Map<Id, Bouquet_Order__c> oldMap;

    public BouquetOrderDomain(List<Bouquet_Order__c> records, Map<Id, Bouquet_Order__c> oldMap) {
        this.records = records;
        this.oldMap = oldMap;
    }

    public void generateOrderNumbers() {
        for (Bouquet_Order__c ord : records) {
            if (String.isBlank(ord.Order_Number__c)) {
                ord.Order_Number__c = 'BQ-' + String.valueOf(DateTime.now().getTime()).right(4) + String.valueOf(Crypto.getRandomInteger()).right(4).replace('-', '0');
            }
        }
    }

    public void handleStatusChanges() {
        Boolean rebuildNeeded = false;
        List<Bouquet_Notification_Event__e> notifications = new List<Bouquet_Notification_Event__e>();

        Set<Id> customerIds = new Set<Id>();
        for (Bouquet_Order__c ord : records) customerIds.add(ord.Customer__c);
        Map<Id, Contact> customerMap = new Map<Id, Contact>([SELECT Email FROM Contact WHERE Id IN :customerIds]);

        for (Bouquet_Order__c ord : records) {
            Bouquet_Order__c oldOrd = oldMap.get(ord.Id);
            if (ord.Status__c != oldOrd.Status__c) {
                // Validation: Prevent moving back from Terminal statuses
                if (isTerminalStatus(oldOrd.Status__c) && ord.Status__c != oldOrd.Status__c) {
                    ord.addError('Cannot change status of a delivered or cancelled order.');
                    continue;
                }

                if (schedulingImpacted(oldOrd.Status__c, ord.Status__c)) rebuildNeeded = true;

                String email = customerMap.get(ord.Customer__c)?.Email;
                if (String.isNotBlank(email)) {
                    Bouquet_Notification_Event__e note = createNotification(ord, email);
                    if (note != null) notifications.add(note);
                }
            }
        }

        if (rebuildNeeded) EventBus.publish(new Bouquet_Schedule_Request__e());
        if (!notifications.isEmpty()) EventBus.publish(notifications);
    }

    private Boolean isTerminalStatus(String status) {
        return status == 'DELIVERED' || status == 'CANCELLED' || status == 'REFUNDED';
    }

    private Boolean schedulingImpacted(String oldStatus, String newStatus) {
        Boolean wasSchedulable = BouquetScheduler.SCHEDULABLE_STATUSES.contains(oldStatus);
        Boolean isSchedulable = BouquetScheduler.SCHEDULABLE_STATUSES.contains(newStatus);
        return wasSchedulable != isSchedulable;
    }

    private Bouquet_Notification_Event__e createNotification(Bouquet_Order__c ord, String email) {
        String template = null;
        if (ord.Status__c == 'ACCEPTED') template = 'Order_Accepted';
        else if (ord.Status__c == 'CONFIRMED') template = 'Payment_Verified';
        else if (ord.Status__c == 'SHIPPED') template = 'Order_Shipped';

        return template != null ? new Bouquet_Notification_Event__e(
            Template_Name__c = template,
            Recipient_Email__c = email,
            Order_Id__c = ord.Id
        ) : null;
    }
}
