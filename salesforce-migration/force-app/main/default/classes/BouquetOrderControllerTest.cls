@IsTest
public class BouquetOrderControllerTest {
    @TestSetup
    static void setup() {
        Product2 p = new Product2(Name = 'Rose', Production_Hours__c = 1.0, IsActive = true);
        insert p;

        Contact c = new Contact(LastName = 'Customer', Email = 'test@example.com');
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
    }

    @IsTest
    static void testPlaceGuestOrder() {
        Product2 p = [SELECT Id FROM Product2 LIMIT 1];
        Map<String, Object> orderData = new Map<String, Object>{
            'firstName' => 'John',
            'lastName' => 'Doe',
            'email' => 'john@example.com',
            'occasionDate' => String.valueOf(Date.today().addDays(5)),
            'totalAmount' => 150.0,
            'productId' => p.Id,
            'quantity' => 1.0
        };

        Test.startTest();
        Map<String, Object> result = BouquetOrderController.placeGuestOrder(orderData);
        Test.stopTest();

        System.assert(result.containsKey('orderId'));
        Bouquet_Order__c ord = [SELECT Order_Number__c FROM Bouquet_Order__c WHERE Id = :(Id)result.get('orderId')];
        System.assertEquals(result.get('orderNumber'), ord.Order_Number__c);
    }

    @IsTest
    static void testGetTracking() {
        Bouquet_Order__c o = [SELECT Id FROM Bouquet_Order__c LIMIT 1];
        Bouquet_Order__c tracked = BouquetOrderController.getOrderTracking(o.Id);
        System.assertEquals(o.Id, tracked.Id);
    }
}
