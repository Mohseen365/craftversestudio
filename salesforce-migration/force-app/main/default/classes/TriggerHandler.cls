public virtual class TriggerHandler {
    protected List<SObject> newList;
    protected List<SObject> oldList;
    protected Map<Id, SObject> newMap;
    protected Map<Id, SObject> oldMap;

    public TriggerHandler() {
        this.newList = Trigger.new;
        this.oldList = Trigger.old;
        this.newMap = (Map<Id, SObject>)Trigger.newMap;
        this.oldMap = (Map<Id, SObject>)Trigger.oldMap;
    }

    public void run() {
        if (Trigger.isBefore && Trigger.isInsert) beforeInsert();
        else if (Trigger.isAfter && Trigger.isInsert) afterInsert();
        else if (Trigger.isBefore && Trigger.isUpdate) beforeUpdate();
        else if (Trigger.isAfter && Trigger.isUpdate) afterUpdate();
    }

    protected virtual void beforeInsert() {}
    protected virtual void afterInsert() {}
    protected virtual void beforeUpdate() {}
    protected virtual void afterUpdate() {}
}
