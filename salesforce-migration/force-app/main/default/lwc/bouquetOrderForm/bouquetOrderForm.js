import { LightningElement, api, track } from 'lwc';
import placeGuestOrder from '@salesforce/apex/BouquetOrderController.placeGuestOrder';
import { NavigationMixin } from 'lightning/navigation';

export default class BouquetOrderForm extends NavigationMixin(LightningElement) {
    @api productId;
    @track formData = {
        quantity: 1
    };
    @track error;
    @track isSubmitting = false;

    handleInputChange(event) {
        this.formData[event.target.name] = event.target.value;
    }

    async handleSubmit() {
        this.isSubmitting = true;
        this.error = null;

        try {
            const result = await placeGuestOrder({
                orderData: {
                    ...this.formData,
                    productId: this.productId,
                    totalAmount: 100 // Mock price logic
                }
            });
            console.log('Order created:', result.orderNumber);
            // Navigate to tracking
        } catch (err) {
            this.error = err.body.message;
        } finally {
            this.isSubmitting = false;
        }
    }
}
