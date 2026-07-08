@IsTest
public class BouquetSchedulerStressTest {
    @TestSetup
    static void setup() {
        // Create some holidays
        insert new Holiday(Name = 'Holiday 1', ActivityDate = Date.today().addDays(1));

        Product2 p = new Product2(Name = 'Stress Product', Production_Hours__c = 10.0, IsActive = true);
        insert p;
        Contact c = new Contact(LastName = 'Stress Customer');
        insert c;
    }

    @IsTest
    static void testHolidaySkipping() {
        Date today = Date.today();
        Date holiday = today.addDays(1);

        BouquetScheduler.OrderScheduleInput input = new BouquetScheduler.OrderScheduleInput();
        input.orderId = '001000000000001AAA';
        input.orderNumber = 'ORD-STRESS';
        input.productionDeadline = today.addDays(2);
        input.requiredHours = 8.0;
        input.lockedHours = 0;
        input.status = 'ACCEPTED';
        input.isUrgent = false;

        Map<Date, Decimal> capacityLimits = new Map<Date, Decimal>();
        capacityLimits.put(today, 8.0);
        capacityLimits.put(holiday, 8.0);
        capacityLimits.put(today.addDays(2), 8.0);

        Test.startTest();
        BouquetScheduler.SchedulingResult result = BouquetScheduler.scheduleOrdersInMemory(today, new List<BouquetScheduler.OrderScheduleInput>{input}, capacityLimits, new Map<Date, Decimal>());
        Test.stopTest();

        System.assert(result.success);
        for (BouquetScheduler.ScheduledAllocation sa : result.allocations.get(input.orderId)) {
            System.assertNotEquals(holiday, sa.allocationDate, 'Should not allocate work on a holiday');
        }
    }

    @IsTest
    static void testUrgentPriority() {
        Date today = Date.today();

        BouquetScheduler.OrderScheduleInput normal = new BouquetScheduler.OrderScheduleInput();
        normal.orderId = '001000000000001AAA';
        normal.requiredHours = 8.0;
        normal.productionDeadline = today;
        normal.isUrgent = false;

        BouquetScheduler.OrderScheduleInput urgent = new BouquetScheduler.OrderScheduleInput();
        urgent.orderId = '001000000000001BBB';
        urgent.requiredHours = 8.0;
        urgent.productionDeadline = today;
        urgent.isUrgent = true;

        Map<Date, Decimal> capacityLimits = new Map<Date, Decimal>();
        capacityLimits.put(today, 8.0); // Only enough for one

        Test.startTest();
        // Normal first in list
        BouquetScheduler.SchedulingResult result = BouquetScheduler.scheduleOrdersInMemory(today, new List<BouquetScheduler.OrderScheduleInput>{normal, urgent}, capacityLimits, new Map<Date, Decimal>());
        Test.stopTest();

        System.assert(result.allocations.containsKey(urgent.orderId), 'Urgent order should have been scheduled');
        System.assert(!result.allocations.containsKey(normal.orderId), 'Normal order should have been bumped');
    }
}
