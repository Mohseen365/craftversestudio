@IsTest
public class BouquetTriggerTest {
    @IsTest
    static void testOrderTrigger() {
        Contact c = new Contact(LastName = 'Test');
        insert c;
        Bouquet_Order__c o = new Bouquet_Order__c(Customer__c = c.Id, Status__c = 'PENDING_REVIEW', Occasion_Date__c = Date.today().addDays(5), Subtotal__c = 10);

        Test.startTest();
        insert o;
        Test.stopTest();

        Bouquet_Order__c inserted = [SELECT Order_Number__c FROM Bouquet_Order__c WHERE Id = :o.Id];
        System.assert(inserted.Order_Number__c.startsWith('BQ-'));
    }
}
