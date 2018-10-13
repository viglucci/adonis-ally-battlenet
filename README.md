# adonis-ally-battlenet

Provides a Driver for Adonis Ally for supporting OAuth logins via [Blizzard/Battle.net](https://develop.battle.net).

## Setup

### Installation

```
npm install adonis-ally-battlenet
```

### Register Service Provider

Add the `adonis-ally-battlenet` servicer provider to your providers array in `start/app.js`.

```
const providers = [
  ...
  'adonis-ally-battlenet/ServiceProvider'
]
```

### Update configuration

Update the services configuration file in `config/services.js` with a `battlenet` property. 

```
/*
|--------------------------------------------------------------------------
| Services Configuration
|--------------------------------------------------------------------------
|
| This is general purpose file to define configuration for multiple services.
| The below config is for the ally provider. Make sure to save it inside
| config/services.js file.
|
| Happy Coding :)
|
*/

const Env = use('Env')

module.exports = {
  ally: {
    /*
    |--------------------------------------------------------------------------
    | Battlenet Configuration
    |--------------------------------------------------------------------------
    |
    | You can access your application credentials from the Blizzard developers
    | portal. https://develop.battle.net/access/
    |
    */
    battlenet: {
      // client_id  obtained from https://develop.battle.net/access/
      clientId: Env.get('BATTLENET_CLIENT_ID'),

      // client_secret obtained from https://develop.battle.net/access/
      clientSecret: Env.get('BATTLENET_CLIENT_SECRET'),

      // app URL must be the same as configured on the developer portal
      redirectUri: `${Env.get('APP_URL')}/authenticated/battlenet`,

      // additional scopes you wish to always request on login
      scope: ['wow.profile']
    },

    ...
  }
};
```

Don't forget to add the `BATTLENET_CLIENT_ID` and `BATTLENET_CLIENT_SECRET` to your `.env` file.

## Usage

`start/routes.js`

```
const Route = use('Route')

Route.get('login', 'LoginController.redirect');
Route.get('authenticated/battlenet', 'LoginController.callback');
```

`app/Controllers/Http/LoginController.js`

```
class LoginController {

  async redirect({ ally }) {
    const driver = ally.driver('battlenet')
    await driver
      .scope(['sc2.profile']) // additionally request permission to access the users SC2 profile
      .redirect();
  }

  async callback({ ally, auth, response }) {
    const battlenerUser = await ally.driver('battlenet').getUser();

    // user details to be saved
    const userDetails = {
      id: battlenerUser.getId(),
      nickname: battlenerUser.getNickname(),
      token: battlenerUser.getAccessToken(),
      login_source: 'battlenet'
    };

    // Battle.net does not provide the email during OAuth login,
    // so you may need to add additional logic to ask the user for their
    // email or other information if you want to save that in your database as well.

    return response.json(userDetails);
  }
}

module.exports = LoginController;

```
