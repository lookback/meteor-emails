/* eslint-disable no-var, prefer-arrow-callback */
var where = 'server';

Package.describe({
  name: 'lookback:emails',
  summary: 'Send HTML emails with server side Blaze templates. Preview and debug in the browser.',
  version: '0.7.8',
  git: 'https://github.com/lookback/meteor-emails.git'
});

Package.onUse(function(api) {

  api.versionsFrom('1.0.4');

  api.use([
    'chrisbutler:node-sass@3.2.0',
    'iron:router@1.0.7',
    'kadira:flow-router@2.9.0'
  ], where, { weak: true });

  api.use([
    'ecmascript@0.5.9',
    'check',
    'underscore',
    'email',
    'sacha:juice@0.1.3',
    'meteorhacks:ssr@2.2.0',
    'meteorhacks:picker@1.0.3',
    'lookback:html-to-text@2.1.3_2'
  ], where);

  api.addFiles([
    'export.js'
  ], where);

  api.export('Mailer', where);
});

Package.onTest(function(api) {
  api.use([
    'ecmascript',
    'underscore',
    'dispatch:mocha',
    'practicalmeteor:chai',
    'lookback:emails',
  ], 'server');

  api.mainModule('tests.js', 'server');
});
