import { LightningElement, wire, track } from 'lwc';
import getAvailableProducts from '@salesforce/apex/BouquetProductController.getAvailableProducts';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const COLUMNS = [
    { label: 'Name', fieldName: 'Name' },
    { label: 'Description', fieldName: 'Description' },
    { label: 'Production Hours', fieldName: 'Production_Hours__c', type: 'number' },
    {
        type: 'action',
        typeAttributes: { rowActions: [{ label: 'Edit', name: 'edit' }] },
    },
];

export default class BouquetProductManager extends LightningElement {
    @track products = [];
    @track isModalOpen = false;
    @track selectedProductId;
    columns = COLUMNS;
    wiredProductsResult;

    @wire(getAvailableProducts, { query: '', priceRange: 'all', sortBy: 'newest' })
    wiredProducts(result) {
        this.wiredProductsResult = result;
        if (result.data) {
            this.products = result.data;
        }
    }

    get modalTitle() {
        return this.selectedProductId ? 'Edit Product' : 'New Product';
    }

    handleNewProduct() {
        this.selectedProductId = null;
        this.isModalOpen = true;
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        if (actionName === 'edit') {
            this.selectedProductId = row.Id;
            this.isModalOpen = true;
        }
    }

    closeModal() {
        this.isModalOpen = false;
    }

    handleSuccess() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Product saved successfully',
                variant: 'success',
            })
        );
        this.isModalOpen = false;
        refreshApex(this.wiredProductsResult);
    }
}
