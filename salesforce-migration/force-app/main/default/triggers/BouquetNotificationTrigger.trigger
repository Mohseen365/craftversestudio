trigger BouquetNotificationTrigger on Bouquet_Notification_Event__e (after insert) {
    for (Bouquet_Notification_Event__e evt : Trigger.new) {
        BouquetEmailService.sendTemplateEmail(evt.Recipient_Email__c, evt.Template_Name__c, (Id)evt.Order_Id__c);
    }
}
