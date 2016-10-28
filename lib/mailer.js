// `lookback:emails` is a small package for Meteor which helps you
// tremendously in the process of building, testing and debugging
// HTML emails in Meteor applications.
//
// See the [GitHub repo](https://github.com/lookback/meteor-emails) for README.
// Made by Johan Brook for [Lookback](https://github.com/lookback).

import RoutingMiddleware from './routing';
import TemplateHelpers from './template-helpers';
import Utils from './utils';

const TAG = 'mailer';

// ## Setup

// Main exported symbol with some initial settings:
//
// - `routePrefix` is the top level path for the preview and send routes (see further down).
// - `baseUrl` is what root domain to base relative paths from.
// - `testEmail`, when testing emails, set this variable.
// - `logger`, optionally inject an external logger. Defaults to `console`.
// - `disabled`, optionally disable the actual email sending. Useful for E2E testing.
//    Defaults to `false`.
// - `addRoutes`, should we add preview and send routes? Defaults to `true` in development.
export const Mailer = {
  settings: {
    silent: false,
    routePrefix: 'emails',
    baseUrl: process.env.ROOT_URL,
    testEmail: null,
    logger: console,
    disabled: false,
    addRoutes: process.env.NODE_ENV === 'development',
    language: 'html',
    plainText: true,
    plainTextOpts: {},
    juiceOpts: {
      preserveMediaQueries: true,
      removeStyleTags: true,
      webResources: {
        images: false
      }
    }
  },

  middlewares: [],

  use(middleware) {
    if (!_.isFunction(middleware)) {
      console.error('Middleware must be a function!');
    } else {
      this.middlewares.push(middleware);
    }

    return this;
  },

  config(newSettings) {
    this.settings = _.extend(this.settings, newSettings);
    return this;
  }
};

