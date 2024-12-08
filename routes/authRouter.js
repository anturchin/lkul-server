const express = require('express');

class AuthRouter {
    constructor({ authController }) {
        this.authController = authController;
        this.keycloak = authController.getKeycloak();
        this.router = express.Router();

        this.initializeRoutes();
    }

    initializeRoutes() {
        this.router.get('/callback', this.handleCallback.bind(this));

        this.router.get(
            '/keycloak/login',
            this.keycloak.protect(),
            this.handleKeycloakLogin.bind(this)
        );

        this.router.post(
            '/keycloak/tokens',
            () => {}
        )

        this.router.post(
            '/keycloak/region',
            () => {}
        )

        this.router.use(
            this.keycloak.middleware({ logout: '/keycloak/logout' })
        );
    }

    async handleCallback(req, res) {
        try {
            console.log({ grant: req.kauth.grant });
            res.redirect(this.authController.getRedirectUri());
        } catch (error) {
            console.error(`[KEYCLOAK]: Ошибка при логауте:', ${error.message}`);
            res.status(500).json({ message: 'Внутрення ошибка сервера' });
        }
    }

    async handleKeycloakLogin(req, res) {
        try {
            const kuser = req.kauth.grant.access_token.content;
            if (kuser) {
                console.log({ kuser });

                const { existingUser, existsSubLogin } = await this.authController.findUserByEmail({
                    email: kuser.email,
                });

                if (!existingUser) {
                    const { subLogin } = await this.authController.createUser({
                        userInfo: kuser,
                    })
                    return res.redirect(
                        `${this.authController.getRedirectUri()}/signin/bid?id=${subLogin._id}&select-region=true`
                    );
                }

                return res.redirect(
                    `${this.authController.getRedirectUri()}/signin/bid?id=${existsSubLogin._id}&auth=true`
                );
            }
        } catch (error) {
            console.error(`[KEYCLOAK]: Ошибка при логине:', ${error.message}`);
            res.status(500).json({ message: 'Внутрення ошибка сервера' });
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = AuthRouter;
