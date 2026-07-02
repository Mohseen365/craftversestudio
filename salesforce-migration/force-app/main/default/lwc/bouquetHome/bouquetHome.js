import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class BouquetHome extends NavigationMixin(LightningElement) {
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
}
