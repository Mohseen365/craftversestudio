import { LightningElement, api } from 'lwc';

const ALL_STATUSES = [
    'PENDING_REVIEW', 'ACCEPTED', 'PAYMENT_PENDING', 'PAYMENT_SUBMITTED',
    'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'
];

export default class BouquetOrderTimeline extends LightningElement {
    @api currentStatus;

    get steps() {
        const currentIndex = ALL_STATUSES.indexOf(this.currentStatus);
        return ALL_STATUSES.map((status, index) => {
            let className = 'slds-progress__item';
            if (index < currentIndex) className += ' slds-is-completed';
            else if (index === currentIndex) className += ' slds-is-active';

            return {
                status,
                label: status.replace('_', ' '),
                className
            };
        });
    }
}
