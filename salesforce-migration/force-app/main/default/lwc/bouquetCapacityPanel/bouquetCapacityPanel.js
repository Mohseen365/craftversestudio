import { LightningElement, wire, track } from 'lwc';
import getCapacityPlanningRows from '@salesforce/apex/BouquetCapacityController.getCapacityPlanningRows';
import updateProgress from '@salesforce/apex/BouquetCapacityController.updateProgress';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class BouquetCapacityPanel extends LightningElement {
    @track rows = [];
    @track selectedDate;
    @track isDetailModalOpen = false;

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
        }
    }

    handleRefresh() {
        refreshApex(this.wiredRowsResult);
    }

    handleViewDetails(event) {
        this.selectedDate = event.target.dataset.date;
        this.isDetailModalOpen = true;
    }

    closeDetailModal() {
        this.isDetailModalOpen = false;
    }

    get selectedOrders() {
        const row = this.rows.find(r => r.capacityDate === this.selectedDate);
        return row ? row.orders : [];
    }

    async handleAddProgress(event) {
        const orderId = event.target.dataset.orderId;
        const input = this.template.querySelector(`lightning-input[data-order-id="${orderId}"]`);
        const completedHours = parseFloat(input.value);
        if (!completedHours) return;

        try {
            await updateProgress({ orderId, progressDate: this.selectedDate, completedHours });
            this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: 'Progress updated', variant: 'success' }));
            refreshApex(this.wiredRowsResult);
        } catch (error) {
            alert(error.body.message);
        }
    }
}
