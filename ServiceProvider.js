/*
* adonis-auth
*
* (c) Kevin Viglucci <kviglucci@gmail.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

const { ServiceProvider } = require.main.require('@adonisjs/fold');
const _ = require('lodash');

const Driver = require('./Drivers/BattlenetDriver');

class AllyBattlenetServiceProvider extends ServiceProvider {

    /**
    * The register method called by ioc container
    * as a life-cycle method
    *
    * @method register
    *
    * @return {void}
    */
    register() {
        this.app.singleton('adonis-ally-battlenet', (app) => {
            return Driver;
        });
    }

    boot() {
        const implementation = use('adonis-ally-battlenet');
        this.app.extend('Adonis/Addons/Ally', 'battlenet', () => {
            return this.app.make(implementation);
        });
    }
}

module.exports = AllyBattlenetServiceProvider;