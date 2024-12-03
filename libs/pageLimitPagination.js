module.exports = (page, limit) => {
    limit = limit ? parseInt(limit) : 20;
    page = page ? parseInt(page) : 1;
    if (!limit || limit < 1) limit = 20;
    if (!page || page < 1) page = 1;
    return {page, limit};
};