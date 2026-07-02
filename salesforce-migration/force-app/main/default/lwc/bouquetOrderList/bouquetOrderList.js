import { LightningElement, wire, track } from 'lwc';
import getMyOrders from '@salesforce/apex/BouquetOrderController.getMyOrders';
import { NavigationMixin } from 'lightning/navigation';

const ACTIVE_STATUSES = ['PENDING_REVIEW', 'ACCEPTED', 'PAYMENT_PENDING', 'PAYMENT_SUBMITTED', 'PAYMENT_VERIFICATION', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP'];

export default class BouquetOrderList extends NavigationMixin(LightningElement) {
    @track orders;

    @wire(getMyOrders)
    wiredOrders({ error, data }) {
        if (data) {
            this.orders = data.map(ord => ({
                ...ord,
                itemName: ord.Order_Items__r && ord.Order_Items__r.length > 0 ? ord.Order_Items__r[0].Product__r.Name : 'Bouquet'
            }));
        } else if (error) {
            console.error(error);
        }
    }

    get activeOrders() {
        return this.orders ? this.orders.filter(o => ACTIVE_STATUSES.includes(o.Status__c)) : [];
    }

    get pastOrders() {
        return this.orders ? this.orders.filter(o => !ACTIVE_STATUSES.includes(o.Status__c)) : [];
    }

    handleViewDetails(event) {
        const orderId = event.currentTarget.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: {
                apiName: 'Bouquet_Tracking'
            },
            state: {
                c__orderId: orderId
            }
        });
    }

    navigateToCatalog() {
        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: {
                apiName: 'Bouquet_Catalog'
            }
        });
    }
}
