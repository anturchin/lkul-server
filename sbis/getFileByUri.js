// const rpn = require('request-promise-native');
// const {SBIS} = require('../config');
// const boom = require('boom');
// const fs = require('fs');

// module.exports = async (session, uri) => {
//     const options = {
//         method: 'GET',
//         uri,
//         json: true,
//         rejectUnauthorized: false,
//     };
//     return rpn(options)
//         .then(result => {
//             fs.writeFileSync(__dirname + '/../public/install.png', result);
//         })
//         .catch(err => {
//             if (err.statusCode === 401) throw new boom(err.message, {statusCode: 421});
//             throw new boom(err.message, err);
//         });
// };

// const http = require('http');
// const fs = require('fs');
// const dest = __dirname + '/../public/install.png';

// const file = fs.createWriteStream(dest, 'binary');
// const request = http.get('http://telepizza-russia.ru/public/images/1536742935535-7%20-%20slider.png', response => {
//     response.pipe(file);
//     file.on('finish', () => file.close());
//     file.on('error', err => {
//         console.log(err);
//     });
// }).on('error', err => {
//     fs.unlink(dest);
//     console.log(err);
// });

const fs = require('fs');
const request = require('request');

exports.download = (uri, session, cb) => {
    request.head(uri, (err, res, body) => {
        const filename = `${Date.now()}-install.zip`;
        const dest = __dirname + '/../public/' + filename;
        request(uri, {headers: {'X-SBISSessionID': session}})
            .pipe(fs.createWriteStream(dest))
            .on('close', () => cb(filename));
    });
};