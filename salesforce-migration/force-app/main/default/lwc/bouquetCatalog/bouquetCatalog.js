import { LightningElement, wire, track } from 'lwc';
import getAvailableProducts from '@salesforce/apex/BouquetProductController.getAvailableProducts';
import { NavigationMixin } from 'lightning/navigation';

export default class BouquetCatalog extends NavigationMixin(LightningElement) {
    @track searchQuery = '';
    @track sortBy = 'newest';
    @track selectedCategory = 'All';
    delayTimeout;

    categories = ['All', 'Rose', 'Tulip', 'Mini', 'Luxury'];

    sortOptions = [
        { label: 'Newest', value: 'newest' },
        { label: 'Price: Low to High', value: 'price-low' },
        { label: 'Price: High to Low', value: 'price-high' }
    ];

    @wire(getAvailableProducts, { query: '$searchQuery', category: '$selectedCategory', priceRange: 'all', sortBy: '$sortBy' })
    products;

    handleSearchChange(event) {
        window.clearTimeout(this.delayTimeout);
        const searchKey = event.target.value;
        // Native Optimization: Debouncing search to reduce Apex calls
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
        const productId = event.target.dataset.id;
        console.log('Order now for product:', productId);
    }
}
