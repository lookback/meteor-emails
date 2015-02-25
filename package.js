var where = 'server';

Package.describe({
  name: 'lookback:emails',
  summary: 'Send emails with server side templates.',
  version: '0.1.0'
});

Npm.depends({
  'node-sass': '2.0.0',
  'juice': '1.0.0'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');

  api.use([
    'check',
    'underscore',
    'coffeescript',
    'email',
    'iron:router',
    'meteorhacks:ssr@2.1.2'
  ], where);

  api.addFiles([
    'utils.coffee',
    'emails.coffee'
  ], where);

  api.export('Mailer', where);
});
