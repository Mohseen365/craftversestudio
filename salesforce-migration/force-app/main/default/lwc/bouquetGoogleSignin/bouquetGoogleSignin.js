import { LightningElement } from 'lwc';

export default class BouquetGoogleSignin extends LightningElement {
    handleSignin() {
        // In a real Salesforce environment, this would redirect to the Auth Provider initialization URL
        // Example: /services/auth/sso/GoogleProvider?community=https://...
        window.location.href = '/services/auth/sso/GoogleProvider';
    }
}
