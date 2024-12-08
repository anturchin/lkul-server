const crypto = require('node:crypto');
const https = require('node:https');
const session = require('express-session');
const Keycloak = require('keycloak-connect');

class AuthController {
    constructor(config) {
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

    getKeycloak() {
        return this.keycloak;
    }
}

module.exports = AuthController;
