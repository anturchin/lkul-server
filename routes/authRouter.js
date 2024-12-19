const { badRequest, unauthorized } = require('boom');
const express = require('express');

class AuthRouter {
    constructor({ authController }) {
        this.authController = authController;
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        this.router.get(
            '/keycloak/login',
            this._handleKeycloakRedirect.bind(this)
        );

        this.router.get(
            '/keycloak/login/callback',
            this._handleKeycloakLogin.bind(this)
        );

        this.router.post(
            '/keycloak/tokens',
            this._handleKeycloakTokens.bind(this)
        );

        this.router.post(
            '/keycloak/region',
            this._handleRegionUpdateAndLogin.bind(this)
        );

        this.router.post(
            '/keycloak/logout',
            this._handleKeycloakLogout.bind(this)
        );

    }

    getRouter() {
        return this.router;
    }

    async _handleKeycloakLogout(req, res) {
        try {
            const { userId } = req.body;
            if (!userId) {
                throw badRequest('Параметр userId обязателен');
            }
            await this.authController.logout({ req, res, userId });
            return res.status(200).send({ logout: true });
        } catch (error) {
            console.error(`[LOGOUT]: Ошибка при выходе: ${error.message}`);
            if (error.isBoom) {
                return res.status(error.output.statusCode).json({ error: error.message });
            }
            res.status(500).json({ error: 'Ошибка при выходе' });
        }
    }

    async _handleKeycloakTokens(req, res) {
        try {
            const { userId } = req.body;
            if (!userId) {
                throw badRequest('Поле userId обязательно');
            }
            const { result, keycloak } = await this.authController.getTokens({ req, userId })
            res.send({result, keycloak});
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

    async _handleRegionUpdateAndLogin(req, res) {
        try {
            const { userId, regionId } = req.body;
            if (!userId || !regionId) {
                throw badRequest('Поля userId и regionId обязательны');
            }
            const { result, keycloak } = await this.authController.updateRegionAndLogin({ req, userId, regionId });
            res.send({result, keycloak});
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

    async _handleKeycloakRedirect(req, res) {
        const keycloakAuthUrl = this.authController.getKeycloakRedirectUrl();
        return res.redirect(keycloakAuthUrl);
    }

    async _handleKeycloakLogin(req, res) {
        try {
            const { code } = req.query;
            if (!code) {
                throw unauthorized('Отсутствует код авторизации');
            }
            const redirectUri = await this.authController.handleKeyCloakLogin({  code, res });
            return res.redirect(redirectUri);
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

}

module.exports = AuthRouter;
