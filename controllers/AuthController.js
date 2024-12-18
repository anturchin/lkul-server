const { notFound, conflict, badRequest, unauthorized  } = require('boom');
const { Types } = require("mongoose");
const auth = require('vvdev-auth');
const User = require("../models/User");
const SubLogin = require("../models/SubLogin");
const { createDefaultRoles, login} = require("./UserController");
const { Consumer } = require("../models");
const { sign } = require("../libs/jwt");
const https = require("node:https");
const axios = require("axios");
const requestIp = require("request-ip");
const jwt = require("jsonwebtoken");
const querystring = require("node:querystring");

class AuthController {
    constructor({ config }) {
        this.config = config;
    }

    getKeycloakConfig() {
        return this.config.keycloakConfig;
    }

    getKeycloakRedirectUrl(){
        const { authServerUrl, realm, resource } = this.getKeycloakConfig();
        const keycloakParams = {
            client_id: resource,
            redirect_uri: this.config.redirectUriBack,
            response_type: 'code',
            scope: 'openid',
        };
        const keycloakAuthUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/auth?${querystring.stringify(keycloakParams)}`;
        return keycloakAuthUrl;
    }

    async handleKeyCloakLogin({ code, res }){
        const { access_token, refresh_token } = await this._exchangeCodeForTokens({ code });
        const { kuser } = this._extractUserFromToken({ access_token });
        return await this._processUserAndSetTokens({
            res,
            userInfo: kuser,
            access_token,
            refresh_token,
        });
    }

    async updateRegionAndLogin({req, userId, regionId }){
        const user = await this._updateUserRegion({ userId, regionId });
        const { accessToken, refreshToken } = this._getTokensFromCookies({ req, userId });
        this._setIp({ req });
        const result = await login({
            login: user.email,
            password: this.config.defaultUserPassword,
        });
        return {
            result,
            keycloak: {
                accessToken,
                refreshToken,
            },
        };
    }

    async getTokens({ req, userId }){
        const { accessToken, refreshToken } = this._getTokensFromCookies({ req, userId });
        const subLogin = await this._findUserById({ userId });
        this._setIp({ req });
        const result = await this._simpleLogin({ login: subLogin.login })
        return {
            result,
            keycloak: {
                accessToken,
                refreshToken,
            },
        };
    }

    async logout({ req, res, userId }){
        const { authServerUrl, realm, resource, credentials: { secret } } = this.getKeycloakConfig();
        const logoutUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/logout`;
        const { refreshToken } = this._getTokensFromCookies({ req, userId });
        const params = new URLSearchParams({
            client_id: resource,
            client_secret: secret,
            refresh_token: refreshToken,
        });
        this._clearTokensFromCookies({ res, userId });
        const httpsAgent = this.config.PROFILE === this.config.envTypes.LOCAL
            ? new https.Agent({ ca: this.config.keycloakCerts })
            : undefined;
        await axios.post(logoutUrl, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            ...(httpsAgent ? { httpsAgent } : {}),
        });
    }

    async _findUserById({ userId }) {
        const subLogin = await SubLogin.findById(userId);
        if (!subLogin) {
            throw notFound('Пользователь не найден');
        }
        return subLogin;
    }

    async _updateUserRegion({ userId, regionId }) {
        const user = await User.findOneAndUpdate(
            { _id: Types.ObjectId(userId) },
            { regionId: Types.ObjectId(regionId) },
            { new: true }
        );
        if (!user) {
            throw notFound('Пользователь не найден');
        }
        return user;
    }

    async _findUserByEmail({ email }) {
        const [ existsUser, existsSubLogin ] = await Promise.all([
            User.findOne({email}),
            SubLogin.findOne({login: email})
        ]);
        return { existsUser, existsSubLogin };
    }

    async _generateHashPassword({ password }) {
        return auth.hashPassword(password);
    }

    _extractUserFromToken({ access_token }) {
        if (!access_token) {
            throw badRequest('Токен отсутствует.');
        }
        try {
            const decodedToken = jwt.decode(access_token, { complete: false });
            if (!decodedToken || typeof decodedToken !== 'object') {
                throw badRequest('Не удалось декодировать токен.');
            }
            const kuser = {
                email: decodedToken.email,
                given_name: decodedToken.given_name,
                family_name: decodedToken.family_name,
            };
            return { kuser };
        } catch (error) {
            console.error(`[KEYCLOAK]: Ошибка при обработке токена: ${error.message}`);
            throw badRequest(`Ошибка при обработке токена: ${error.message}`);
        }
    }

    _setIp({ req }){
        const ip = requestIp.getClientIp(req);
        req.body.ip = ip;
    }

    _clearTokensFromCookies({ res, userId }) {
        res.clearCookie(`access_token_${userId}`, {
            httpOnly: true,
            secure: false,
        });
        res.clearCookie(`refresh_token_${userId}`, {
            httpOnly: true,
            secure: false,
        });
    }

    _validateCookie({ req, cookieName }) {
        if (!req.cookies) {
            throw badRequest('Cookies не найдены в запросе.');
        }
        const cookieValue = req.cookies[cookieName];
        if (!cookieValue) {
            throw badRequest(`Кука "${cookieName}" не найдена.`);
        }
        return cookieValue;
    }

    _getTokensFromCookies({ req, userId }) {
        const accessToken = this._validateCookie({
            req,
            cookieName: `access_token_${userId}`,
        });
        const refreshToken = this._validateCookie({
            req,
            cookieName: `refresh_token_${userId}`,
        });
        if (!accessToken || !refreshToken) {
            throw badRequest('Токены Keycloak не найдены в куках. Пожалуйста, убедитесь, что вы прошли авторизацию.');
        }
        return { accessToken, refreshToken };
    }

    _checkUserStatus({ subLogin }){
        if (subLogin.blocked || !subLogin.user || subLogin.user.blocked) {
            throw unauthorized(
                'Пользователь заблокирован Web-администратором ЛКЮЛ. Для получения информации обратитесь F0500509@gazmsk.ru'
            );
        }
    }

    _validateLoginInput({ login }){
        if (!login) {
            throw badRequest('Логин не указан');
        }
    }

    _filterConsumers({ consumers, regionId }) {
        return consumers.filter((c) => {
            if (!c.ssdUri || !c.ssdUri.regionId || !regionId) {
                return false;
            }
            return c.ssdUri.regionId.toString() === regionId.toString();
        });
    }

    _setTokensInCookies({ res, userId, access_token, refresh_token }) {
        res.cookie(`access_token_${userId}`, access_token, {
            httpOnly: true,
            secure: false,
        });
        res.cookie(`refresh_token_${userId}`, refresh_token, {
            httpOnly: true,
            secure: false,
        });
    }

    async _createUser({ userInfo }) {
        const { existsUser } = await this._findUserByEmail({ email: userInfo.email });
        if (existsUser) {
            throw conflict('Пользователь с таким email уже существует');
        }
        const hash = await this._generateHashPassword({
            password: this.config.defaultUserPassword,
        });
        return this._createUserAndSubLogin({
            consumers: [],
            email: userInfo.email,
            password: hash,
            firstName: userInfo.given_name,
            lastName: userInfo.family_name,
            middleName: null,
            position: 'admin',
            regionId: null
        });
    }

    async _processUserAndSetTokens({res, userInfo, access_token, refresh_token }) {
        const { email } = userInfo;
        return this._findUserByEmail({ email })
            .then(async ({ existsUser, existsSubLogin }) => {
                if (!existsUser) {
                    const { user, subLogin } = await this._createUser({ userInfo });
                    this._setTokensInCookies({
                        res,
                        userId: subLogin._id,
                        access_token,
                        refresh_token,
                    });
                    return `${this.config.redirectUriFront}/signin/bid?id=${user._id}&select-region=true`;
                }
                this._setTokensInCookies({
                    res,
                    userId: existsSubLogin._id,
                    access_token,
                    refresh_token,
                });
                return `${this.config.redirectUriFront}/signin/bid?id=${existsSubLogin._id}&auth=true`;
            });
    }

    async _exchangeCodeForTokens({ code }) {
        const { authServerUrl, realm, resource, credentials: { secret } } = this.config.keycloakConfig;
        const tokenUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/token`;
        const params = new URLSearchParams();
        params.append('client_id', resource);
        params.append('client_secret', secret);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', this.config.redirectUriBack);
        try {
            const httpsAgent = this.config.PROFILE === this.config.envTypes.LOCAL
                ? new https.Agent({ ca: this.config.keycloakCerts })
                : undefined;
            const { data } = await axios.post(tokenUrl, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                ...(httpsAgent ? { httpsAgent } : {}),
            });
            return data;
        } catch (error) {
            console.error(`'[KEYCLOAK]: Ошибка при обмене кода на токены Keycloak: ${error.message}`);
            throw badRequest('Не удалось обменять код авторизации на токены.');
        }
    }

    async _simpleLogin({ login }){
        this._validateLoginInput({ login });
        const subLogin = await this._findSubLoginByLogin({ login });
        this._checkUserStatus({ subLogin });
        const consumers = await this._fetchConsumers({ userId: subLogin._id });
        const cons = this._filterConsumers({
            consumers,
            regionId: subLogin.user.regionId,
        });
        const token = await this._generateToken({ subLogin });
        return {
            token,
            _id: subLogin._id,
            tabs: subLogin.tabs,
            type: subLogin.type,
            regionId: subLogin.user.regionId,
            cons_UIDs: cons.length ? cons.map((c) => c.cons_UID) : null,
            consumers: cons.length
                ? cons.map((c) => ({
                    cons_full_name: c.cons_full_name,
                    cons_UID: c.cons_UID,
                }))
                : null,
        };

    }

    async _generateToken({ subLogin }){
        const body = {
            _id: subLogin._id,
            date: new Date(),
            login: subLogin.login,
            regionId: subLogin.user.regionId,
        };
        const token = await sign(body);
        return token;
    }

    async _fetchConsumers({ userId }) {
        return Consumer.find({
            user: userId,
            blocked: { $ne: true },
        })
            .populate('ssdUri')
            .lean();
    }

    async _findSubLoginByLogin({ login }) {
        const logRex = new RegExp(login, 'gi');
        const subLogin = await SubLogin.findOne({ login: logRex }).populate('user');
        if (!subLogin) {
            throw unauthorized('Пользователь не найден');
        }
        return subLogin;
    }

    async _subLoginCreate({
        userId,
        email,
        password,
        consumers,
        firstName,
        lastName,
        middleName,
        position,
    }) {
        const subLogin = await SubLogin({
            type: 'admin',
            user: userId,
            login: email,
            email,
            password,
            consumers,
            tabs: [],
            firstName,
            lastName,
            middleName,
            position
        }).save();
        return subLogin;
    }

    async _userCreate({ email, regionId }) {
        const user = await User({
            email,
            regionId
        }).save()
        return user;
    }

    async _createUserAndSubLogin({
        consumers,
        email,
        password,
        firstName,
        lastName,
        middleName,
        position,
        regionId,
    }) {
        const user = await this._userCreate({ email, regionId });
        const subLogin = await this._subLoginCreate({
            userId: user._id,
            email,
            password,
            consumers,
            firstName,
            lastName,
            middleName,
            position
        });
        await createDefaultRoles(user._id);
        return { user, subLogin };
    }
}

module.exports = AuthController;
