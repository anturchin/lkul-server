const crypto = require('node:crypto');
const https = require('node:https');
const session = require('express-session');
const Keycloak = require('keycloak-connect');

module.exports = (app, config) => {
    const memoryStore = new session.MemoryStore();
    new https.Agent({ ca: config.keycloakСerts });

    const secretLength = parseInt(config.sessionSecret, 10) || 32;
    const secret = crypto.randomBytes(secretLength).toString('hex');

    const keycloak = new Keycloak({ store: memoryStore }, config.keycloakConfig);

    app.use(
        session({
            secret,
            resave: false,
            saveUninitialized: true,
            store: memoryStore,
        })
    );

    app.use(keycloak.middleware());

    app.get('/auth/callback', (req, res) => {
        console.log({ grant: req.kauth.grant });
        res.redirect(config.redirectUri);
    });

    app.get('/auth/keycloak/login', keycloak.protect(), (req, res) => {
        const user = req.kauth.grant.access_token.content;
        if (user) {
            console.log({ user });
            res.redirect(config.redirectUri);
        }
    });

    app.use(keycloak.middleware({ logout: '/auth/keycloak/logout' }));

    return keycloak;
};
