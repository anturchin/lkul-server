const xlsx = require('node-xlsx');
const sliceDate = require('../libs/sliceDate');
const moment = require('moment');
const ExcelJS = require('exceljs');
const { conflict } = require('boom');

const contractNumber = [1, 1];
const locationName = [2, 1];
const MetName = [3, 1];
const EquipmentNumber = [4, 1];
const values = [11, 1];

const loopIndex = (lists, list, index, name) => {
    for (const contrNumIndex in list.data[index]) {
        if (contrNumIndex >= contractNumber[1]) {
            if (!lists[contrNumIndex - 1]) lists[contrNumIndex - 1] = {};
            if (name === 'Values') {
                if (!lists[contrNumIndex - 1][name]) lists[contrNumIndex - 1][name] = [];
                lists[contrNumIndex - 1][name].push({Value: list.data[index][contrNumIndex], Dt_value: sliceDate(moment(list.data[index][0]).toDate())});
            }
            else lists[contrNumIndex - 1][name] = list.data[index][contrNumIndex];
        }
    }
    return lists;
};

const parse = (fileName) => {
    const workSheetsFromFile = xlsx.parse(`${__dirname}/../public/${fileName}`, {
        cellDates: true,
        cellNF: false,
        cellText: false
    });
    let lists = [];
    for (const list of workSheetsFromFile) {
        if (list.data[0][0] !== 'Прибор учета' || 
        list.data[1][0] !== 'Договор' || 
        list.data[2][0] !== 'Площадка потребления' || 
        list.data[3][0] !== 'Узел учета') throw conflict('Неверный формат реестра');
        for (const index in list.data) {
            if (index === String(contractNumber[0]))
                loopIndex(lists, list, index, 'contr_num');
            if (index === String(locationName[0])) 
                loopIndex(lists, list, index, 'Location_Name');
            if (index === String(MetName[0]))
                loopIndex(lists, list, index, 'Met_name');
            if (index === String(EquipmentNumber[0]))
                loopIndex(lists, list, index, 'serial_number');
            if (((list.data[9][0] === 'Дата' && parseInt(index) >= (values[0] - 1)) || parseInt(index) >= values[0])) {
                loopIndex(lists, list, index, 'Values');
            }
            if (parseInt(index) > 50) continue;   
        }
    }
    return lists;
};

const exportXlsx = async (dataForExport, valueType) => {
    const equipmentNames = [];
    const contractNumbers = [];
    const locationNames = [];
    const MetNames = [];
    const EquipmentNumbers = [];
    const Valuess = [];
    const data = [
        ['Прибор учета'],
        ['Договор'],
        ['Площадка потребления'],
        ['Узел учета'],
        ['№ Прибора учета']
    ];
    
    for (const item of dataForExport) {
        equipmentNames.push(item.Equipment_name);
        contractNumbers.push(item.contr_num);
        locationNames.push(item.Location_Name);
        MetNames.push(item.Met_name);
        EquipmentNumbers.push(item.serial_number.trim());
        Valuess.push(item.Values);
    }
    
    const sortedValues = [];
    for (const Values of Valuess) {
        loop: for (const value of Values) {
            for (const sortValue of sortedValues) {
                if (sortValue[0] === value.Dt_value.slice(0, 10)) {
                    sortValue.push(value.Value);
                    continue loop;
                }
            }
            sortedValues.push([value.Dt_value.slice(0, 10), value.Value]);
        }
    }
    for (let i = 0; i < contractNumbers.length; i++) {
        data[0].push(equipmentNames[i]);
        data[1].push(contractNumbers[i]);
        data[2].push(locationNames[i]);
        data[3].push(MetNames[i]);
        data[4].push(EquipmentNumbers[i]);
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(__dirname + '/../templates/Расход.xlsm');
    const ws = workbook.worksheets[0];
    for (const index in data) {
        ws.getCell(parseInt(index) + 2, 3).value = data[index][1];
    }
    ws.getCell(11, 3).value = String(valueType) === '1' ? 'Ввод показаний' : 'Ввод расхода';
    for (const index in sortedValues) {
        ws.getCell(12 + parseInt(index), 2).value = sortedValues[index][0];
        ws.getCell(12 + parseInt(index), 3).value = sortedValues[index][1];
    }
    // ws.eachRow(row => {
    //     if (counter > 10) {
    //         row.eachCell(cell => {
    //             cell.border = {
    //                 top: {style: 'medium'},
    //                 left: {style: 'medium'},
    //                 bottom: {style: 'medium'},
    //                 right: {style: 'medium'}
    //             }; 
    //         });
    //     } else counter++;
    // });
    const buffer = await workbook.xlsx.writeBuffer({useStyles: true});
    return buffer;
};


exports.parse = parse;

exports.exportXlsx = exportXlsx;