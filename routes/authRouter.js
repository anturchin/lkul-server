const express = require('express');
const requestIp = require('request-ip');
const { login } = require("../controllers/UserController");

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
            this.handleRegionUpdateAndLogin.bind(this)
        )

        this.router.use(
            this.keycloak.middleware({ logout: '/keycloak/logout' })
        );
    }

    async handleCallback(req, res) {
        try {
            res.redirect(this.authController.getRedirectUri());
        } catch (error) {
            console.error(`[KEYCLOAK]: Ошибка при логауте:', ${error.message}`);
            res.status(500).json({ message: 'Внутрення ошибка сервера' });
        }
    }

    async handleRegionUpdateAndLogin(req, res) {
        try {
            const { userId, regionId } = req.body;
            if (!userId || !regionId) {
                return res.status(400).json({ error: 'Поля userId и regionId обязательны' });
            }
            const user = await this.authController.updateUserRegion({ userId, regionId });
            const ip = requestIp.getClientIp(req);
            req.body.ip = ip;

            const result = await login({
                login: user.email,
                password: this.authController.getDefaultPassword(),
            });
            res.send(result);

        } catch (error) {
            console.error(`[KEYCLOAK]: Ошибка при обновлении региона или логине: ${error.message}`);
            res.status(500).json({ error: 'Внутрення ошибка сервера' });
        }
    }

    async handleKeycloakLogin(req, res) {
        try {
            const kuser = req.kauth.grant.access_token.content;
            if (kuser) {
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
