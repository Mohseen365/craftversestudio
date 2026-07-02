trigger BouquetNotificationTrigger on Bouquet_Notification_Event__e (after insert) {
    for (Bouquet_Notification_Event__e evt : Trigger.new) {
        // Correct implementation for asynchronous email delivery
        Id orderId = (Id)evt.get('Order_Id__c'); // Assuming Order_Id__c field exists
        BouquetEmailService.sendTemplateEmail(evt.Recipient_Email__c, evt.Template_Name__c, orderId);
    }
}
