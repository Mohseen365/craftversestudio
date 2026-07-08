public with sharing class BouquetUserController {

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getUserProfile() {
        try {
            Id userId = UserInfo.getUserId();
            User u = [SELECT Id, Name, ContactId, UserType FROM User WHERE Id = :userId WITH USER_MODE LIMIT 1];

            if (u.ContactId == null) {
                return new Map<String, Object>{
                    'isGuest' => u.UserType == 'Guest',
                    'user' => u
                };
            }

            Contact c = [SELECT Id, FirstName, LastName, Email, Phone,
                        (SELECT Id, Name, Address__c, City__c, State__c, Pincode__c FROM Addresses__r)
                        FROM Contact WHERE Id = :u.ContactId WITH USER_MODE];

            return new Map<String, Object>{
                'isGuest' => false,
                'user' => u,
                'contact' => c,
                'addresses' => c.Addresses__r
            };
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static Boolean isUserLoggedIn() {
        return UserInfo.getUserType() != 'Guest';
    }
}
