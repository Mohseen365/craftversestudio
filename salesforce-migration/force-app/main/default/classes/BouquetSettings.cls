public with sharing class BouquetSettings {

    public static String getSetting(String key, String defaultValue) {
        // Native Optimization: Use Custom Metadata for constants
        Bouquet_Setting__mdt setting = Bouquet_Setting__mdt.getInstance(key);
        return setting != null ? setting.Value__c : defaultValue;
    }

    public static Decimal getProductionHoursPerDay() {
        String val = getSetting('DEFAULT_HOURS', '8.0');
        return Decimal.valueOf(val);
    }
}
