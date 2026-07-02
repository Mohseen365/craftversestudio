import { LightningElement, track, wire } from 'lwc';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference } from 'lightning/navigation';
import getOrderTracking from '@salesforce/apex/BouquetOrderController.getOrderTracking';

const STATUS_MESSAGES = {
    'PENDING_REVIEW': { title: 'Order in Review', description: 'We are checking our production capacity for your selected date.' },
    'ACCEPTED': { title: 'Order Accepted', description: 'Please complete the payment to start production.' },
    'PAYMENT_PENDING': { title: 'Payment Pending', description: 'Waiting for payment screenshot upload.' },
    'PAYMENT_SUBMITTED': { title: 'Payment Submitted', description: 'We are verifying your payment screenshot.' },
    'CONFIRMED': { title: 'Payment Confirmed', description: 'Your order is confirmed and scheduled for production.' },
    'IN_PRODUCTION': { title: 'In Production', description: 'Our florists are crafting your bouquet.' },
    'READY_TO_SHIP': { title: 'Ready to Ship', description: 'Your bouquet is ready and waiting for the courier.' },
    'SHIPPED': { title: 'Order Shipped', description: 'Your bouquet is on its way!' },
    'DELIVERED': { title: 'Order Delivered', description: 'Enjoy your beautiful bouquet!' }
};

export default class BouquetTracking extends LightningElement {
    @track inputOrderId;
    @track orderId;
    @track orderData;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference && currentPageReference.state) {
            // Handle both authenticated (list) and direct order navigation
            if (currentPageReference.state.c__orderId) {
                this.orderId = currentPageReference.state.c__orderId;
                this.loadOrderData();
            }
        }
    }

    async loadOrderData() {
        if (!this.orderId) return;
        try {
            this.orderData = await getOrderTracking({ orderId: this.orderId });
        } catch (error) {
            console.error('Error loading order data:', error);
            this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: 'Order not found or access denied.', variant: 'error' }));
            this.orderData = null;
        }
    }

    handleOrderIdChange(event) {
        this.inputOrderId = event.target.value;
    }

    handleTrack() {
        this.orderId = this.inputOrderId;
        this.loadOrderData();
    }

    get orderNumber() { return this.orderData?.Order_Number__c || ''; }
    get orderStatus() { return this.orderData?.Status__c || null; }
    get createdDate() { return this.orderData?.CreatedDate ? new Date(this.orderData.CreatedDate).toLocaleDateString() : ''; }
    get orderItems() { return this.orderData?.Order_Items__r || []; }
    get showPaymentUpload() { return this.orderStatus === 'PAYMENT_PENDING' || this.orderStatus === 'ACCEPTED'; }
    get statusTitle() { return STATUS_MESSAGES[this.orderStatus]?.title || 'Order Tracking'; }
    get statusDescription() { return STATUS_MESSAGES[this.orderStatus]?.description || 'Follow your bouquet\'s journey here.'; }

    async handleUploadFinished(event) {
        if (event.detail.files.length > 0) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: 'Payment proof uploaded for verification.', variant: 'success' }));
            const fields = { Id: this.orderId, Status__c: 'PAYMENT_SUBMITTED' };
            try {
                await updateRecord({ fields });
                this.loadOrderData();
            } catch (err) {
                console.error('Update failed:', err);
            }
        }
    }
}
