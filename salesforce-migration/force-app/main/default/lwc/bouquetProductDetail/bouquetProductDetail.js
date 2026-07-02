import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { NavigationMixin } from 'lightning/navigation';

const FIELDS = [
    'Product2.Name', 'Product2.Description', 'Product2.Price__c',
    'Product2.Image_URL__c', 'Product2.Category__c', 'Product2.Production_Hours__c',
    'Product2.Stock_Quantity__c'
];

export default class BouquetProductDetail extends NavigationMixin(LightningElement) {
    @api recordId;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredProduct;

    get product() {
        if (!this.wiredProduct.data) return null;
        const fields = this.wiredProduct.data.fields;
        return {
            Id: this.recordId,
            Name: fields.Name.value,
            Description: fields.Description.value,
            Price__c: fields.Price__c.value,
            Image_URL__c: fields.Image_URL__c.value,
            Category__c: fields.Category__c.value,
            Production_Hours__c: fields.Production_Hours__c.value,
            Stock_Quantity__c: fields.Stock_Quantity__c.value
        };
    }

    get isOutOfStock() {
        return this.product && this.product.Stock_Quantity__c <= 0;
    }

    handleOrder() {
        // Navigate to a custom LWC page for the Order Form, passing product details via state
        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: {
                apiName: 'Bouquet_Order_Form'
            },
            state: {
                c__productId: this.recordId,
                c__productionHours: this.product.Production_Hours__c,
                c__productPrice: this.product.Price__c
            }
        });
    }
}
