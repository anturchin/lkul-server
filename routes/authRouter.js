const { badRequest } = require('boom');
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
            this.handleKeycloakTokens.bind(this)
        );

        this.router.post(
            '/keycloak/region',
            this.handleRegionUpdateAndLogin.bind(this)
        );

        this.router.use(
            this.keycloak.middleware({ logout: '/keycloak/logout' })
        );
    }

    async handleCallback(req, res) {
        try {
            return res.redirect(this.authController.getRedirectUri());
        } catch (error) {
            console.error(`[KEYCLOAK]: Ошибка при получении URI для редиректа: ${error.message}`);
            res.status(500).json({ error: 'Ошибка при редиректе' });
        }
    }

    async handleKeycloakTokens(req, res) {
        try {
            const { userId } = req.body;
            if (!userId) {
                throw badRequest('Поле userId обязательно');
            }

            const subLogin = await this.authController.findUserById({ userId });

            this.setIp(req);

            const result = await this.authController.simpleLogin({ login: subLogin.login })
            res.send(result);
        } catch (error) {
            console.error(`[KEYCLOAK]: Ошибка при логине и получении токенов: ${error.message}`);
            if (error.isBoom) {
                return res.status(error.output.statusCode).json({
                    error: error.message,
                });
            }
            res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
    }

    async handleRegionUpdateAndLogin(req, res) {
        try {
            const { userId, regionId } = req.body;
            if (!userId || !regionId) {
                throw badRequest('Поля userId и regionId обязательны');
            }
            const user = await this.authController.updateUserRegion({ userId, regionId });

            this.setIp(req);

            const result = await login({
                login: user.email,
                password: this.authController.getDefaultPassword(),
            });
            res.send(result);

        } catch (error) {
            console.error(`[KEYCLOAK]: Ошибка при логине с регионом: ${error.message}`);
            if (error.isBoom) {
                return res.status(error.output.statusCode).json({
                    error: error.message,
                });
            }
            res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
    }

    async handleKeycloakLogin(req, res) {
        try {
            const kuser = req.kauth?.grant?.access_token?.content;
            if (!kuser) {
                throw badRequest('Нет данных о пользователе');
            }
            const { existsUser, existsSubLogin } = await this.authController.findUserByEmail({
                email: kuser.email,
            });
            if (!existsUser) {
                const { user } = await this.authController.createUser({
                    userInfo: kuser,
                })
                return res.redirect(
                    `${this.authController.getRedirectUri()}/signin/bid?id=${user._id}&select-region=true`
                );
            }
            return res.redirect(
                `${this.authController.getRedirectUri()}/signin/bid?id=${existsSubLogin._id}&auth=true`
            );

        } catch (error) {
            console.error(`[KEYCLOAK]: Ошибка при логине: ${error.message}`);
            if (error.isBoom) {
                return res.status(error.output.statusCode).json({
                    error: error.message,
                });
            }
            res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
    }

    setIp(req){
        const ip = requestIp.getClientIp(req);
        req.body.ip = ip;
    }

    getRouter() {
        return this.router;
    }
}

module.exports = AuthRouter;
