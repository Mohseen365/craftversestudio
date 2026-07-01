@IsTest
public class BouquetCapacityControllerTest {
    @TestSetup
    static void setup() {
        Bouquet_Capacity__c cap = new Bouquet_Capacity__c(
            Date__c = Date.today(),
            Name = Date.today().toString(),
            Maximum_Hours__c = 8.0
        );
        insert cap;

        Contact c = new Contact(LastName = 'Customer');
        insert c;

        Bouquet_Order__c o = new Bouquet_Order__c(
            Customer__c = c.Id,
            Status__c = 'ACCEPTED',
            Occasion_Date__c = Date.today().addDays(5),
            Order_Number__c = 'TEST-CAP',
            Total_Amount__c = 50,
            Production_Deadline__c = Date.today().addDays(2)
        );
        insert o;

        Bouquet_Capacity_Reservation__c res = new Bouquet_Capacity_Reservation__c(
            Bouquet_Capacity__c = cap.Id,
            Bouquet_Order__c = o.Id,
            Planned_Hours__c = 2.0,
            Completed_Hours__c = 0
        );
        insert res;
    }

    @IsTest
    static void testGetRows() {
        List<BouquetCapacityController.CapacityRow> rows = BouquetCapacityController.getCapacityPlanningRows();
        System.assert(!rows.isEmpty());
        System.assertEquals(Date.today(), rows[0].capacityDate);
    }

    @IsTest
    static void testUpdateProgress() {
        Bouquet_Order__c o = [SELECT Id FROM Bouquet_Order__c LIMIT 1];
        Decimal total = BouquetCapacityController.updateProgress(o.Id, Date.today(), 1.5);
        System.assertEquals(1.5, total);

        Bouquet_Capacity_Reservation__c res = [SELECT Completed_Hours__c FROM Bouquet_Capacity_Reservation__c WHERE Bouquet_Order__c = :o.Id];
        System.assertEquals(1.5, res.Completed_Hours__c);
    }
}
