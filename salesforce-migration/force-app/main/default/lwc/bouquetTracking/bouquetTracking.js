import { LightningElement, track, wire } from 'lwc';
import trackOrder from '@salesforce/label/c.Bouquet_Track_Order';
import getOrderDetails from '@salesforce/apex/BouquetOrderController.getOrderDetails';
import getOrderFiles from '@salesforce/apex/BouquetOrderController.getOrderFiles';
import trackOrderApex from '@salesforce/apex/BouquetOrderController.trackOrder';
import isUserLoggedIn from '@salesforce/apex/BouquetUserController.isUserLoggedIn';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class BouquetTracking extends NavigationMixin(LightningElement) {
    @track orderNumber = '';
    @track mobileNo = '';
    @track orderId;
    @track orderData;
    @track orderFiles = [];
    @track isLoading = false;
    @track isGuest = true;

    labels = {
        trackOrder
    };

    @wire(isUserLoggedIn)
    wiredLogin({ error, data }) {
        if (data !== undefined) {
            this.isGuest = !data;
        }
    }

    handleInputChange(event) {
        const field = event.target.name;
        if (field === 'orderNumber') this.orderNumber = event.target.value;
        if (field === 'mobileNo') this.mobileNo = event.target.value;
    }

    async handleTrack() {
        if (!this.orderNumber || !this.mobileNo) {
            this.showToast('Error', 'Please enter both Order Number and Mobile Number', 'error');
            return;
        }

        this.isLoading = true;
        try {
            const result = await trackOrderApex({
                orderNumber: this.orderNumber,
                mobileNo: this.mobileNo
            });
            this.orderId = result.orderId;
            await this.loadOrderDetails();
        } catch (error) {
            this.showToast('Error', error.body?.message || 'Order not found', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    async loadOrderDetails() {
        try {
            const data = await getOrderDetails({ orderId: this.orderId });
            this.orderData = data.order;
            this.items = data.items;

            const files = await getOrderFiles({ orderId: this.orderId });
            this.orderFiles = files;
        } catch (error) {
            console.error('Error loading details', error);
        }
    }

    get hasOrder() {
        return !!this.orderData;
    }

    get orderItems() {
        return this.items || [];
    }

    handleBack() {
        this.orderId = null;
        this.orderData = null;
        this.orderFiles = [];
    }

    handleUploadFinished(event) {
        this.showToast('Success', 'Payment proof uploaded successfully', 'success');
        this.loadOrderDetails();
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    openFile(event) {
        const docId = event.target.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__namedPage',
            attributes: {
                pageName: 'filePreview'
            },
            state: {
                recordIds: docId,
                selectedRecordId: docId
            }
        });
    }
}
