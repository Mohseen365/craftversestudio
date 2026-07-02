public class BouquetScheduleQueueable implements Queueable {
    public void execute(QueueableContext context) {
        BouquetScheduler.rebuildSchedule();
    }
}
