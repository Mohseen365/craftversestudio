import { LightningElement, track, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';

const FIELDS = ['Bouquet_Order__c.Status__c'];

export default class BouquetTracking extends LightningElement {
    @track inputOrderId;
    @track orderId;
    @track file;

    @wire(getRecord, { recordId: '$orderId', fields: FIELDS })
    wiredOrder;

    handleOrderIdChange(event) {
        this.inputOrderId = event.target.value;
    }

    handleTrack() {
        this.orderId = this.inputOrderId;
    }

    get showPaymentUpload() {
        return this.wiredOrder.data && this.wiredOrder.data.fields.Status__c.value === 'PAYMENT_PENDING';
    }

    handleFileChange(event) {
        this.file = event.target.files[0];
    }

    async handlePaymentSubmit() {
        console.log('Uploading payment proof for order:', this.orderId);
    }
}
