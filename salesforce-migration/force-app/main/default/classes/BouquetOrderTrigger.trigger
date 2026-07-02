trigger BouquetOrderTrigger on Bouquet_Order__c (before insert, after update) {
    new BouquetOrderTriggerHandler().run();
}
