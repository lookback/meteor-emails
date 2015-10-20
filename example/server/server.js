Mailer.config({
  from: 'John Doe <from@domain.com>',
  replyTo: 'John Doe <from@domain.com>',
  addRoutes: true
});

Meteor.startup(function() {

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
