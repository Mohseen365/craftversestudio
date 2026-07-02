import { LightningElement, api, track, wire } from 'lwc';
import placeGuestOrder from '@salesforce/apex/BouquetOrderController.placeGuestOrder';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';

export default class BouquetOrderForm extends NavigationMixin(LightningElement) {
    @api productId;
    @api productionHours;
    @api productPrice;
    @track formData = {
        quantity: 1,
        occasionType: 'Birthday'
    };
    @track error;
    @track isSubmitting = false;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference && currentPageReference.state) {
            this.productId = currentPageReference.state.c__productId || this.productId;
            this.productionHours = currentPageReference.state.c__productionHours || this.productionHours;
            this.productPrice = currentPageReference.state.c__productPrice || this.productPrice;
        }
    }

    occasionOptions = [
        { label: 'Birthday', value: 'Birthday' },
        { label: 'Anniversary', value: 'Anniversary' },
        { label: 'Wedding', value: 'Wedding' },
        { label: 'Other', value: 'Other' }
    ];

    handleInputChange(event) {
        this.formData[event.target.name] = event.target.value;
    }

    get subtotal() {
        return (this.productPrice || 0) * this.formData.quantity;
    }

    async handleSubmit() {
        this.isSubmitting = true;
        this.error = null;

        try {
            const result = await placeGuestOrder({
                orderData: {
                    ...this.formData,
                    productId: this.productId,
                    productionHours: this.productionHours,
                    totalAmount: this.subtotal,
                    notes: this.template.querySelector('[name="notes"]').value
                }
            });

            this[NavigationMixin.Navigate]({
                type: 'standard__navItemPage',
                attributes: {
                    apiName: 'Bouquet_Tracking'
                },
                state: {
                    c__orderId: result.orderId
                }
            });
        } catch (err) {
            this.error = err.body.message;
        } finally {
            this.isSubmitting = false;
        }
    }
}
