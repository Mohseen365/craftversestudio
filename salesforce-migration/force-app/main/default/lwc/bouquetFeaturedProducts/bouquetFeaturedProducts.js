import { LightningElement, wire } from 'lwc';
import getFeaturedProducts from '@salesforce/apex/BouquetProductController.getFeaturedProducts';

export default class BouquetFeaturedProducts extends LightningElement {
    @wire(getFeaturedProducts)
    products;

    handleOrderNow(event) {
        // Bubble up or navigate
    }
}
