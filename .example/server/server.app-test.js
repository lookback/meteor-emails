/* eslint-env mocha */
import { Mailer } from 'meteor/lookback:emails';
import { assert } from 'meteor/practicalmeteor:chai';

describe('Render email', () => {

  it('should render an email', () => {
    const string = Mailer.render('sample', {
      name: 'johan',
      names: ['Johan', 'John', 'Paul', 'Ringo']
    });

    assert.isString(string);
    assert.match(string, new RegExp('<h2>Hi Johan', 'gm'), 'includes heading with capitalized name');
  });

  it('should render with a layout', () => {
    const searchFor = 'Paul is dead';

    const string = Mailer.render('sample', {
      name: 'johan',
      names: ['Johan', 'John', 'Paul', 'Ringo'],
      preview: searchFor
    });

    assert.isString(string);
    assert.match(string, new RegExp(`<title>${searchFor}</title>`, 'gm'), 'includes a <title> element from layout.html');
  });
});
