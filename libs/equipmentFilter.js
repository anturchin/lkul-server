module.exports = (equipments, equipment_type, work) => {
    return equipments.filter(q => {
        if ((!equipment_type || q.Equipment_type === equipment_type) && (work !== 'true' || q.work === true))
            return true;
    });
};