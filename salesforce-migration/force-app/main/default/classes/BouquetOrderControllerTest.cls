@IsTest
public class BouquetOrderControllerTest {
    @TestSetup
    static void setup() {
        Product2 p = new Product2(Name = 'Rose', Production_Hours__c = 1.0, IsActive = true);
        insert p;
        Contact c = new Contact(LastName = 'Customer', Email = 'test@example.com');
        insert c;
        Bouquet_Order__c o = new Bouquet_Order__c(
            Customer__c = c.Id, Status__c = 'PENDING_REVIEW',
            Occasion_Date__c = Date.today().addDays(10), Order_Number__c = 'TEST-001', Total_Amount__c = 100
        );
        insert o;
        insert new Bouquet_Order_Item__c(Bouquet_Order__c = o.Id, Product__c = p.Id, Quantity__c = 2, Production_Hours__c = 1.0, Hours_Required__c = 2.0);
    }

    @IsTest
    static void testGetOrders() {
        List<Bouquet_Order__c> orders = BouquetOrderController.getOrdersByStatus('PENDING_REVIEW');
        System.assertEquals(1, orders.size());
    }

    @IsTest
    static void testAcceptOrder() {
        Bouquet_Order__c o = [SELECT Id FROM Bouquet_Order__c LIMIT 1];
        Map<String, Object> params = new Map<String, Object>{
            'shippingDurationDays' => 3.0,
            'customizationCharge' => 0.0,
            'deliveryCharge' => 0.0,
            'urgentOrderCharge' => 0.0
        };
        Test.startTest();
        BouquetOrderController.acceptOrder(o.Id, params);
        Test.stopTest();
        Bouquet_Order__c updated = [SELECT Status__c FROM Bouquet_Order__c WHERE Id = :o.Id];
        System.assertEquals('ACCEPTED', updated.Status__c);
    }

    @IsTest
    static void testGetTracking() {
        Bouquet_Order__c o = [SELECT Id FROM Bouquet_Order__c LIMIT 1];
        Bouquet_Order__c tracked = BouquetOrderController.getOrderTracking(o.Id);
        System.assertEquals(o.Id, tracked.Id);
    }

    @IsTest
    static void testGetPreview() {
        Bouquet_Order__c o = [SELECT Id FROM Bouquet_Order__c LIMIT 1];
        BouquetScheduler.AcceptabilityResult result = BouquetOrderController.getCapacityPreview(o.Id, 3);
        System.assert(result != null);
    }
}
