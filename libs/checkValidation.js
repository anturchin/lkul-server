const {badRequest, conflict} = require('boom');
exports.checkPassword = (password, repeatPassword) => {
    if (!password || !repeatPassword || password !== repeatPassword) throw badRequest('Пароли не совпадают');
    if (password.length < 8 || !/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/.test(password)) throw badRequest('Пароль должен быть длиной от 8 символов, содержать числа, а также заглавные и прописные латинские буквы');
    return;
};

exports.requiredFields = (fields, data) => {
    for (const field of fields) {
        if (!data[field] && data[field] !== 0) throw badRequest(`Введите значение ${field}`);
    }
    return;
};

exports.existsMany = async (queries, model) => {
    for (const query of queries) {
        const data = await model.findOne({query});
        if (data) throw conflict(`Сущность с такими данными: ${JSON.stringify(query)} уже существует`);
    }
    return;
};