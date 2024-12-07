const express = require('express');
const app = express();
const config = require('./config');
const port = config.port;

const {notFound} = require('boom');
const mongooseValidationErrors = require('./libs/mongooseValidationErrors');

require('./db')();
require('./scripts/defaultDBValues');
require('./scripts/roles');
require('./scripts/insertRolsForAllUsers');
require('./scripts/createMrgOrg');
app.use(express.urlencoded({extended:true, limit: '10mb'}));
app.use(express.json({limit: '10mb'}));

app.use(require('cors')({
    'origin': true,
    'methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'allowedHeaders': ['Content-Type', 'x-access-token', 'user-agent'],
    'optionsSuccessStatus': 200
}) );

// Инициализация Keycloak
require('./libs/keycloak')(app, config);

app.use((req, _res, next) => {
    console.log(`${new Date()} ${req.ip}:${req.method} ${req.url}`);
    next();
});

app.use('/public', express.static('./public'));
app.use('/media', express.static('./media'));

app.use('/api', require('./routes'));

app.use((_req, _res, next) => {
    next(notFound('Not found'));
});

app.use((error, _req, res, _next) => {
    console.error(error);
    if (error.name === 'ValidationError' && error.errors) {
        return res.status(400).send(mongooseValidationErrors(error.errors));
    }
    let data = null;
    if (error && error.data) {
        data = {};
        if (error.data.count || error.data.count === 0) data.count = error.data.count;
        if (error.data.date) data.date = error.data.date;
    }
    const status = (error && error.output) ? error.output.statusCode : 500;
    res.status(status).send({message: error.message, data});
});

app.listen(port, () => {
    console.log('Listening on ' + port);
});