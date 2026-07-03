import { LightningElement, track, wire } from 'lwc';
import getOrdersByStatus from '@salesforce/apex/BouquetOrderController.getOrdersByStatus';
import getCapacityPreview from '@salesforce/apex/BouquetOrderController.getCapacityPreview';
import acceptOrder from '@salesforce/apex/BouquetOrderController.acceptOrder';
import updateOrderStatus from '@salesforce/apex/BouquetOrderController.updateOrderStatus';
import { refreshApex } from '@salesforce/apex';
import { subscribe, unsubscribe } from 'lightning/empApi';

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
    @track shippingDurations = {}; // Per-order durations
    @track previews = {}; // Per-order previews
    @track trackingNumbers = {}; // Per-order tracking

    wiredOrdersResult;
    subscription = {};

    @wire(getOrdersByStatus, { status: '$activeTab' })
    wiredOrders(result) {
        this.wiredOrdersResult = result;
        if (result.data) {
            this.orders = result.data.map(order => ({
                ...order,
                shippingDuration: this.shippingDurations[order.Id] || 3,
                preview: this.previews[order.Id] || null,
                trackingNumber: this.trackingNumbers[order.Id] || ''
            }));
            this.loading = false;
        } else if (result.error) {
            console.error(result.error);
            this.loading = false;
        }
    }

    connectedCallback() {
        this.handleSubscribe();
    }

    disconnectedCallback() {
        this.handleUnsubscribe();
    }

    handleSubscribe() {
        const messageCallback = (response) => {
            refreshApex(this.wiredOrdersResult);
        };
        subscribe('/event/Bouquet_Schedule_Response__e', -1, messageCallback).then(response => {
            this.subscription = response;
        });
    }

    handleUnsubscribe() {
        unsubscribe(this.subscription, response => {});
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
        const orderId = event.target.dataset.id;
        const duration = parseInt(event.target.value, 10);
        this.shippingDurations[orderId] = duration;
        this.loadPreview(orderId, duration);
    }

    async loadPreview(orderId, duration) {
        const order = this.orders.find(o => o.Id === orderId);
        if (!order || !order.Occasion_Date__c) return;

        // Calculate production deadline: occasionDate - duration - 1
        const occasionDate = new Date(order.Occasion_Date__c);
        const deadlineDate = new Date(occasionDate);
        deadlineDate.setDate(occasionDate.getDate() - duration - 1);

        try {
            const preview = await getCapacityPreview({
                orderId: orderId,
                productionDeadline: deadlineDate.toISOString().split('T')[0]
            });
            this.previews[orderId] = preview;
            this.refreshOrderList();
        } catch (error) {
            console.error(error);
        }
    }

    refreshOrderList() {
        this.orders = this.orders.map(order => ({
            ...order,
            shippingDuration: this.shippingDurations[order.Id] || 3,
            preview: this.previews[order.Id] || null,
            trackingNumber: this.trackingNumbers[order.Id] || ''
        }));
    }

    async handleAccept(event) {
        const orderId = event.target.dataset.id;
        const duration = this.shippingDurations[orderId] || 3;
        try {
            await acceptOrder({
                orderId,
                shippingDurationDays: duration
            });
            refreshApex(this.wiredOrdersResult);
        } catch (error) {
            alert(error.body.message);
        }
    }

    get showNextAction() {
        return NEXT_STATUS[this.activeTab] !== undefined;
    }

    async handleNextStatus(event) {
        const orderId = event.target.dataset.id;
        const nextStatus = NEXT_STATUS[this.activeTab];
        const trackNum = nextStatus === 'SHIPPED' ? this.trackingNumbers[orderId] : null;
        try {
            await updateOrderStatus({ orderId, status: nextStatus, trackingNumber: trackNum });
            refreshApex(this.wiredOrdersResult);
        } catch (error) {
            alert(error.body.message);
        }
    }

    get isReadyToShip() {
        return this.activeTab === 'READY_TO_SHIP';
    }

    handleTrackingChange(event) {
        const orderId = event.target.dataset.id;
        this.trackingNumbers[orderId] = event.target.value;
    }
}
