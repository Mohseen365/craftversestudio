import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class BouquetProductCard extends NavigationMixin(LightningElement) {
    @api product;

    handleOrderNow() {
        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: {
                apiName: 'Bouquet_Order_Form'
            },
            state: {
                c__productId: this.product.Id,
                c__productPrice: this.product.Price__c
            }
        });
    }

    handleViewDetail() {
        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: {
                apiName: 'Bouquet_Product_Detail'
            },
            state: {
                c__productId: this.product.Id
            }
        });
    }
}
