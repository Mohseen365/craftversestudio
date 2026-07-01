import { LightningElement, wire, track } from 'lwc';
import getCapacityPlanningRows from '@salesforce/apex/BouquetCapacityController.getCapacityPlanningRows';
import updateProgress from '@salesforce/apex/BouquetCapacityController.updateProgress';
import { refreshApex } from '@salesforce/apex';

export default class BouquetCapacityPanel extends LightningElement {
    @track rows = [];
    @track selectedDate;
    @track selectedOrders = [];
    @track progressValues = {};

    wiredRowsResult;

    @wire(getCapacityPlanningRows)
    wiredRows(result) {
        this.wiredRowsResult = result;
        if (result.data) {
            this.rows = result.data.map(row => ({
                ...row,
                remainingClass: row.remaining <= 0 ? 'slds-text-color_error' : 'slds-text-color_success',
                statusClass: `slds-badge ${row.isFull ? 'slds-theme_error' : 'slds-theme_success'}`,
                statusLabel: row.isFull ? 'Full' : 'Available'
            }));
            if (this.selectedDate) {
                this.updateSelectedOrders();
            }
        } else if (result.error) {
            console.error(result.error);
        }
    }

    handleViewDetails(event) {
        this.selectedDate = event.target.dataset.date;
        this.updateSelectedOrders();
    }

    updateSelectedOrders() {
        const row = this.rows.find(r => r.capacityDate === this.selectedDate);
        this.selectedOrders = row ? row.orders : [];
    }

    handleProgressChange(event) {
        const orderId = event.target.dataset.orderId;
        this.progressValues[orderId] = parseFloat(event.target.value);
    }

    async handleAddProgress(event) {
        const orderId = event.target.dataset.orderId;
        const completedHours = this.progressValues[orderId];
        if (!completedHours) return;

        try {
            await updateProgress({
                orderId,
                progressDate: this.selectedDate,
                completedHours
            });
            refreshApex(this.wiredRowsResult);
        } catch (error) {
            alert(error.body.message);
        }
    }
}
