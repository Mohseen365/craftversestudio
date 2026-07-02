import { LightningElement, track, wire } from 'lwc';
import getAvailableProducts from '@salesforce/apex/BouquetProductController.getAvailableProducts';
import { NavigationMixin } from 'lightning/navigation';
import { publish, MessageContext } from 'lightning/messageService';
import BOUQUET_MC from '@salesforce/messageChannel/BouquetMessageChannel__c';

export default class BouquetCatalog extends NavigationMixin(LightningElement) {
    @track searchQuery = '';
    @track sortBy = 'newest';
    @track selectedCategory = 'All';
    delayTimeout;

    @wire(MessageContext)
    messageContext;

    // ... sortOptions and categories as before ...

    @wire(getAvailableProducts, { query: '$searchQuery', category: '$selectedCategory', priceRange: 'all', sortBy: '$sortBy' })
    products;

    handleOrderNow(event) {
        const productId = event.detail.productId;
        const price = event.detail.price;

        // Native Optimization: Use LMS to notify other components (e.g., a sticky cart or detail sidebar)
        publish(this.messageContext, BOUQUET_MC, {
            productId: productId,
            price: price
        });

        // Still provide standard navigation
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: productId,
                objectApiName: 'Product2',
                actionName: 'view'
            }
        });
    }

    // ... search and sort handlers ...
}
