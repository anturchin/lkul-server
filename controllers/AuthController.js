const { notFound, conflict, badRequest, unauthorized  } = require('boom');
const { Types } = require("mongoose");
const crypto = require('node:crypto');
const https = require('node:https');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const auth = require('vvdev-auth');
const User = require("../models/User");
const SubLogin = require("../models/SubLogin");
const { createDefaultRoles } = require("./UserController");
const { Consumer } = require("../models");
const { sign } = require("../libs/jwt");

class AuthController {
    constructor({ config }) {
        this.config = config;
        this.memoryStore = new session.MemoryStore();
        this.keycloak = this.initializeKeycloak();
    }

    initializeKeycloak() {
        new https.Agent({ ca: this.config.keycloakСerts });
        return new Keycloak(
            { store: this.memoryStore },
            this.config.keycloakConfig
        );
    }

    setupMiddleware(app) {
        const secretLength = parseInt(this.config.sessionSecretLength, 10) || 32;
        const secret = crypto.randomBytes(secretLength).toString('hex');
        app.use(
            session({
                secret,
                resave: false,
                saveUninitialized: true,
                store: this.memoryStore,
            })
        );
        app.use(this.keycloak.middleware());
    }

    getDefaultPassword(){
        return this.config.defaultUserPassword;
    }

    getRedirectUri() {
        return this.config.redirectUri;
    }

    getKeycloak() {
        return this.keycloak;
    }

    async findUserById({ userId }) {
        const subLogin = await SubLogin.findById(userId);
        if (!subLogin) {
            throw notFound('Пользователь не найден');
        }
        return subLogin;
    }

    async simpleLogin({ login }){
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

    async updateUserRegion({ userId, regionId }) {
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

    async findUserByEmail({ email }) {
        const [ existsUser, existsSubLogin ] = await Promise.all([
            User.findOne({email}),
            SubLogin.findOne({login: email})
        ]);
        return { existsUser, existsSubLogin };
    }

    async createUser({ userInfo }) {

        const { existsUser } = await this.findUserByEmail({ email: userInfo.email });

        if (existsUser) {
            throw conflict('Пользователь с таким email уже существует');
        }

        const hash = await this.generateHashPassword({
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

    async generateHashPassword({ password }) {
        return auth.hashPassword(password);
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
