const fs = require("node:fs");

const readFileSafely = (filePath) => {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Файл для конфигурации keycloak не найден: ${filePath}`);
    }
    return fs.readFileSync(filePath).toString();
};

module.exports = readFileSafely;
