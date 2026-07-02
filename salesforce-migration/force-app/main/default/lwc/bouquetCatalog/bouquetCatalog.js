import { LightningElement, wire, track } from 'lwc';
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

    categories = ['All', 'Rose', 'Tulip', 'Mini', 'Luxury'];

    sortOptions = [
        { label: 'Newest', value: 'newest' },
        { label: 'Price: Low to High', value: 'price-low' },
        { label: 'Price: High to Low', value: 'price-high' },
        { label: 'Best Sellers', value: 'best' }
    ];

    @wire(getAvailableProducts, { query: '$searchQuery', category: '$selectedCategory', priceRange: 'all', sortBy: '$sortBy' })
    products;

    handleSearchChange(event) {
        window.clearTimeout(this.delayTimeout);
        const searchKey = event.target.value;
        this.delayTimeout = setTimeout(() => {
            this.searchQuery = searchKey;
        }, 350);
    }

    handleSortChange(event) {
        this.sortBy = event.target.value;
    }

    handleCategoryClick(event) {
        this.selectedCategory = event.target.dataset.name;
    }

    handleOrderNow(event) {
        const productId = event.detail.productId;
        const price = event.detail.price;

        publish(this.messageContext, BOUQUET_MC, {
            productId: productId,
            price: price
        });

        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: productId,
                objectApiName: 'Product2',
                actionName: 'view'
            }
        });
    }
}
