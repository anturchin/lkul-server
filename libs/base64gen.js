const fs = require('fs');

module.exports = (fileName) => {
    const fsReadFile = fs.readFileSync(__dirname + `/../public/${fileName}`);
    const buff = Buffer.from(fsReadFile);
    return buff.toString('base64');
};