// # The factory
//
// This is the "blueprint" of the Mailer object. It has the following interface:
//
// - `precompile`
// - `render`
// - `send`
//
// As you can see, the mailer takes care of precompiling and rendering templates
// with data, as well as sending emails from those templates.
const factory = (options) => {
  check(options, Match.ObjectIncluding({
    // Mailer *must* take a `templates` object with template names as keys.
    templates: Object,
    // Take optional template helpers.
    helpers: Match.Optional(Object),
    // Take an optional layout template object.
    layout: Match.Optional(Match.OneOf(Object, Boolean))
  }));

  const settings = _.extend({}, Mailer.settings, options.settings);

  const blazeHelpers = typeof Blaze !== 'undefined' ? Blaze._globalHelpers : {};
  const globalHelpers = _.extend({}, TemplateHelpers, blazeHelpers, options.helpers);

  Utils.setupLogger(settings.logger, {
    suppressInfo: settings.silent
  });

  // Use the built-in helpers, any global Blaze helpers, and injected helpers
  // from options, and *additional* template helpers, and apply them to
  // the template.
  const addHelpers = (template) => {
    check(template.name, String);
    check(template.helpers, Match.Optional(Object));
    return Template[template.name].helpers(_.extend({}, globalHelpers, template.helpers));
  };

  // ## Compile
  //
  // Function for compiling a template with a name and path to
  // a HTML file to a template function, to be placed
  // in the Template namespace.
  //
  // A `template` must have a path to a template HTML file, and
  // can optionally have paths to any SCSS and CSS stylesheets.
  const compile = (template) => {
    check(template, Match.ObjectIncluding({
      path: String,
      name: String,
      scss: Match.Optional(String),
      css: Match.Optional(String),
      layout: Match.Optional(Match.OneOf(Boolean, {
        name: String,
        path: String,
        scss: Match.Optional(String),
        css: Match.Optional(String)
      }))
    }));

    let content = null;

    try {
      content = Utils.readFile(template.path);
    } catch (ex) {
      Utils.Logger.error(`Could not read template file: ${template.path}`, TAG);
      return false;
    }

    const layout = template.layout || options.layout;

    if (layout && template.layout !== false) {
      const layoutContent = Utils.readFile(layout.path);
      SSR.compileTemplate(layout.name, layoutContent, {
        language: settings.language
      });

      addHelpers(layout);
    }

    // This will place the template function in
    //
    //     Template.<template.name>
    const tmpl = SSR.compileTemplate(template.name, content, {
      language: settings.language
    });

    // Add helpers to template.
    addHelpers(template);
    return tmpl;
  };

  // ## Render
  //
  // Render a template by name, with optional data context.
  // Will compile the template if not done already.
  const render = (templateName, data) => {
    check(templateName, String);
    check(data, Match.Optional(Object));

    const template = _.findWhere(options.templates, {
      name: templateName
    });

    if (!(templateName in Template)) {
      compile(template);
    }

    const tmpl = Template[templateName];

    if (!tmpl) {
      throw new Meteor.Error(500, `Could not find template: ${templateName}`);
    }

    let rendered = SSR.render(tmpl, data);
    const layout = template.layout || options.layout;

    if (layout && template.layout !== false) {
      let preview = null;
      let css = null;

      // When applying to a layout, some info from the template
      // (like the first preview lines) needs to be applied to the
      // layout scope as well.
      //
      // Thus we fetch a `preview` helper from the template or
      // `preview` prop in the data context to apply to the layout.
      if (tmpl.__helpers.has('preview')) {
        preview = tmpl.__helpers.get('preview');
      } else if (data && data.preview) {  // data is optional
        preview = data.preview;
      }

      // The `extraCSS` property on a `template` is applied to
      // the layout in `<style>` tags. Ideal for media queries.
      if (template.extraCSS) {
        try {
          css = Utils.readFile(template.extraCSS);
        } catch (ex) {
          Utils.Logger.error(
            `Could not add extra CSS when rendering ${templateName}: ${ex.message}`, TAG);
        }
      }

      const layoutData = _.extend({}, data, {
        body: rendered,
        css,
        preview
      });

      rendered = SSR.render(layout.name, layoutData);
      rendered = Utils.addStylesheets(template, rendered, settings.juiceOpts);
      rendered = Utils.addStylesheets(layout, rendered, settings.juiceOpts);
    } else {
      rendered = Utils.addStylesheets(template, rendered, settings.juiceOpts);
    }

    rendered = Utils.addDoctype(rendered);
    return rendered;
  };

  // ## Send
  //
  // The main sending-email function. Takes a set of usual email options,
  // including the template name and optional data object.
  const sendEmail = (sendOptions) => {
    check(sendOptions, {
      to: Match.OneOf(String, [String]),
      subject: String,
      template: String,
      cc: Match.Optional(Match.OneOf(String, [String])),
      bcc: Match.Optional(Match.OneOf(String, [String])),
      replyTo: Match.Optional(Match.OneOf(String, [String])),
      from: Match.Optional(String),
      data: Match.Optional(Object),
      headers: Match.Optional(Object),
      attachments: Match.Optional([Object])
    });

    const defaults = {
      from: settings.from
    };

    if (settings.replyTo) {
      defaults.replyTo = settings.replyTo;
    }

    // `template` isn't part of Meteor's `Email.send()` API, so omit this.
    const opts = _.omit(_.extend({}, defaults, sendOptions), 'template', 'data');

    // Render HTML with optional data context and optionally
    // create plain-text version from HTML.
    try {
      opts.html = render(sendOptions.template, sendOptions.data);
      if (settings.plainText) {
        opts.text = Utils.toText(opts.html, settings.plainTextOpts);
      }
    } catch (ex) {
      Utils.Logger.error(`Could not render email before sending: ${ex.message}`, TAG);
      return false;
    }

    try {
      if (!settings.disabled) {
        Email.send(opts);
      }

      return true;
    } catch (ex) {
      Utils.Logger.error(`Could not send email: ${ex.message}`, TAG);
      return false;
    }
  };

  const init = () => {
    if (options.templates) {
      _.each(options.templates, (template, name) => {
        template.name = name;
        compile(template);

        Mailer.middlewares.forEach(func => {
          func(template, settings, render, compile);
        });
      });
    }
  };

  return {
    precompile: compile,
    render: render,
    send: sendEmail,
    init
  };
};

// Init routine. We create a new "instance" from the factory.
// Any middleware needs to be called upon before we run the
// inner `init()` function.
Mailer.init = function(opts) {
  const obj = _.extend(this, factory(opts));

  if (obj.settings.addRoutes) {
    obj.use(RoutingMiddleware);
  }

  obj.init();
};
