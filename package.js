var where = 'server';

Package.describe({
  name: 'lookback:emails',
  summary: 'Send HTML emails with server side Blaze templates. Preview and debug in the browser.',
  version: '0.4.2',
  git: 'https://github.com/lookback/meteor-emails.git'
});

Npm.depends({
  'node-sass': '3.2.0',
  'juice': '1.0.0'
});

Package.onUse(function(api) {

  api.versionsFrom('1.0.4');

  api.use([
    'check',
    'underscore',
    'coffeescript',
    'email',
    'iron:router@1.0.7',
    'meteorhacks:ssr@2.1.2'
  ], where);

  api.addFiles([
    'utils.coffee',
    'emails.coffee'
  ], where);

  api.export('Mailer', where);
});
