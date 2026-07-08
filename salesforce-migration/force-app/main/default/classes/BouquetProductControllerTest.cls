@IsTest
public class BouquetProductControllerTest {
    @IsTest
    static void testGetProducts() {
        Product2 p = new Product2(
            Name = 'Rose Bouquet',
            Production_Hours__c = 1.0,
            IsActive = true,
            Price__c = 100,
            Category__c = 'Bouquets',
            Order_Count__c = 0
        );
        insert p;

        Test.startTest();
        List<Product2> products = BouquetProductController.getAvailableProducts('Rose', 'Bouquets', '0-500', 'newest');
        List<Product2> featured = BouquetProductController.getFeaturedProducts();
        Test.stopTest();

        System.assertEquals(1, products.size());
        System.assertEquals('Rose Bouquet', products[0].Name);
        System.assertNotEquals(null, featured);
    }
}
