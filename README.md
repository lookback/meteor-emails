# Meteor Emails

`lookback:emails` is a Meteor package that makes it easier to build, test and debug rich HTML emails.

Usually, building HTML emails yourself is tedious. On top of that, add the need for data integration and thus a template language (for sending out daily digest emails, for instance). We wanted a way to preview the email in the browser *with real data* in order to quickly iterate on the design, instead of alternating between code editor and email client.

1. [Features](#features)
2. [Installation](#installation)
3. [Sample app](#sample-app)
4. [API](#api)
5. [Usage](#usage)
   1. [Setting up templates](#setting-up-templates)
   2. [Template paths on deployed instances](#template-paths-on-deployed-instances)
   3. [Template helpers](#template-helpers)
   4. [Layouts](#layouts)
   5. [Plain text version](#plain-text)
   6. [Previewing and sending](#previewing-and-sending)
   7. [Paths](#paths)
   8. [Sample file structure](#sample-file-structure)
   9. [Logging](#logging)
6. [Version history](#version-history)
7. [Contributing](#contributing)

## Features

- **Server side rendering** with the [Meteor SSR](https://github.com/meteorhacks/meteor-ssr/) package. Use Blaze features and helpers like on the client.
- **CSS inlining** with [Juice](http://npmjs.org/package/juice). No extra build step.
- **SCSS support** using `node-sass` (opt-in).
- **Preview and debug** emails in development mode in your browser when developing.
- **Layouts** for re-using markup.
- **Auto Plain-text** automatically creates a plain text version from your HTML template for lower spam score.

Help is appreciated in order to hammer out potential issues and bugs.

## Installation

`lookback:emails` is available on [Atmosphere](https://atmospherejs.com/lookback/emails):

```bash
meteor add lookback:emails
```

[Annotated source](http://lookback.github.io/meteor-emails/docs/mailer.html)

A `Mailer` global will exported on the *server*.

**Notice.** If you want SCSS support, be sure to add the `[meteor-node-sass](https://github.com/chrisbutler/meteor-node-sass)` package to your app:

```
meteor add chrisbutler:node-sass
```

`lookback:emails` will automatically detect `node-sass` being available, and will be able to compile `.scss` files.

## Sample app

There is a sample application in this repo, in the `example` directory. Boot it up, and preview an email with:

```bash
cd example
meteor
open http://localhost:3000/emails/preview/sample/john
```

Please inspect the provided sample code for details.

## API

`Mailer` has the following methods:

- `Mailer.config(Object)`. Change default settings:

    Takes a plain object with the following properties:
    ```js
  {
    from: 'Name <name@domain.com>',     // Default 'From:' address. Required.
    replyTo: 'Name <name@domain.com>',  // Defaults to `from`.
    routePrefix: 'emails',              // Route prefix.
    baseUrl: process.env.ROOT_URL,      // The base domain to build absolute link URLs from in the emails.
    testEmail: null,                    // Default address to send test emails to.
    logger: console                     // Injected logger (see further below)
    silent: false,                      // If set to `true`, any `Logger.info` calls won't be shown in the console to reduce clutter.
    addRoutes: process.env.NODE_ENV === 'development' // Add routes for previewing and sending emails. Defaults to `true` in development.
    language: 'html'                    // The template language to use. Defaults to 'html', but can be anything Meteor SSR supports (like Jade, for instance).
    plainText: true                     // Send plain text version of HTML email as well.
    plainTextOpts: {}                   // Options for `html-to-text` module. See all here: https://www.npmjs.com/package/html-to-text
  }
    ```

- `Mailer.init(Object)`. Kick things off with runtime settings!

    Takes a plain object with the following properties:
    ```js
  {
    templates: {},        // Required. A key-value hash where the keys are the template names. See more below.
    helpers: {},          // Global helpers available for all templates.
    layout: false         // Global layout template.
  }
    ```

- `Mailer.precompile(template)`. Precompile a `template` object and returns a `Blaze.Template`.
- `Mailer.render('templateName', [data])`. Render a template with optional data context and return the raw, rendered string.
- `Mailer.send(Object)`. Send an email. Returns `true` if mail was sent without errors, else `false`.

    Takes a plain object with the following properties:
    ```js
  {
    to: 'Name <name@domain.com>',           // 'To: ' address. Required.
    subject: 'Subject',                     // Required.
    template: 'templateName',               // Required.
    replyTo: 'Name <name@domain.com>',      // Override global 'ReplyTo: ' option.
    from: 'Name <name@domain.com>',         // Override global 'From: ' option.
    cc: 'Name <name@domain.com>',           // Optional.
    bcc: 'Name <name@domain.com>',          // Optional.
    data: {}                                // Optional. Render your email with a data object.
  }
    ```

## Usage

### Setting up templates

In `Mailer.init`, you're able to provide a key-value object with *template objects*. A template is just a plain object with some required keys:

```coffeescript
{
  path: 'activity-email.html'
  scss: 'scss/activity-email.scss'

  # Attached template helpers.
  helpers:
    preview: ->
      'This is the first preview line of the email'

    firstName: ->
      @user.name.split(' ')[0]

    teamMembers: ->
      @team.users.map (user) -> Meteor.users.findOne(user)

  # For previewing the email in your browser.
  route:
    path: '/activity/:user'
    data: ->
      user = Meteor.users.findOne(@params.user)
      team = Teams.findOne(_id: { $in: user.teams })

      return {
        user: user
        team: team
      }

}
```

Remember that the **key** is the name of the template. We usually structure it like this:

```coffeescript
# In server/lib/init.coffee:
this.Templates = {}
```

```coffeescript
# In server/templates/activity-email.coffee:

Templates.activityEmail = {
  path: 'activity-email.html'
  scss: 'activity-email.scss'
  # ... See above.
}
```

```coffeescript
# In server/init.coffee:

Mailer.init(
  templates: Templates
)
```

```html
<!-- In private/activity-email.html: -->
<h1>Hi {{ firstName }}!</h1>

<ul>
  {{#each teamMembers}}
    <li>{{name}}</li>
  {{/each}}
</ul>
```

Now you're able to send this email with:

```coffeescript
Mailer.send(
  to: 'johan@lookback.io'
  subject: 'Team Info!'
  template: 'activityEmail'
  data:
    user: # Some user
    team: # Some team
)
```

Simple as a pie!

### Template paths on deployed instances

This package assumes that assets (templates, SCSS, CSS ..) are stored in the `private` directory. Thanks to that, Meteor won't touch the HTML and CSS, which are non-JS files. Unfortunately, Meteor packages can't access content in `private` with the `Assets.getText()` method, so we need the *absolute path* to the template directory.

However, file paths are screwed up when bundling and deploying Meteor apps. Therefore, when running a deployed instance, this package will try to figure out the absolute path to your bundle (see first ~30 lines in `utils.coffee`). If that still isn't working for you, fall back to this:

1. For traditional hosts, manually set the `BUNDLE_PATH` environment variable. For instance `/var/www/app/bundle`.
2. For deployments on hosts with ephemeral file systems like Modulus, the `APP_DIR` environment variable should be provided by host. In that case, `APP_DIR` is used instead.

In development, neither of `BUNDLE_PATH` and `APP_DIR` are needed.

### Template Helpers

With "helpers", we speak about plain old Blaze template helpers, like in the frontend. They can be used to transform values, fetch more data, etc. Remember that these helpers are on the server, so they've got access to your app's collections, globals, etc.

There are three levels of helpers:

- Built in helpers.
- Global helpers provided by you in `Mailer.init()`.
- Template level helpers provided by you in a template object.

All helpers are run in the current template scope.

The built in helpers are:

```coffeescript
# `baseUrl` gives you a full absolute URL from a relative path.
#
#     {{ baseUrl '/some-path' }} => http://root-domain.com/some-path
baseUrl: (path) ->
  Utils.joinUrl(Mailer.settings.baseUrl, path)

# `emailUrlFor` takes an Iron Router or Flow Router route (with optional params) and
# creates an absolute URL.
#
#     {{ emailUrlFor 'myRoute' param='foo' }} => http://root-domain.com/my-route/foo
emailUrlFor: (routeName, params) ->
  # if Iron Router
  if Router?
    Utils.joinUrl Mailer.settings.baseUrl, Router.path.call(Router, routeName, params.hash)

  # if Flow Router
  if FlowRouter?
    baseUrl = Utils.joinUrl Mailer.settings.baseUrl, FlowRouter.path.call(FlowRouter, routeName, params.hash)
```

Please note that for Flow Router you need to have your routes defined in a place where the server can see them, in order for the `emailUrlFor` helper to work.

#### The preview line

The *preview line* is the first text content of an email, usually visible in many email clients. That can be used to convey more info beyond the `subject` prop. It's possible to have your preview content in your parent layout but still provide the data from a child template.

Just provide a `preview` helper function on your template *or* a `preview` prop on the data object when using `Mailer.render('name', data)`, and that will be available in the layout context:


```html
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>

  <body>
    {{#if preview}}
      {{preview}}
    {{else}}
      <!-- Fallback -->
    {{/if}}
  </body>
</html>
```

### Layouts

In order for you not to repeat yourself, the package supports **layouts**. They are plain wrapper around template HTML, so you can keep the same `<head>` styles, media queries, and more through many email templates.

Layouts are formatted and works like the other template objects, i.e. they support helpers, SCSS/CSS, etc.

Put an `html` layout file in `private` and refer to it in `Mailer.init()`:

```coffeescript
Mailer.init(
  helpers: TemplateHelpers
  templates: Templates
  layout:
    name: 'emailLayout'
    path: 'email-layout.html'
    scss: 'scss/emails.scss'    # Optional
    css: 'css/emails.css'       # Optional
)
```

Or for a specific template:

```coffeescript
Templates.invitationEmail =
  # .. props
  layout:
    name: 'specialLayout'
    path: 'special-layout.html'
    scss: 'scss/special-emails.scss'    # Optional
    css: 'css/special-emails.css'       # Optional
```

.. or not at all:

```coffeescript
Templates.invitationEmail =
  # .. props
  layout: false
```

If you want to provide extra CSS to your layout's `<head>` section *from template* (perhaps custom media queries for that specific template) you can provide the `extraCSS` option:

```coffeescript
Templates.activityEmail =
  path: '...'
  extraCSS: 'path/to/more.css'
```

It's you to render the raw CSS in your layout:

```html
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <style type="text/css">
      // Blah blah.

      {{{ css }}}
    </style>
  </head>
</html>
```

**Note** that the doctype isn't included in these examples. Due to a Blaze thingie, the proper email doctype is prepended during render:

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
```

### Plain text version

By default, plain text versions are automatically created from your html template and included in the final email. It's strongly advises to leave this option on, as it greatly reduces your emails' spam score and the chance that your emails will end up in spam folder of users. However, if you want to override this behaviour simply at this to `Mailer.config()`:

```coffeescript
Mailer.config(
  # ...
  plainText: false,
  plainTextOpts: {
    // Your options to send to the module, defaults to {}
    ignoreImage: true
  }
)
```

Consult the `html-to-text` [documentation](https://www.npmjs.com/package/html-to-text) for available options. See in the example app in this repo for how to disable images in plain text version, for instance.

### Previewing and Sending

`lookback:emails` makes it easier to preview email designs in your browser. And you can even interface with you database collections in order to fill them emails with *real data*.

It's also possible to *send* emails to yourself or others for review in a real mail client.

Noticed the `route` property on the template? It uses `meteorhacks:picker` server side routes under the hood.

The `route` property expects a `path` property and an optional `data` function providing the data context (an object). The function has access to the parameters of the route.

**Three routes** will be added:

```
/emails/preview/<routeName>   # Preview as HTML
/emails/text/<routeName>      # Preview as plain text
/emails/send/<routeName>      # Send the email to an address
```
The `/emails` root prefix is configurable in `config` in the `routePrefix` key.

The *route names* will be on the format

```
[preview|send]Name
```

So for a template named `newsletterEmail`, the route names will be

```
previewNewsletterEmail
textNewsletterEmail
sendNewsletterEmail
```

Note that the template name has a capitalized first character when generating the route name. This, along with the full path, will be logged in your app console at startup.

**Note:** Due to security concerns, previewing and sending emails through these routes are restrained to work in development mode per default, i.e. if

```
process.NODE_ENV === 'development'
```

This can be manually configured with the `addRoutes` boolean setting, when calling `Mailer.config()`.

The email template will compile, build SCSS, inline CSS, and render the resulting HTML for you on each refresh.

The `send` route can take an optional `?to` URL query parameter which sets the receiving mail address, unless set in `Mailer.config()`.

Summarized route configure sample:

```coffeescript
Mailer.config(
  addRoutes: true                 # Always add routes, even in production.
  routePrefix: 'newsletters'      # Will show '/newsletters/preview .. ' instead of '/emails/preview ..'.
  testEmail: 'name@domain.com'    # Default receiving email for emails sent with the '/emails/send' route.
)
```

### Paths

Paths to HTML templates and SCSS/CSS can be a bit tricky when deploying your app, since Meteor is shuffling around the files when building the app bundle.

Meteor doesn't touch files in the `private` directory ([docs](http://docs.meteor.com/#/full/structuringyourapp)). There we'll put our resources, and will thus be the *root relative* path when referring to HTML and CSS from template objects (see above).

When deployed, we must set the `BUNDLE_PATH` environment variable which refers to the directory where your app bundle lives in order to sniff out the absolute paths to the resources. We hope this will get easier in the future.

### Sample file structure

Since it's tricky to get an overview sometimes:

```
private/
  |- activity-email/
    |- activity-email.html
    |- activity-email.scss
  |- layout.html
  |- layout.scss
server/
  |- lib/
    |- init.coffee               # Setup namespaces: Templates, Helpers.
  |-  template-helpers.coffee   # Setup global TemplateHelpers.
  |- templates/
    |- activity-email/
      |- _helpers.coffee        # Attach activity email specific helpers to Helpers.ActivityEmail
      |- activity-email.coffee  # Define Templates.activityEmail. Include helpers.
    |- # .. more template dirs.
  |- init.coffee                # Init Mailer with Templates and TemplateHelpers
```

### Logging

It's nice to know what happens. The default `console` is used for logging, but you can inject your own logger in `Mailer.init()`:

```coffeescript
Mailer.init(
  logger: myLogger
)
```

and that will be used. The logger **must** support these methods:

- `info`
- `warn`
- `error`

Why not try [`meteor-logger`](https://github.com/lookback/meteor-logger)? :)

## Version history

- `0.7.2` - Support `cc` and `bcc` options to `Mailer.send()`. Filed in [#52](https://github.com/lookback/meteor-emails/issues/52), fixed in [#54](https://github.com/lookback/meteor-emails/pull/54).
- `0.7.1` - Check for existence of `Blaze` global before extending with registered Blaze helpers.
- `0.7.0` - Replaced Iron Router dependency with `meteorhacks:picker`, which means you can now use this package with FlowRouter as well.

  **Breaking change:** If you're using `this.params` in your custom mail routes' data functions (for sending or previewing emails), you need to change the function signature to accept a `params` parameter, and use that instead.

  `this` in data functions is now an instance of NodeJS' [`http.ServerResponse`](https://nodejs.org/api/http.html#http_class_http_serverresponse).

  ```js
route: {
  path: '/sample/:name',
  // params is an object, with potentially named parameters, and a `query` property
  // for a potential query string.
  data: function(params) {
    // `this` is the HTTP response object.
    return {
      name: params.name // instead of this.params.name
    };
  }
}
  ```
- `0.6.2` - Support passing options to `html-to-text` module in `Mailer.config()`.
- `0.6.1`- Fix critical runtime crash when sending emails.
- `0.6.0` - Automatically create and include plain text email version from your HTML templates, using [`html-to-text`](http://npmjs.com/package/html-to-text).
- `0.5.1` - Remove need for setting the `BUNDLE_PATH` environment variable ([#39](https://github.com/lookback/meteor-emails/pull/39)).
- `0.5.0` - Remove `node-sass` as hard dependency. SCSS support is now opt-in, by adding `chrisbutler:node-sass` to your app ([#35](https://github.com/lookback/meteor-emails/pull/35)).
- `0.4.6` - Fix paths on Windows in development mode.
- `0.4.5`
  - CSS and SCSS is now compiled and inlined at runtime, in order to inline CSS for the rendered content. If CSS only was inlined at compile time, the dynamic content wouldn't get any styling.
  - Because of the above, we received a small performance boost due to removal of excessive SCSS inlining and inlining.
- `0.4.4` - Fix not using local template `layout` option.
- `0.4.3` - Fix build issues by using externally packaged `node-sass` for Meteor.
- `0.4.2`
  - Update `node-sass` to 3.2.0.
  - Fix issue with using `layout: false` (from [#11](https://github.com/lookback/meteor-emails/issues/11)).
- `0.4.1` - Add `silent` option to `Mailer.config()`. If set to `true`, any `Logger.info` calls won't be shown in the console to reduce clutter.
- `0.4.0`
  - Add support for rendering Jade templates with the Meteor SSR package.
  - Don't append `Email` to the Iron Router route names.
  - Capitalize template name in route names (`sample` becomes `previewSample`).
  - Better logging when adding routes.
- `0.3.5` - Expose `addRoutes` setting. Enables manual control of adding preview and send routes.
- `0.3.4` - *Skipped.*
- `0.3.3` - Add `disabled` flag to settings, for completely disabling sending of actual emails.
- `0.3.2` - Add Windows arch support for Meteor 1.1 RC
- `0.3.1` - Don't expose `MailerClass`'s internal `init` method.
- `0.3.0` - Initial publish.

## Contributing

PRs and help is welcomed.

## Develop

Clone repo, and run:

```
npm install
```

to install dev dev dependencies. We're using ESLint for linting.

## Things to do

- [ ] Tests.

Also see [open issues](https://github.com/lookback/meteor-emails/issues).

***

Made by [Lookback](http://github.com/lookback)
