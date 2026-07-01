@IsTest
public class BouquetProductControllerTest {
    @IsTest
    static void testGetProducts() {
        Product2 p = new Product2(Name = 'Rose', Production_Hours__c = 1.0, IsActive = true);
        insert p;

        List<Product2> products = BouquetProductController.getAvailableProducts('Rose', 'all', 'newest');
        System.assertEquals(1, products.size());
        System.assertEquals('Rose', products[0].Name);
    }
}
