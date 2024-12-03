const ConsumerController = require('../../controllers/ConsumerController');
// eslint-disable-next-line no-undef
jest.mock('../../requests/qPromConsumerPayment');
const qPromConsumerPayment = require('../../requests/qPromConsumerPayment');
const {describe, test, expect} = require('@jest/globals');
const {when} = require('jest-when');

describe('Consumer controller', () => {
    describe('qPromConsumerPayment', () => {
        test('Success', async () => {
            // qPromConsumerPayment.mockImplementation((cons_UID, st_date, end_date, ssd_uri) => {
            //     if (cons_UID === 'cons')
            //         return [{data: true}];
            // });
            when(qPromConsumerPayment).calledWith('cons', undefined, undefined, undefined).mockReturnValue([{data: true}]);
            const result = await ConsumerController.qPromConsumerPayment({cons_UID: 'cons'});
            expect(result).not.toBeNull();
            expect(result).not.toBeUndefined();
            expect(result[0].data).toBe(true);
        });
    });
});