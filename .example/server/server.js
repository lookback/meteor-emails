import TemplateHelpers from './lib/template-helpers';
import Templates from './lib/templates';

if (!process.env.MAIL_URL) {
  process.env.MAIL_URL = Meteor.settings.MAIL_URL;
}

Mailer.config({
  from: 'John Doe <from@domain.com>',
  replyTo: 'John Doe <from@domain.com>',
  addRoutes: true,
  plainTextOpts: {
    ignoreImage: true
  }
});

Meteor.startup(() => {

  Mailer.init({
    templates: Templates,     // Global Templates namespace, see lib/templates.js.
    helpers: TemplateHelpers, // Global template helper namespace.
    layout: {
      name: 'emailLayout',
      path: 'layout.html',   // Relative to 'private' dir.
      scss: 'layout.scss'
    }
  });
});
