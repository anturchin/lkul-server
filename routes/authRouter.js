const express = require('express');

const authRouter = (authController) => {
    const router = express.Router();
    const keycloak = authController.getKeycloak();

    router.get('/callback', (req, res) => {
        console.log({ grant: req.kauth.grant });
        res.redirect(authController.config.redirectUri);
    });

    router.get('/keycloak/login', keycloak.protect(), (req, res) => {
        const user = req.kauth.grant.access_token.content;
        if (user) {
            console.log({ user });
            res.redirect(authController.config.redirectUri);
        }
    });

    router.use(keycloak.middleware({ logout: '/keycloak/logout' }));

    return router;
}

module.exports = authRouter;
