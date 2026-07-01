public with sharing class BouquetSettings {

    public static String getSetting(String key, String defaultValue) {
        List<Bouquet_Setting__c> settings = [SELECT Value__c FROM Bouquet_Setting__c WHERE Name = :key LIMIT 1];
        return settings.isEmpty() ? defaultValue : settings[0].Value__c;
    }

    public static Decimal getProductionHoursPerDay() {
        return Decimal.valueOf(getSetting('DAILY_PRODUCTION_CAPACITY', '8.0'));
    }
}
