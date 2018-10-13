/*
 * adonis-ally-battlenet
 *
 * (c) Kevin Viglucci <kviglucci@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

const AllyExceptions = require('@adonisjs/ally/src/Exceptions');
const AllyOAuth2Scheme = require('@adonisjs/ally/src/Schemes/OAuth2');
const AllyUser = require('@adonisjs/ally/src/AllyUser');
const AllyUtils = require('@adonisjs/ally/lib/utils');
const request = require('request-promise');
const _ = require('lodash');

class BattlenetDriver extends AllyOAuth2Scheme {

    constructor(Config) {
        const config = Config.get('services.ally.battlenet')

        AllyUtils.validateDriverConfig('battlenet', config, ['clientId', 'clientSecret', 'redirectUri'])

        super(config.clientId, config.clientSecret, config.headers);

        /**
         * Oauth specific values to be used when creating the redirect
         * url or fetching user profile.
         */
        this._initial_scopes = this._getInitialScopes(config.scope);
        this._redirectUri = config.redirectUri;
        this._redirectUriOptions = _.merge({ response_type: 'code' }, config.options);
    }

    /**
     * Injections to be made by the IoC container
     *
     * @return {Array}
     */
    static get inject() {
        return ['Adonis/Src/Config'];
    }

    /**
     * Scope seperator for seperating multiple
     * scopes.
     *
     * @return {String}
     */
    get scopeSeperator() {
        return ' '
    }

    /**
     * Base url to be used for constructing
     * oauth urls.
     *
     * @return {String}
     */
    get baseUrl() {
        return 'https://us.battle.net/oauth'
    }

    /**
     * Relative url to be used for redirecting
     * user.
     *
     * @return {String} [description]
     */
    get authorizeUrl() {
        return 'authorize'
    }

    /**
     * Relative url to be used for retrieving
     * access token.
     *
     * @return {String}
     */
    get accessTokenUrl() {
        return 'token'
    }

    /**
     * API url to be used for getting the battlenet user's profile
     *
     * @return {String}
     */
    get apiUrl() {
        return 'https://us.battle.net/oauth'
    }

    /**
     * Returns initial scopes to be used right from the
     * config file. Otherwise it will fallback to the
     * commonly used scopes
     *
     * @param   {Array} scopes
     *
     * @return  {Array}
     *
     * @private
     */
    _getInitialScopes(scopes) {
        return _.size(scopes) ? scopes : ['account.public'];
    }

    /**
     * Returns the user profile as an object using the
     * access token
     *
     * @param   {String} accessToken
     * @param   {Array} [fields]
     *
     * @return  {Object}
     *
     * @private
     */
    async _getUserProfile(accessToken, fields) {
        const options = {
            uri: `${this.apiUrl}/userinfo`,
            headers: {
                'Authorization': accessToken ? 'Bearer ' + accessToken : undefined,
                'Accept': 'application/json'
            },
            json: true
        };
        return request(options);
    }

    /**
     * Returns the redirect url for a given provider.
     *
     * @param  {Array} scopes
     *
     * @return {String}
     */
    async getRedirectUrl(scopes) {
        scopes = _.size(scopes) ? scopes : [];
        const additionalScopes = _.size(this.scope) ? this.scope : []; // scopes added via driver.scope([])
        const defaultOrConfiguredScopes = this._initial_scopes;
        scopes = _.uniq(
            scopes
                .concat(defaultOrConfiguredScopes)
                .concat(additionalScopes)
        );
        return this.getUrl(this._redirectUri, scopes, this._redirectUriOptions);
    }

    /**
     * Parses provider error by fetching error message
     * from nested data property.
     *
     * @param  {Object} error
     *
     * @return {Error}
     */
    parseProviderError(error) {
        const parsedError = _.isString(error.data) ? JSON.parse(error.data) : null;
        const message = _.get(parsedError, 'message', error);
        return AllyExceptions.OAuthException.tokenExchangeException(message, error.statusCode, parsedError);
    }

    /**
     * Parses the redirect errors returned by battlenet
     * and returns the error message.
     *
     * @param  {Object} queryParams
     *
     * @return {String}
     */
    parseRedirectError(queryParams) {
        return queryParams.error_message || 'Oauth failed during redirect';
    }

    /**
     * Returns the user profile with it's access token, refresh token
     * and token expiry
     *
     * @param {Object} queryParams
     * @param {Array} [fields]
     *
     * @return {Object}
     */
    async getUser(queryParams, fields) {
        const code = queryParams.code;

        /**
         * Throw an exception when query string does not have
         * code.
         */
        if (!code) {
            const errorMessage = this.parseRedirectError(queryParams);
            throw AllyExceptions.OAuthException.tokenExchangeException(errorMessage, null, errorMessage);
        }
        const accessTokenResponse = await this.getAccessToken(code, this._redirectUri, {
            grant_type: 'authorization_code'
        });

        const userProfile = await this._getUserProfile(accessTokenResponse.accessToken, fields);

        const user = new AllyUser();

        user
            .setOriginal(userProfile)
            .setFields(
                userProfile.id,
                null,
                null,
                userProfile.battletag,
                null
            )
            .setToken(
                accessTokenResponse.accessToken,
                accessTokenResponse.refreshToken,
                null,
                Number(accessTokenResponse.expires_in)
            );

        return user;
    }
}

module.exports = BattlenetDriver;
