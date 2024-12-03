module.exports = (user, list, type) => {
    if (user.role === 'admin') return list;
    if (user.rights && user.rights[type])
        return list.filter(item => user.rights[type].includes(String(item)));
    else {
        console.error('__LIBS/RIGHTS__   ПРАВА НЕ ПРОПИСАНЫ', type, user);
        return [];
    }
};