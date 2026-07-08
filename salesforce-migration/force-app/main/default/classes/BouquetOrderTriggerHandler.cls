public with sharing class BouquetOrderTriggerHandler extends TriggerHandler {
    private List<Bouquet_Order__c> newList;
    private Map<Id, Bouquet_Order__c> oldMap;

    public BouquetOrderTriggerHandler() {
        this.newList = (List<Bouquet_Order__c>) Trigger.new;
        this.oldMap = (Map<Id, Bouquet_Order__c>) Trigger.oldMap;
    }

    protected override void beforeInsert() {
        new BouquetOrderDomain(newList, null).generateOrderNumbers();
    }

    protected override void afterUpdate() {
        new BouquetOrderDomain(newList, oldMap).handleStatusChanges();
    }
}
