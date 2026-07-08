public class BouquetScheduleQueueable implements Queueable {
    public void execute(QueueableContext context) {
        try {
            BouquetScheduler.rebuildSchedule();
            // Publish success event for real-time UI refresh
            EventBus.publish(new Bouquet_Schedule_Response__e(Status__c = 'Success'));
        } catch (Exception e) {
            BouquetLogger.error('Async Rebuild Failed', e);
            EventBus.publish(new Bouquet_Schedule_Response__e(Status__c = 'Error'));
        }
    }
}
