public with sharing class BouquetProductController {

    @AuraEnabled(cacheable=true)
    public static List<Product2> getAvailableProducts(String query, String priceRange, String sortBy) {
        String soql = 'SELECT Id, Name, Description, Production_Hours__c, Price__c FROM Product2 WHERE IsActive = true';

        if (String.isNotBlank(query)) {
            String searchKey = '%' + query + '%';
            soql += ' AND (Name LIKE :searchKey OR Description LIKE :searchKey)';
        }

        // Simplistic price range logic for migration demonstration
        if (priceRange == '0-500') {
            soql += ' AND Price__c <= 500';
        } else if (priceRange == '500-1000') {
            soql += ' AND Price__c > 500 AND Price__c <= 1000';
        }

        if (sortBy == 'price-low') {
            soql += ' ORDER BY Price__c ASC';
        } else if (sortBy == 'price-high') {
            soql += ' ORDER BY Price__c DESC';
        } else {
            soql += ' ORDER BY CreatedDate DESC';
        }

        return Database.query(soql);
    }
}
