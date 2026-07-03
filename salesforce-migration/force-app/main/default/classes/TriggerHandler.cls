public virtual class TriggerHandler {
    private static Map<String, LoopCount> loopCountMap;
    private static Set<String> bypassedHandlers;

    static {
        loopCountMap = new Map<String, LoopCount>();
        bypassedHandlers = new Set<String>();
    }

    public TriggerContext context;
    public Boolean isTriggerExecuting;

    public TriggerHandler() {
        this.setContext();
    }

    public void run() {
        if (!validateRun()) return;

        addToLoopCount();

        if (this.context == TriggerContext.BEFORE_INSERT) {
            this.beforeInsert();
        } else if (this.context == TriggerContext.BEFORE_UPDATE) {
            this.beforeUpdate();
        } else if (this.context == TriggerContext.BEFORE_DELETE) {
            this.beforeDelete();
        } else if (this.context == TriggerContext.AFTER_INSERT) {
            this.afterInsert();
        } else if (this.context == TriggerContext.AFTER_UPDATE) {
            this.afterUpdate();
        } else if (this.context == TriggerContext.AFTER_DELETE) {
            this.afterDelete();
        } else if (this.context == TriggerContext.AFTER_UNDELETE) {
            this.afterUndelete();
        }
    }

    public void setMaxLoopCount(Integer max) {
        String handlerName = getHandlerName();
        if (!loopCountMap.containsKey(handlerName)) {
            loopCountMap.put(handlerName, new LoopCount(max));
        } else {
            loopCountMap.get(handlerName).setMax(max);
        }
    }

    public void clearMaxLoopCount() {
        this.setMaxLoopCount(-1);
    }

    public static void bypass(String handlerName) {
        bypassedHandlers.add(handlerName);
    }

    public static void clearBypass(String handlerName) {
        bypassedHandlers.remove(handlerName);
    }

    public static Boolean isBypassed(String handlerName) {
        return bypassedHandlers.contains(handlerName);
    }

    public static void clearAllBypasses() {
        bypassedHandlers.clear();
    }

    @TestVisible
    protected virtual void beforeInsert() {}
    @TestVisible
    protected virtual void beforeUpdate() {}
    @TestVisible
    protected virtual void beforeDelete() {}
    @TestVisible
    protected virtual void afterInsert() {}
    @TestVisible
    protected virtual void afterUpdate() {}
    @TestVisible
    protected virtual void afterDelete() {}
    @TestVisible
    protected virtual void afterUndelete() {}

    @TestVisible
    private void setContext() {
        this.setContext(null, false);
    }

    @TestVisible
    private void setContext(String strContext, Boolean isExecuting) {
        if (!Trigger.isExecuting && !isExecuting) {
            this.isTriggerExecuting = false;
            return;
        } else {
            this.isTriggerExecuting = true;
        }

        if ((Trigger.isExecuting && Trigger.isBefore && Trigger.isInsert) || (strContext == 'before insert')) {
            this.context = TriggerContext.BEFORE_INSERT;
        } else if ((Trigger.isExecuting && Trigger.isBefore && Trigger.isUpdate) || (strContext == 'before update')) {
            this.context = TriggerContext.BEFORE_UPDATE;
        } else if ((Trigger.isExecuting && Trigger.isBefore && Trigger.isDelete) || (strContext == 'before delete')) {
            this.context = TriggerContext.BEFORE_DELETE;
        } else if ((Trigger.isExecuting && Trigger.isAfter && Trigger.isInsert) || (strContext == 'after insert')) {
            this.context = TriggerContext.AFTER_INSERT;
        } else if ((Trigger.isExecuting && Trigger.isAfter && Trigger.isUpdate) || (strContext == 'after update')) {
            this.context = TriggerContext.AFTER_UPDATE;
        } else if ((Trigger.isExecuting && Trigger.isAfter && Trigger.isDelete) || (strContext == 'after delete')) {
            this.context = TriggerContext.AFTER_DELETE;
        } else if ((Trigger.isExecuting && Trigger.isAfter && Trigger.isUndelete) || (strContext == 'after undelete')) {
            this.context = TriggerContext.AFTER_UNDELETE;
        }
    }

    @TestVisible
    private void addToLoopCount() {
        String handlerName = getHandlerName();
        if (loopCountMap.containsKey(handlerName)) {
            Boolean exceeded = loopCountMap.get(handlerName).increment();
            if (exceeded) {
                Integer max = loopCountMap.get(handlerName).max;
                throw new TriggerHandlerException('Maximum loop count of ' + String.valueOf(max) + ' reached for ' + handlerName);
            }
        }
    }

    @TestVisible
    private Boolean validateRun() {
        if (!this.isTriggerExecuting || this.context == null) {
            throw new TriggerHandlerException('Trigger handler called outside of Trigger execution');
        }
        if (bypassedHandlers.contains(getHandlerName())) {
            return false;
        }
        return true;
    }

    @TestVisible
    private String getHandlerName() {
        return String.valueOf(this).split(':').get(0);
    }

    public class LoopCount {
        private Integer max;
        private Integer count;

        public LoopCount() {
            this.max = 5;
            this.count = 0;
        }

        public LoopCount(Integer max) {
            this.max = max;
            this.count = 0;
        }

        public Boolean increment() {
            this.count++;
            return this.exceeded();
        }

        public Boolean exceeded() {
            if (this.max < 0) return false;
            if (this.count > this.max) return true;
            return false;
        }

        public Integer getMax() { return this.max; }
        public Integer getCount() { return this.count; }
        public void setMax(Integer max) { this.max = max; }
    }

    public enum TriggerContext {
        BEFORE_INSERT, BEFORE_UPDATE, BEFORE_DELETE,
        AFTER_INSERT, AFTER_UPDATE, AFTER_DELETE,
        AFTER_UNDELETE
    }

    public class TriggerHandlerException extends Exception {}
}
