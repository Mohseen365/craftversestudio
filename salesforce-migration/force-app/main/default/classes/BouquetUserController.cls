public with sharing class BouquetUserController {

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getUserProfile() {
        Id userId = UserInfo.getUserId();
        User u = [SELECT Id, ContactId FROM User WHERE Id = :userId WITH SECURITY_ENFORCED];
        Contact c = [SELECT Id, FirstName, LastName, Email, Phone,
                    (SELECT Id, Name, Address__c, City__c, Pincode__c FROM Addresses__r)
                    FROM Contact WHERE Id = :u.ContactId WITH SECURITY_ENFORCED];

        return new Map<String, Object>{
            'user' => u,
            'contact' => c,
            'addresses' => c.Addresses__r
        };
    }
}
