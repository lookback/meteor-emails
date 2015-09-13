var where = 'server';

Package.describe({
  name: 'lookback:emails',
  summary: 'Send HTML emails with server side Blaze templates. Preview and debug in the browser.',
  version: '0.4.6',
  git: 'https://github.com/lookback/meteor-emails.git'
});

Package.onUse(function(api) {

  api.versionsFrom('1.0.4');

  api.use([
    'check',
    'underscore',
    'coffeescript',
    'email',
    'sacha:juice@0.1.3',
    'chrisbutler:node-sass@3.2.0',
    'iron:router@1.0.7',
    'meteorhacks:ssr@2.1.2'
  ], where);

  api.addFiles([
    'utils.coffee',
    'emails.coffee'
  ], where);

  api.export('Mailer', where);
});
