const needle = require('needle');
const config = require('../config');
const moment = require('moment');
const {badRequest} = require('boom');
const {SmorodinaModel} = require('../models');
const {v4: uuidv4} = require('uuid');
const parserLib = require('fast-xml-parser');

function parse(inputData) {
    let data = {};
    for (const node of inputData) {
        if (node.children.length) {
            if (node.children[0].children[0]) {
                let childData = {};
                for (const childNode of node.children[0].children) {
                    childData[childNode.name] = childNode.value;
                }
                data[node.children[0].name] = childData;
            } else {
                let childData = {};
                for (const childNode of node.children) {
                    childData[childNode.name] = childNode.value;
                }
                data[node.name] = childData;
            }
        } else {
            data[node.name] = node.value;
        }
    }
    return data;
}

// Поставщик
// Оператор онлайн касс (ККТ)

module.exports = class Smorodina {
    constructor(data, url) {
        this.data = data;
        this.url = url;
    }

    async reqCreateInvoice() {
        this.data.amount = Number(this.data.amount) / 100;
        let varRate = 20;
        if ([2,3,4,6,7].includes(this.data.orderTypeNumber)) {
            varRate = 0;
        }
        const reqCreateInvoiceData = `<Document>
        <Invoice>
            <ReqCreateInvoice>
                <TypePaymentCode>${this.data.typePaymentCode}</TypePaymentCode>
                <PointCode>${this.data.pointCode}</PointCode>
                <AbonentID>${this.data.abonentId}</AbonentID>
                <Recurring>0</Recurring>
                <Month>${moment().format('YYYYMM')}</Month>
                <OrderSumm>${this.data.amount}</OrderSumm>
                <Cashless>1</Cashless>
                <Email>${this.data.email}</Email>
                <SummFee>0</SummFee>
                <IsMinFee>0</IsMinFee>
                ${this.data.phone ? `<Phone>${this.data.phone}</Phone> `: ''}
                <SendReceipt>${this.data.sendReceipt ? this.data.sendReceipt : 1}</SendReceipt>
                <Payments>
                    <Payment>
                        <Service>${this.data.service}</Service>
                        <IDpu>${this.data.idpu}</IDpu>
                        <ToPay>${this.data.amount}</ToPay>
                        <SummFee>0.00</SummFee>
                        <SummFeeAgent>0.00</SummFeeAgent>
                        <Type>0</Type>
                        <LsPU>${this.data.lspu != null ? 4689519: this.data.lspu}</LsPU>
                    </Payment>
                </Payments>
                <InfoPay>
                    <Pay_date>${moment().add(3, 'hours').toISOString()}</Pay_date>
                    <Cons_UID>${this.data.cons_UID}</Cons_UID>
                    <Cons_INN>${Number(this.data.cons_inn)}</Cons_INN>
                    <Cons_KPP>${Number(this.data.cons_kpp)}</Cons_KPP>
                    <Contr_num>${this.data.contr_num}</Contr_num>
                    <Cons_name>${this.data.cons_name}</Cons_name>
                    <Pay_type>${this.data.orderTypeNumber}</Pay_type>
                    <Pay_sum>${this.data.amount}</Pay_sum>
                    <Vat_rate>${varRate}</Vat_rate>
                    <Vat_sum>${Number(this.data.tax_sum)}</Vat_sum>
                    <Pay_ref>${this.data.description}</Pay_ref>
                    <Sum_type>${this.data.Sum_type || 1}</Sum_type>
                </InfoPay>
            </ReqCreateInvoice>
        </Invoice>
    </Document>
        `;
        console.log({reqCreateInvoiceData});
        const reqCreateJSON = parserLib.parse(reqCreateInvoiceData);

        const {body} = await needle('post', this.url, reqCreateInvoiceData, { headers: { 'Content-Type': 'application/xml' }}); 
        console.log('***body****', JSON.stringify({body}));
        const neededNodes = body.children[0].children[0].children;
        const parsedAnsCreateInvoice = parse(neededNodes);
        if (Object.keys(parsedAnsCreateInvoice).length === 0) {
            return false;
        }
        const UID = parsedAnsCreateInvoice.UID;
        console.log(parsedAnsCreateInvoice);
    
        await SmorodinaModel({
            UID,   
            Requests: reqCreateJSON.Document.Invoice.ReqCreateInvoice, 
            AnsCreateInvoice: parsedAnsCreateInvoice}).save();

        return {parsedAnsCreateInvoice, UID};
    }

    async reqUpdateInvoice(InvoiceStateCode) {
        if (!this.data.smorodina_UID) {
            throw badRequest('NO UID', this);
        }
        const reqUpdateInvoiceData = `<Document><Invoice>
        <ReqUpdateInvoice>
        <UID>${this.data.smorodina_UID}</UID>
        <InvoiceStateCode>${InvoiceStateCode}</InvoiceStateCode>
        <PointCode>${this.data.pointCode}</PointCode>
        <Additional>
        <Merchant>${this.data.merchant}</Merchant>
        <OrderID>${this.data.orderId}</OrderID>
        <SessionID>${this.data.sessionId}</SessionID>
        </Additional>
        </ReqUpdateInvoice>
        </Invoice>
        </Document>
        `;

        // console.log('UPDATE INVOICE', this.url, reqUpdateInvoiceData);
        const {body} = await needle('post', this.url, reqUpdateInvoiceData, { headers: { 'Content-Type': 'application/xml' }});
        // console.log('UPDATE INVOICE RESULT', JSON.stringify({body}));
        const reqUpdateInvoiceJSON = parserLib.parse(reqUpdateInvoiceData);

        const neededNodes = body.children[0].children[0].children;
        const parsedAnsUpdateInvoice = parse(neededNodes);
        // console.log('confirm invoice parsed', parsedAnsUpdateInvoice);
        if (Object.keys(parsedAnsUpdateInvoice).length === 0) {
            console.log('******** update invoice error**********');
            await SmorodinaModel.updateOne({UID: this.data.smorodina_UID}, {$set:{
                FailedXML: reqUpdateInvoiceData
            }});
            return false;
        }
        const smorodinaData = await SmorodinaModel.find({UID: this.data.smorodina_UID});
        const updatedRequest = Object.assign({}, smorodinaData[0].Requests, reqUpdateInvoiceJSON.Document.Invoice.ReqUpdateInvoice);
        
        await SmorodinaModel.updateOne({UID: this.data.smorodina_UID}, {$set:{
            Requests: updatedRequest,
            InvoiceStateCode : InvoiceStateCode ? InvoiceStateCode : 1,
            AnsUpdateInvoice: parsedAnsUpdateInvoice
        }});

        return true;
    }

    async reqConfirmInvoice() {
        if (!this.data.smorodina_UID) {
            throw badRequest('NO UID', this);
        }
        const smorodinaData = await SmorodinaModel.find({UID: this.data.smorodina_UID});
        const reqConfirmInvoiceData = `
        <Document>
        <Invoice>
        <ReqConfirmInvoice>
        <PointCode>${this.data.pointCode}</PointCode>
        <UID>${this.data.smorodina_UID}</UID>
        <Additional>
        <SessionID>${this.data.sessionId}</SessionID>
        <Merchant>${this.data.merchant}</Merchant>
        <OrderStatus>APPROVED</OrderStatus>
        <PAN>${this.data.PAN ? this.data.PAN : ''}</PAN>
        <OrderID>${this.data.orderId}</OrderID>
        <Brand>${this.data.Brand ? this.data.Brand : ''}</Brand>
        <ApprovalCode>${this.data.ApprovalCode ? this.data.ApprovalCode : ''}</ApprovalCode>
        <TranDateTime>${moment(this.data.PayDate).format('DD/MM/YYYY HH:mm:ss')}</TranDateTime>
        <TwoID></TwoID>
        <Description>${smorodinaData[0].Requests.InfoPay.Pay_ref}</Description>
        </Additional>
        </ReqConfirmInvoice>
        </Invoice>
        </Document>
        `;
        // <TwoID>${smorodinaData[0].Requests.InfoPay.TWO_ID}</TwoID>
        console.log('CONFIRM INVOICE', reqConfirmInvoiceData);
        const reqConfirmInvoiceJSON = parserLib.parse(reqConfirmInvoiceData);
        const {body} = await needle('post', this.url, reqConfirmInvoiceData, { headers: { 'Content-Type': 'application/xml' }});
        console.log('CONFIRM INVOICE RESULT', JSON.stringify({body}));
        const neededNodes = body.children[0].children[0].children;
        const parsedAnsConfirmInvoice = parse(neededNodes);
        console.log('parsedAnsConfirmInvoice', parsedAnsConfirmInvoice);
        if (Object.keys(parsedAnsConfirmInvoice).length === 0) {
            console.log('******** confirm invoice error**********');
            await SmorodinaModel.updateOne({UID: this.data.smorodina_UID}, {$set:{
                FailedXML: reqConfirmInvoiceData
            }});         
            return false;
        }

        const updatedRequest = Object.assign({}, smorodinaData[0].Requests, reqConfirmInvoiceJSON.Document.Invoice.ReqConfirmInvoice);
        await SmorodinaModel.updateOne({UID: this.data.smorodina_UID}, {$set:{
            Requests: updatedRequest,
            AnsConfirmInvoice: parsedAnsConfirmInvoice
        }});         
        return true;
    }
};