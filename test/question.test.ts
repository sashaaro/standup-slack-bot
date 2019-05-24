import Question from "./../src/model/Question";
import * as assert from 'assert';

describe('Question', () => {
    describe('work well', () => {
        it('should work', () => {
            const q = new Question()
            assert.equal(q.isEnabled, true);
        });
    });
});