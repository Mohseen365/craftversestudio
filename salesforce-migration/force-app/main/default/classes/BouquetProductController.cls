public with sharing class BouquetProductController {

    @AuraEnabled(cacheable=true)
    public static List<Product2> getAvailableProducts(String query, String category, String priceRange, String sortBy) {
        try {
            String soql = 'SELECT Id, Name, Description, Production_Hours__c, Price__c, Image_URL__c, Category__c, Stock_Quantity__c FROM Product2 WHERE IsActive = true';

            if (String.isNotBlank(query)) {
                String searchKey = '%' + query + '%';
                soql += ' AND (Name LIKE :searchKey OR Description LIKE :searchKey)';
            }

            if (String.isNotBlank(category) && category != 'All') {
                soql += ' AND Category__c = :category';
            }

            // Price filtering ...
            if (priceRange == '0-500') soql += ' AND Price__c <= 500';
            else if (priceRange == '500-1000') soql += ' AND Price__c > 500 AND Price__c <= 1000';

            if (sortBy == 'price-low') soql += ' ORDER BY Price__c ASC';
            else if (sortBy == 'price-high') soql += ' ORDER BY Price__c DESC';
            else if (sortBy == 'best') soql += ' ORDER BY Order_Count__c DESC';
            else soql += ' ORDER BY CreatedDate DESC';

            return Database.query(soql);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Product2> getFeaturedProducts() {
        return [
            SELECT Id, Name, Description, Production_Hours__c, Price__c, Image_URL__c, Category__c
            FROM Product2
            WHERE IsActive = true
            ORDER BY Order_Count__c DESC
            WITH SECURITY_ENFORCED
            LIMIT 4
        ];
    }
}
