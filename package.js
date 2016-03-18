/* eslint no-var: 0*/
var where = 'server';

Package.describe({
  name: 'lookback:emails',
  summary: 'Send HTML emails with server side Blaze templates. Preview and debug in the browser.',
  version: '0.7.2',
  git: 'https://github.com/lookback/meteor-emails.git'
});

Npm.depends({
  'html-to-text': '1.3.0'
});

Package.onUse(function(api) {

  api.versionsFrom('1.0.4');

  api.use([
    'chrisbutler:node-sass@3.2.0',
    'iron:router@1.0.7',
    'kadira:flow-router@2.9.0'
  ], where, { weak: true });

  api.use([
    'ecmascript@0.1.5',
    'check',
    'underscore',
    'email',
    'sacha:juice@0.1.3',
    'meteorhacks:ssr@2.2.0',
    'meteorhacks:picker@1.0.3'
  ], where);

  api.addFiles([
    'lib/utils.js',
    'lib/template-helpers.js',
    'lib/routing.js',
    'lib/mailer.js'
  ], where);

  api.export('Mailer', where);
});

Package.onTest(function(api) {
  api.use([
    'practicalmeteor:mocha',
    'ecmascript',
    'lookback:emails'
  ], where);
});
