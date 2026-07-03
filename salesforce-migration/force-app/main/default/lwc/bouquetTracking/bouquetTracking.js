import { LightningElement, track, wire } from 'lwc';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference } from 'lightning/navigation';
import getOrderDetails from '@salesforce/apex/BouquetOrderController.getOrderDetails';
import { refreshApex } from '@salesforce/apex';

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

const STEPS = [
    { label: 'Review', value: 'PENDING_REVIEW' },
    { label: 'Accepted', value: 'ACCEPTED' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Production', value: 'IN_PRODUCTION' },
    { label: 'Shipping', value: 'SHIPPED' },
    { label: 'Delivered', value: 'DELIVERED' }
];

export default class BouquetTracking extends LightningElement {
    @track inputOrderId;
    @track orderId;
    @track orderData;
    @track items;
    isLoading = false;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference && currentPageReference.state && currentPageReference.state.c__orderId) {
            this.orderId = currentPageReference.state.c__orderId;
            this.loadOrderData();
        }
    }

    async loadOrderData() {
        if (!this.orderId) return;
        this.isLoading = true;
        try {
            const result = await getOrderDetails({ orderId: this.orderId });
            this.orderData = result.order;
            this.items = result.items;
        } catch (error) {
            console.error('Error loading order data:', error);
            this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: 'Order not found or access denied.', variant: 'error' }));
            this.orderData = null;
        } finally {
            this.isLoading = false;
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
    get orderTotal() { return this.orderData?.Total_Amount__c || 0; }
    get trackingNumber() { return this.orderData?.Tracking_Number__c || 'N/A'; }
    get productionDeadline() { return this.orderData?.Production_Deadline__c || 'TBD'; }
    get shippingDate() { return this.orderData?.Shipping_Date__c || 'TBD'; }

    get showPaymentUpload() {
        return this.orderStatus === 'PAYMENT_PENDING' || this.orderStatus === 'ACCEPTED';
    }

    get statusTitle() { return STATUS_MESSAGES[this.orderStatus]?.title || 'Order Tracking'; }
    get statusDescription() { return STATUS_MESSAGES[this.orderStatus]?.description || 'Follow your bouquet\'s journey here.'; }

    get timelineSteps() {
        const currentIdx = STEPS.findIndex(s => s.value === this.orderStatus);
        return STEPS.map((s, idx) => ({
            ...s,
            className: idx <= currentIdx ? 'slds-is-active' : 'slds-is-incomplete'
        }));
    }

    async handleUploadFinished(event) {
        if (event.detail.files.length > 0) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: 'Payment proof uploaded for verification.', variant: 'success' }));
            const fields = { Id: this.orderId, Status__c: 'PAYMENT_SUBMITTED' };
            try {
                await updateRecord({ fields });
                this.loadOrderData();
            } catch (err) {
                console.error('Update failed:', err);
                this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: 'Failed to update order status.', variant: 'error' }));
            }
        }
    }
}
