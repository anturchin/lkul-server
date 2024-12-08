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

        const secretLength = parseInt(this.config.sessionSecret, 10) || 32;
        const secret = crypto.randomBytes(secretLength).toString('hex');

        return new Keycloak(
            { store: this.memoryStore },
            this.config.keycloakConfig
        );
    }

    setupMiddleware(app) {
        app.use(
            session({
                secret: crypto.randomBytes(32).toString('hex'),
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
