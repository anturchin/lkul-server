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
        this.router.get('/callback', this._handleCallback.bind(this));

        this.router.get(
            '/keycloak/login',
            this.keycloak.protect(),
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

        this.router.use(
            this.keycloak.middleware({ logout: '/keycloak/logout' })
        );
    }

    getRouter() {
        return this.router;
    }

    async _handleCallback(req, res) {
        try {
            const { userId } = req.query;
            if(!userId) {
                throw badRequest('Url параметр userId обязателен');
            }
            this._clearTokensFromCookies({ res, userId });
            return res.redirect(this.authController.getRedirectUri());
        } catch (error) {
            console.error(`[KEYCLOAK]: Ошибка при получении URI для редиректа: ${error.message}`);
            if (error.isBoom) {
                return res.status(error.output.statusCode).json({
                    error: error.message,
                });
            }
            res.status(500).json({ error: 'Ошибка при редиректе' });
        }
    }

    async _handleKeycloakTokens(req, res) {
        try {
            const { userId } = req.body;
            if (!userId) {
                throw badRequest('Поле userId обязательно');
            }

            const { accessToken, refreshToken } = this._getTokensFromCookies({ req, userId });

            const subLogin = await this.authController.findUserById({ userId });

            this._setIp({ req });

            const result = await this.authController.simpleLogin({ login: subLogin.login })
            res.send({
                result,
                keycloak: {
                    accessToken,
                    refreshToken,
                },
            });
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
            const user = await this.authController.updateUserRegion({ userId, regionId });
            const { accessToken, refreshToken } = this._getTokensFromCookies({ req, userId });

            this._setIp({ req });

            const result = await login({
                login: user.email,
                password: this.authController.getDefaultPassword(),
            });
            res.send({
                result,
                keycloak: {
                    accessToken,
                    refreshToken,
                },
            });

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

    async _handleKeycloakLogin(req, res) {
        try {
            const { kuser, access_token, refresh_token } = this._extractTokensFromRequest({ req });
            const redirectUri = await this._processUserAndSetTokens({
                res,
                userInfo: kuser,
                access_token,
                refresh_token,
            });
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

    async _processUserAndSetTokens({res, userInfo, access_token, refresh_token }) {
        const { email } = userInfo;
        return this.authController.findUserByEmail({ email })
            .then(async ({ existsUser, existsSubLogin }) => {
                if (!existsUser) {
                    const { user } = await this.authController.createUser({ userInfo });
                    this._setTokensInCookies({
                        res,
                        userId: user._id,
                        access_token,
                        refresh_token,
                    });

                    return `${this.authController.getRedirectUri()}/signin/bid?id=${user._id}&select-region=true`;
                }

                this._setTokensInCookies({
                    res,
                    userId: existsSubLogin._id,
                    access_token,
                    refresh_token,
                });

                return `${this.authController.getRedirectUri()}/signin/bid?id=${existsSubLogin._id}&auth=true`;
            });
    }

    _setIp({ req }){
        const ip = requestIp.getClientIp(req);
        req.body.ip = ip;
    }

    _clearTokensFromCookies({ res, userId }) {
        res.clearCookie(`access_token_${userId}`, {
            httpOnly: true,
            secure: false,
        });
        res.clearCookie(`refresh_token_${userId}`, {
            httpOnly: true,
            secure: false,
        });
    }

    _getTokensFromCookies({ req, userId }) {
        const accessToken = this._validateCookie({
            req,
            cookieName: `access_token_${userId}`,
        });
        const refreshToken = this._validateCookie({
            req,
            cookieName: `refresh_token_${userId}`,
        });

        if (!accessToken || !refreshToken) {
            throw badRequest('Токены Keycloak не найдены в куках. Пожалуйста, убедитесь, что вы прошли авторизацию.');
        }
        return { accessToken, refreshToken };
    }

    _setTokensInCookies({ res, userId, access_token, refresh_token }) {
        res.cookie(`access_token_${userId}`, access_token, {
            httpOnly: true,
            secure: false,
        });
        res.cookie(`refresh_token_${userId}`, refresh_token, {
            httpOnly: true,
            secure: false,
        });
    }

    _validateCookie({ req, cookieName }) {
        if (!req.cookies) {
            throw badRequest('Cookies не найдены в запросе.');
        }

        const cookieValue = req.cookies[cookieName];
        if (!cookieValue) {
            throw badRequest(`Кука "${cookieName}" не найдена.`);
        }

        return cookieValue;
    }

    _extractTokensFromRequest({ req }) {
        const kuser = req.kauth?.grant?.access_token?.content;
        const access_token = req.kauth?.grant?.access_token?.token;
        const refresh_token = req.kauth?.grant?.refresh_token?.token;

        if (!kuser || !access_token || !refresh_token) {
            throw badRequest('Нет данных о пользователе. Пожалуйста, убедитесь, что вы прошли авторизацию.');
        }

        return { kuser, access_token, refresh_token };
    }
}

module.exports = AuthRouter;
