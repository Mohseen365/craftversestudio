@IsTest
public class BouquetOrderServiceTest {
    @TestSetup
    static void setup() {
        Product2 p = new Product2(Name = 'Rose', Production_Hours__c = 1.0, IsActive = true);
        insert p;
        Contact c = new Contact(LastName = 'Customer');
        insert c;
        Bouquet_Order__c o = new Bouquet_Order__c(
            Customer__c = c.Id, Status__c = 'PENDING_REVIEW',
            Occasion_Date__c = Date.today().addDays(10), Subtotal__c = 100
        );
        insert o;
        insert new Bouquet_Order_Item__c(Bouquet_Order__c = o.Id, Product__c = p.Id, Quantity__c = 1, Production_Hours__c = 1.0, Hours_Required__c = 1.0);
    }

    @IsTest
    static void testAcceptOrder() {
        Bouquet_Order__c o = [SELECT Id FROM Bouquet_Order__c LIMIT 1];
        Test.startTest();
        BouquetOrderService.acceptOrder(o.Id, 3);
        Test.stopTest();
        Bouquet_Order__c updated = [SELECT Status__c FROM Bouquet_Order__c WHERE Id = :o.Id];
        System.assertEquals('ACCEPTED', updated.Status__c);
    }
}
