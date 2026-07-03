public with sharing class BouquetProductController {

    @AuraEnabled(cacheable=true)
    public static List<Product2> getAvailableProducts(String query, String category, String priceRange, String sortBy) {
        try {
            String soql = 'SELECT Id, Name, Description, Production_Hours__c, Price__c, Image_URL__c, Category__c, Stock_Quantity__c FROM Product2 WHERE IsActive = true';

            Map<String, Object> params = new Map<String, Object>();

            if (String.isNotBlank(query)) {
                String searchKey = '%' + query + '%';
                soql += ' AND (Name LIKE :searchKey OR Description LIKE :searchKey)';
                params.put('searchKey', searchKey);
            }

            if (String.isNotBlank(category) && category != 'All') {
                soql += ' AND Category__c = :category';
                params.put('category', category);
            }

            if (priceRange == '0-500') {
                soql += ' AND Price__c <= 500';
            } else if (priceRange == '500-1000') {
                soql += ' AND Price__c > 500 AND Price__c <= 1000';
            } else if (priceRange == '1000-2000') {
                soql += ' AND Price__c > 1000 AND Price__c <= 2000';
            } else if (priceRange == '2000+') {
                soql += ' AND Price__c > 2000';
            }

            if (sortBy == 'price-low') {
                soql += ' ORDER BY Price__c ASC';
            } else if (sortBy == 'price-high') {
                soql += ' ORDER BY Price__c DESC';
            } else if (sortBy == 'best') {
                soql += ' ORDER BY Order_Count__c DESC';
            } else {
                soql += ' ORDER BY CreatedDate DESC';
            }

            return Database.queryWithBinds(soql, params, AccessLevel.USER_MODE);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Product2> getFeaturedProducts() {
        try {
            return [
                SELECT Id, Name, Description, Production_Hours__c, Price__c, Image_URL__c, Category__c
                FROM Product2
                WHERE IsActive = true
                WITH SECURITY_ENFORCED
                ORDER BY Order_Count__c DESC
                LIMIT 4
            ];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}
