@IsTest
public class BouquetOrderControllerTest {
    @TestSetup
    static void setup() {
        Product2 p = new Product2(Name = 'Rose', Production_Hours__c = 1.0, IsActive = true);
        insert p;

        Contact c = new Contact(LastName = 'Customer');
        insert c;

        Bouquet_Order__c o = new Bouquet_Order__c(
            Customer__c = c.Id,
            Status__c = 'PENDING_REVIEW',
            Occasion_Date__c = Date.today().addDays(10),
            Order_Number__c = 'TEST-001',
            Total_Amount__c = 100
        );
        insert o;

        Bouquet_Order_Item__c item = new Bouquet_Order_Item__c(
            Bouquet_Order__c = o.Id,
            Product__c = p.Id,
            Quantity__c = 2
        );
        insert item;
    }

    @IsTest
    static void testGetOrders() {
        List<Bouquet_Order__c> orders = BouquetOrderController.getOrdersByStatus('PENDING_REVIEW');
        System.assertEquals(1, orders.size());
    }

    @IsTest
    static void testAcceptOrder() {
        Bouquet_Order__c o = [SELECT Id FROM Bouquet_Order__c LIMIT 1];
        Test.startTest();
        BouquetOrderController.acceptOrder(o.Id, 3);
        Test.stopTest();

        Bouquet_Order__c updated = [SELECT Status__c, Shipping_Duration_Days__c FROM Bouquet_Order__c WHERE Id = :o.Id];
        System.assertEquals('ACCEPTED', updated.Status__c);
        System.assertEquals(3, updated.Shipping_Duration_Days__c);
    }
}
