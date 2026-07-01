import { LightningElement, wire, track } from 'lwc';
import getAvailableProducts from '@salesforce/apex/BouquetProductController.getAvailableProducts';
import { NavigationMixin } from 'lightning/navigation';

export default class BouquetCatalog extends NavigationMixin(LightningElement) {
    @track searchQuery = '';
    @track sortBy = 'newest';

    sortOptions = [
        { label: 'Newest', value: 'newest' },
        { label: 'Price: Low to High', value: 'price-low' },
        { label: 'Price: High to Low', value: 'price-high' }
    ];

    @wire(getAvailableProducts, { query: '$searchQuery', priceRange: 'all', sortBy: '$sortBy' })
    products;

    handleSearchChange(event) {
        this.searchQuery = event.target.value;
    }

    handleSortChange(event) {
        this.sortBy = event.target.value;
    }

    handleOrderNow(event) {
        const productId = event.target.dataset.id;
        // In a real migration, this would navigate to the Order Form LWC
        console.log('Order now for product:', productId);
    }
}
