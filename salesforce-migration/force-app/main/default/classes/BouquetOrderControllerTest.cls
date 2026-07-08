@IsTest
public class BouquetOrderControllerTest {
    @TestSetup
    static void setup() {
        Product2 p = new Product2(Name = 'Rose', Production_Hours__c = 1.0, IsActive = true, Price__c = 50);
        insert p;
        Contact c = new Contact(LastName = 'Customer', Email = 'test@example.com', Phone = '1234567890');
        insert c;

        Bouquet_Order__c o = new Bouquet_Order__c(
            Customer__c = c.Id, Status__c = 'PENDING_REVIEW',
            Occasion_Date__c = Date.today().addDays(10), Subtotal__c = 100
        );
        insert o;

        insert new Bouquet_Order_Item__c(
            Bouquet_Order__c = o.Id,
            Product__c = p.Id,
            Quantity__c = 2,
            Price__c = 50,
            Production_Hours__c = 1.0,
            Hours_Required__c = 2.0
        );
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

        Bouquet_Order__c updated = [SELECT Status__c FROM Bouquet_Order__c WHERE Id = :o.Id];
        System.assertEquals('ACCEPTED', updated.Status__c);
    }

    @IsTest
    static void testGetOrderDetails() {
        Bouquet_Order__c o = [SELECT Id FROM Bouquet_Order__c LIMIT 1];
        Map<String, Object> details = BouquetOrderController.getOrderDetails(o.Id);
        System.assertNotEquals(null, details.get('order'));
    }

    @IsTest
    static void testTrackOrder() {
        Bouquet_Order__c o = [SELECT Order_Number__c FROM Bouquet_Order__c LIMIT 1];
        Map<String, Object> result = BouquetOrderController.trackOrder(o.Order_Number__c, '1234567890');
        System.assertEquals(o.Id, result.get('orderId'));
    }

    @IsTest
    static void testGetPreview() {
        Bouquet_Order__c o = [SELECT Id FROM Bouquet_Order__c LIMIT 1];
        Map<String, Object> result = BouquetOrderController.getCapacityPreview(o.Id, Date.today().addDays(5));
        System.assertNotEquals(null, result);
    }

    @IsTest
    static void testPlaceGuestOrder() {
        Product2 p = [SELECT Id FROM Product2 LIMIT 1];

        Map<String, Object> orderData = new Map<String, Object>{
            'firstName' => 'John',
            'lastName' => 'Doe',
            'email' => 'john@example.com',
            'phone' => '9876543210',
            'address' => '123 Street',
            'city' => 'City',
            'state' => 'State',
            'pincode' => '123456',
            'occasionType' => 'Birthday',
            'occasionDate' => String.valueOf(Date.today().addDays(7)),
            'notes' => 'Test notes',
            'giftMessage' => 'Happy Birthday',
            'productId' => p.Id,
            'quantity' => 1.0
        };

        Test.startTest();
        Map<String, Object> result = BouquetOrderController.placeGuestOrder(orderData);
        Test.stopTest();

        System.assertNotEquals(null, result.get('orderId'));
        Bouquet_Order__c ord = [SELECT Subtotal__c FROM Bouquet_Order__c WHERE Id = :(Id)result.get('orderId')];
        System.assertEquals(50.0, ord.Subtotal__c);
    }
}
