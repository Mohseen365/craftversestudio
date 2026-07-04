import { LightningElement, wire, track } from 'lwc';
import getAvailableProducts from '@salesforce/apex/BouquetProductController.getAvailableProducts';
import { NavigationMixin } from 'lightning/navigation';

export default class BouquetCatalog extends NavigationMixin(LightningElement) {
    @track searchQuery = '';
    @track sortBy = 'newest';
    @track selectedCategory = 'All';
    delayTimeout;

    categories = ['All', 'Bouquets', 'Wedding', 'Mini', 'Luxury'];

    sortOptions = [
        { label: 'Newest', value: 'newest' },
        { label: 'Price: Low to High', value: 'price-low' },
        { label: 'Price: High to Low', value: 'price-high' },
        { label: 'Best Sellers', value: 'best' }
    ];

    @wire(getAvailableProducts, {
        query: '$searchQuery',
        category: '$selectedCategory',
        priceRange: 'all',
        sortBy: '$sortBy'
    })
    products;

    get hasProducts() {
        return this.products.data && this.products.data.length > 0;
    }

    handleSearchChange(event) {
        window.clearTimeout(this.delayTimeout);
        const searchKey = event.target.value;
        this.delayTimeout = setTimeout(() => {
            this.searchQuery = searchKey;
        }, 400);
    }

    handleSortChange(event) {
        this.sortBy = event.target.value;
    }

    handleCategoryClick(event) {
        this.selectedCategory = event.target.dataset.name;
    }

    handleClearSearch() {
        this.searchQuery = '';
        const searchInput = this.template.querySelector('lightning-input[type="search"]');
        if (searchInput) searchInput.value = '';
    }

    handleOrderNow(event) {
        const productId = event.detail.productId;
        const product = this.products.data.find(p => p.Id === productId);

        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: {
                apiName: 'Bouquet_Order_Form'
            },
            state: {
                c__productId: productId,
                c__productPrice: product?.Price__c
            }
        });
    }
}
