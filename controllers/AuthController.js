const crypto = require('node:crypto');
const https = require('node:https');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const auth = require('vvdev-auth');
const jwt = require('../libs/jwt');
const User = require("../models/User");
const SubLogin = require("../models/SubLogin");
const { createDefaultRoles } = require("./UserController");

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

    getRedirectUri() {
        return this.config.redirectUri;
    }

    getKeycloak() {
        return this.keycloak;
    }

    async findUserByEmail({ email }) {
        const [existsUser, existsSubLogin] = await Promise.all([
            User.findOne({email}),
            SubLogin.findOne({login: email})
        ]);
        return { existsUser, existsSubLogin }
    }

    async createUser({ userInfo }) {
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
            position: 'Администратор',
            regionId: null
        });
    }

    async generateToken({ payload }) {
        return jwt.sign(payload);
    }

    async generateHashPassword({ password }) {
        return auth.hashPassword(password);
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
