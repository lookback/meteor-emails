/* eslint-env mocha */

import Mailer from './mailer';
import { assert } from 'meteor/practicalmeteor:chai';

describe('Mailer', () => {
  it('should be defined', () => {
    assert.isObject(Mailer);
  });
});
