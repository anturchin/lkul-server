module.exports = (limit, page, count) => {
    return {
        limit,
        page,
        totalPages: Math.ceil(count / limit),
        count
    };
};