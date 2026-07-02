import { LightningElement, track, wire } from 'lwc';
import getOrdersByStatus from '@salesforce/apex/BouquetOrderController.getOrdersByStatus';
import getCapacityPreview from '@salesforce/apex/BouquetOrderController.getCapacityPreview';
import acceptOrder from '@salesforce/apex/BouquetOrderController.acceptOrder';
import updateOrderStatus from '@salesforce/apex/BouquetOrderController.updateOrderStatus';
import { refreshApex } from '@salesforce/apex';

const TABS = [
    { key: 'PENDING_REVIEW', label: 'Review' },
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'PAYMENT_VERIFICATION', label: 'Verification' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'IN_PRODUCTION', label: 'Production' },
    { key: 'READY_TO_SHIP', label: 'Ready to Ship' },
    { key: 'SHIPPED', label: 'Shipped' },
    { key: 'DELIVERED', label: 'Delivered' }
];

const NEXT_STATUS = {
    'CONFIRMED': 'IN_PRODUCTION',
    'IN_PRODUCTION': 'READY_TO_SHIP',
    'READY_TO_SHIP': 'SHIPPED',
    'SHIPPED': 'DELIVERED'
};

export default class BouquetOrderPanel extends LightningElement {
    @track activeTab = 'PENDING_REVIEW';
    @track orders = [];
    @track loading = false;
    @track shippingDuration = 3;
    @track capacityPreview;
    @track trackingNumber = '';

    wiredOrdersResult;

    @wire(getOrdersByStatus, { status: '$activeTab' })
    wiredOrders(result) {
        this.wiredOrdersResult = result;
        if (result.data) {
            this.orders = result.data;
            this.loading = false;
        } else if (result.error) {
            console.error(result.error);
            this.loading = false;
        }
    }

    get tabs() {
        return TABS.map(tab => ({
            ...tab,
            className: `slds-tabs_default__item ${this.activeTab === tab.key ? 'slds-is-active' : ''}`
        }));
    }

    get isPendingReview() {
        return this.activeTab === 'PENDING_REVIEW';
    }

    handleTabClick(event) {
        this.activeTab = event.target.dataset.key;
        this.loading = true;
    }

    handleDurationChange(event) {
        this.shippingDuration = parseInt(event.target.value, 10);
        const orderId = event.target.dataset.id;
        this.loadPreview(orderId);
    }

    async loadPreview(orderId) {
        if (!orderId) return;
        try {
            this.capacityPreview = await getCapacityPreview({
                orderId: orderId,
                shippingDurationDays: this.shippingDuration
            });
        } catch (error) {
            console.error(error);
        }
    }

    async handleAccept(event) {
        const orderId = event.target.dataset.id;
        try {
            await acceptOrder({
                orderId,
                params: {
                    shippingDurationDays: this.shippingDuration,
                    customizationCharge: 0,
                    deliveryCharge: 0,
                    urgentOrderCharge: 0
                }
            });
            refreshApex(this.wiredOrdersResult);
        } catch (error) {
            alert(error.body.message);
        }
    }

    get showNextAction() {
        return NEXT_STATUS[this.activeTab] !== undefined;
    }

    get nextActionLabel() {
        return `Move to ${NEXT_STATUS[this.activeTab]}`;
    }

    async handleNextStatus(event) {
        const orderId = event.target.dataset.id;
        const nextStatus = NEXT_STATUS[this.activeTab];
        const trackNum = nextStatus === 'SHIPPED' ? this.trackingNumber : null;
        try {
            await updateOrderStatus({ orderId, newStatus: nextStatus, trackingNumber: trackNum });
            refreshApex(this.wiredOrdersResult);
        } catch (error) {
            alert(error.body.message);
        }
    }

    get isReadyToShip() {
        return this.activeTab === 'READY_TO_SHIP';
    }

    handleTrackingChange(event) {
        this.trackingNumber = event.target.value;
    }
}
