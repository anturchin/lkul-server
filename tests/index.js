const sliceDate = require('../libs/sliceDate');
const moment = require('moment');
const { describe, it } = require('mocha');

const expect = require('chai').expect;

describe('Slice date', () => {
    it('Slice date module', () => {
        const expectedValue = '2019-10-10T00:00:00';
        const result = sliceDate(moment('2019-10-10T00:00:00').add(3, 'hours'));
        expect(result).to.equal(expectedValue);
    });
});