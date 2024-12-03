exports.intersectionEasy = (arrA, arrB) => {
    return arrA.filter(x => arrB.includes(x));
};

exports.intersectionContractsListAndContrUIDs = (constr_UIDs, contracts) => {
    return contracts.filter(c => constr_UIDs.includes(c.contr_uid));
};