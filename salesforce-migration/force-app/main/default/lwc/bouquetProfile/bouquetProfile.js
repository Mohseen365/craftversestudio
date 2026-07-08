import { LightningElement, wire, track } from 'lwc';
import getUserProfile from '@salesforce/apex/BouquetUserController.getUserProfile';
import { updateRecord } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class BouquetProfile extends LightningElement {
    @track profile;
    wiredProfileResult;

    @wire(getUserProfile)
    wiredProfile(result) {
        this.wiredProfileResult = result;
        if (result.data) {
            this.profile = result.data;
        }
    }

    async handleUpdate() {
        const fields = {};
        fields.Id = this.profile.contact.Id;
        fields.FirstName = this.template.querySelector('[name="firstName"]').value;
        fields.LastName = this.template.querySelector('[name="lastName"]').value;
        fields.Phone = this.template.querySelector('[name="phone"]').value;

        const recordInput = { fields };

        try {
            await updateRecord(recordInput);
            this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: 'Profile updated', variant: 'success' }));
            return refreshApex(this.wiredProfileResult);
        } catch (error) {
            console.error(error);
        }
    }
}
