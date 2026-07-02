public with sharing class BouquetOrderTriggerHandler extends TriggerHandler {
    protected override void beforeInsert() {
        new BouquetOrderDomain(newList, null).generateOrderNumbers();
    }

    protected override void afterUpdate() {
        new BouquetOrderDomain(newList, oldMap).handleStatusChanges();
    }
}
