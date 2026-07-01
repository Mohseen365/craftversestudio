import { LightningElement, track } from 'lwc';
import getOrderTracking from '@salesforce/apex/BouquetOrderController.getOrderTracking';

export default class BouquetTracking extends LightningElement {
    @track orderId;
    @track order;
    @track file;

    handleOrderIdChange(event) {
        this.orderId = event.target.value;
    }

    async handleTrack() {
        try {
            this.order = await getOrderTracking({ orderId: this.orderId });
        } catch (error) {
            console.error(error);
        }
    }

    get showPaymentUpload() {
        return this.order && this.order.Status__c === 'PAYMENT_PENDING';
    }

    handleFileChange(event) {
        this.file = event.target.files[0];
    }

    async handlePaymentSubmit() {
        console.log('Uploading payment proof for order:', this.orderId);
        // Logic to upload file as ContentVersion and link to Order
    }
}
