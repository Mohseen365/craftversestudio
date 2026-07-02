import { LightningElement, track, wire } from 'lwc';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const FIELDS = ['Bouquet_Order__c.Status__c'];

export default class BouquetTracking extends LightningElement {
    @track orderId;
    // ...

    get acceptedFormats() {
        return ['.png', '.jpg', '.jpeg'];
    }

    @wire(getRecord, { recordId: '$orderId', fields: FIELDS })
    wiredOrder;

    handleUploadFinished(event) {
        // Get the list of uploaded files
        const uploadedFiles = event.detail.files;
        if (uploadedFiles.length > 0) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Payment proof uploaded successfully',
                    variant: 'success',
                })
            );
            // Native Optimization: Update status to PAYMENT_SUBMITTED via LDS
            const fields = {
                Id: this.orderId,
                Status__c: 'PAYMENT_SUBMITTED'
            };
            updateRecord({ fields });
        }
    }

    // ... rest of logic
}
