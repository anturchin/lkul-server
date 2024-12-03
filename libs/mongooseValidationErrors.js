module.exports = (errors) => {
    let fields = [];
    for (const err in errors)
        fields.push(err);
    const message = 'Проверьте правильность заполнения полей';
    return {
        message,
        fields
    };
};
