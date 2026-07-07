public with sharing class BouquetEmailService {

    public static void sendTemplateEmail(String recipientEmail, String templateApiName, Id targetObjectId) {
        try {
            EmailTemplate et = [SELECT Id FROM EmailTemplate WHERE DeveloperName = :templateApiName LIMIT 1];

            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setToAddresses(new String[] { recipientEmail });
            mail.setTemplateId(et.Id);
            mail.setTargetObjectId(targetObjectId);
            mail.setSaveAsActivity(true);

            Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
        } catch (Exception e) {
            BouquetLogger.error('Failed to send email ' + templateApiName, e);
        }
    }
}
