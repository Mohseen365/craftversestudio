import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class BouquetHome extends NavigationMixin(LightningElement) {
    steps = [
        { id: '1', title: 'Browse', desc: 'Search and filter bouquets by price' },
        { id: '2', title: 'Pick a date', desc: 'System checks daily capacity automatically' },
        { id: '3', title: 'Pay & upload', desc: 'Upload payment screenshot for verification' },
        { id: '4', title: 'Track', desc: 'Follow status from production to delivery' }
    ];

    navigateToCatalog() {
        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: {
                apiName: 'Bouquet_Catalog'
            }
        });
    }

    navigateToTrack() {
        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: {
                apiName: 'Bouquet_Tracking'
            }
        });
    }

    handleOrderNow(event) {
        const productId = event.detail.productId;
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
