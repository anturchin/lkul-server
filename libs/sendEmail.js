const {host, port, user, pass, from} = require('../config').smtp;
const nodemailer = require('nodemailer');
const smtpTransport = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: {
        user,
        pass
    },
    tls: {
        rejectUnauthorized: false
    }
});

module.exports = async (to, text, subject = 'ЛК ЮЛ', attachments, html) => {
    try {
        const options = {
            from,
            to,
            subject,
            text,
            html
        };
        if (attachments && attachments.length) {
            options.attachments = attachments.map(a => {
                return {
                    filename: a,
                    path: `${__dirname}/../public/${a}`
                };
            });
        }
        const result = await smtpTransport.sendMail(options);
        return console.log(options, result ? result.accepted : result);
    } catch (err) {
        console.error(err);
    }
};