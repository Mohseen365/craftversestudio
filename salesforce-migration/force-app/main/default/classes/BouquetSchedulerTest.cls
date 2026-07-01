@IsTest
public class BouquetSchedulerTest {
    @TestSetup
    static void setup() {
        Product2 p = new Product2(Name = 'Rose', Production_Hours__c = 1.0, IsActive = true);
        insert p;

        Contact c = new Contact(LastName = 'Customer');
        insert c;

        Bouquet_Order__c o = new Bouquet_Order__c(
            Customer__c = c.Id,
            Status__c = 'PENDING_REVIEW',
            Occasion_Date__c = Date.today().addDays(10),
            Order_Number__c = 'TEST-001',
            Total_Amount__c = 100
        );
        insert o;

        Bouquet_Order_Item__c item = new Bouquet_Order_Item__c(
            Bouquet_Order__c = o.Id,
            Product__c = p.Id,
            Quantity__c = 5
        );
        insert item;
    }

    @IsTest
    static void testCalculateHours() {
        Bouquet_Order__c o = [SELECT Id FROM Bouquet_Order__c LIMIT 1];
        Decimal hours = BouquetScheduler.calculateOrderHours(o.Id);
        System.assertEquals(5.0, hours, 'Hours should be 5.0 (5 qty * 1.0 h)');
    }

    @IsTest
    static void testScheduling() {
        Date today = Date.today();
        List<BouquetScheduler.OrderScheduleInput> inputs = new List<BouquetScheduler.OrderScheduleInput>();

        BouquetScheduler.OrderScheduleInput i1 = new BouquetScheduler.OrderScheduleInput();
        i1.orderId = '001000000000001AAA'; // Dummy Id
        i1.orderNumber = 'ORD-001';
        i1.productionDeadline = today.addDays(2);
        i1.requiredHours = 10;
        i1.lockedHours = 0;
        i1.status = 'ACCEPTED';
        inputs.add(i1);

        Map<Date, Decimal> capacityLimits = new Map<Date, Decimal>();
        capacityLimits.put(today, 8.0);
        capacityLimits.put(today.addDays(1), 8.0);
        capacityLimits.put(today.addDays(2), 8.0);

        Map<Date, Decimal> completedWorkMap = new Map<Date, Decimal>();

        BouquetScheduler.SchedulingResult result = BouquetScheduler.scheduleOrdersInMemory(today, inputs, capacityLimits, completedWorkMap);

        System.assert(result.success, 'Scheduling should be successful');
        System.assert(result.allocations.containsKey(i1.orderId), 'Allocations should contain order');

        List<BouquetScheduler.ScheduledAllocation> allocs = result.allocations.get(i1.orderId);
        System.assertEquals(2, allocs.size(), 'Should allocate across 2 days (8h + 2h)');
    }

    @IsTest
    static void testAcceptability() {
        Bouquet_Order__c o = [SELECT Id, Order_Number__c FROM Bouquet_Order__c LIMIT 1];
        Date deadline = Date.today().addDays(5);
        Decimal req = 5.0;

        BouquetScheduler.AcceptabilityResult ar = BouquetScheduler.checkAcceptability(o.Id, o.Order_Number__c, deadline, req, null);
        System.assert(ar.canAccept, 'Should be able to accept 5h order with default capacity');
    }
}
