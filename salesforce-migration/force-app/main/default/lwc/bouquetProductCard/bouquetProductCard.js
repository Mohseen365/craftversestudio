import { LightningElement, api } from 'lwc';

export default class BouquetProductCard extends LightningElement {
    @api product;

    handleOrderNow() {
        const orderEvent = new CustomEvent('ordernow', {
            detail: { productId: this.product.Id }
        });
        this.dispatchEvent(orderEvent);
    }
}
