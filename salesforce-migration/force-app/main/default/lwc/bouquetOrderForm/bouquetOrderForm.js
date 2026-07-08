import { LightningElement, api, track, wire } from 'lwc';
import placeGuestOrder from '@salesforce/apex/BouquetOrderController.placeGuestOrder';
import isUserLoggedIn from '@salesforce/apex/BouquetUserController.isUserLoggedIn';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';

export default class BouquetOrderForm extends NavigationMixin(LightningElement) {
    @api productId;
    @api productPrice;
    @track formData = {
        quantity: 1,
        occasionType: 'Birthday'
    };
    @track error;
    @track isSubmitting = false;
    @track isLoggedIn = false;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference && currentPageReference.state) {
            this.productId = currentPageReference.state.c__productId || this.productId;
            this.productPrice = currentPageReference.state.c__productPrice || this.productPrice;
        }
    }

    @wire(isUserLoggedIn)
    wiredLogin({ data }) {
        this.isLoggedIn = data;
    }

    get minDate() {
        return new Date().toISOString().split('T')[0];
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
        return (this.productPrice || 0) * (this.formData.quantity || 1);
    }

    async handleSubmit() {
        const allValid = [...this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea')]
            .reduce((validSoFar, inputCmp) => {
                inputCmp.reportValidity();
                return validSoFar && inputCmp.checkValidity();
            }, true);

        if (!allValid) {
            this.error = 'Please fill in all required fields correctly.';
            return;
        }

        this.isSubmitting = true;
        this.error = null;

        try {
            const result = await placeGuestOrder({
                orderData: {
                    ...this.formData,
                    productId: this.productId
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
            console.error(err);
            this.error = err.body ? err.body.message : err.message;
        } finally {
            this.isSubmitting = false;
        }
    }
}
