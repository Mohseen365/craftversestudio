global class BouquetRegistrationHandler implements Auth.RegistrationHandler {

    global User createUser(Id portalId, Auth.UserData data) {
        String email = data.email;
        List<Contact> contacts = [SELECT Id FROM Contact WHERE Email = :email WITH SECURITY_ENFORCED LIMIT 1];
        Contact c;
        if (contacts.isEmpty()) {
            c = new Contact(FirstName = data.firstName, LastName = data.lastName, Email = email);
            insert Security.stripInaccessible(AccessType.CREATABLE, new List<Contact>{c}).getRecords();
        } else {
            c = contacts[0];
        }

        // Native Optimization: Resolve Profile from Custom Metadata
        String profileName = BouquetSettings.getSetting('CUSTOMER_PROFILE', 'Customer Community User');
        Profile p = [SELECT Id FROM Profile WHERE Name = :profileName LIMIT 1];

        User u = new User();
        u.Username = email + '.bouquet';
        u.Email = email;
        u.LastName = data.lastName;
        u.FirstName = data.firstName;
        u.Alias = (data.firstName.left(1) + data.lastName.left(4)).toLowerCase();
        u.LanguageLocaleKey = 'en_US';
        u.LocaleSidKey = 'en_US';
        u.EmailEncodingKey = 'UTF-8';
        u.TimeZoneSidKey = 'America/Los_Angeles';
        u.ProfileId = p.Id;
        u.ContactId = c.Id;

        return u;
    }

    global void updateUser(Id userId, Id portalId, Auth.UserData data) {
        User u = new User(Id = userId, Email = data.email, FirstName = data.firstName, LastName = data.lastName);
        update Security.stripInaccessible(AccessType.UPDATABLE, new List<User>{u}).getRecords();
    }
}
