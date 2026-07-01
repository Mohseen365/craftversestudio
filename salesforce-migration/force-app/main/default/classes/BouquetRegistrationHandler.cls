global class BouquetRegistrationHandler implements Auth.RegistrationHandler {

    global User createUser(Id portalId, Auth.UserData data) {
        // Find or create Contact based on email
        List<Contact> contacts = [SELECT Id, AccountId FROM Contact WHERE Email = :data.email LIMIT 1];
        Contact c;
        if (contacts.isEmpty()) {
            c = new Contact(
                FirstName = data.firstName,
                LastName = data.lastName,
                Email = data.email
            );
            insert c;
        } else {
            c = contacts[0];
        }

        // Setup user - Profile mapping should ideally be dynamic or from custom setting
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' OR Name = 'Customer Community User' LIMIT 1];
        User u = new User();
        u.Username = data.email + '.bouquet';
        u.Email = data.email;
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
        User u = [SELECT Id, Email, FirstName, LastName FROM User WHERE Id = :userId];
        u.Email = data.email;
        u.LastName = data.lastName;
        u.FirstName = data.firstName;
        update u;
    }
}
