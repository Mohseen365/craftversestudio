trigger BouquetScheduleRequestTrigger on Bouquet_Schedule_Request__e (after insert) {
    System.enqueueJob(new BouquetScheduleQueueable());
}
