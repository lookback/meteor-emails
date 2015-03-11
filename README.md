# Meteor Emails

`lookback:emails` is a Meteor package that makes it easier building, testing and debugging rich HTML emails.

Usually, building HTML emails yourself is tedious. On top of that, add the need for data integration and thus a template language (for sending out daily digest emails, for instance). We wanted a way to preview the email in the browser *with real data* in order to quickly iterate on the design, instead of alternating between code editor and email client.

## Features

- **Server side rendering** with the [Meteor SSR](https://github.com/meteorhacks/meteor-ssr/) package. Use Blaze features and helpers like on the frontend.
- **CSS inlining** with [Juice](http://npmjs.org/package/juice). No extra build step.
- **Preview and debug** emails in development mode in your browser.
- **Layouts** for re-using markup.

Help is appreciated in order to hammer out potential issues and bugs.

## Installation

`lookback:emails` is available on [Atmosphere](https://atmospherejs.com/lookback/emails):

```bash
meteor add lookback:emails
```

[Annotated source](http://lookback.github.io/meteor-emails/docs/emails.html)

A `Mailer` global will exported on the server.

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

  # For previewing the email in your browser. Behaves like an ordinary Iron Router route.  
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

# `emailUrlFor` takes an Iron Router route (with optional params) and
# creates an absolute URL.
#
#     {{ emailUrlFor 'myRoute' param='foo' }} => http://root-domain.com/my-route/foo
emailUrlFor: (route, params) ->
  if Router
    Utils.joinUrl Mailer.settings.baseUrl, Router.path.call(Router, route, params.hash)

```

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

In order for you not to repeat yourself, the package supports **layouts**. They are plain wrapper around template HTML, so you can keep the same `<head>` styles, media queries, and more through many email templates. Layouts works like the other templates, i.e. they support helpers, SCSS/CSS, etc.

Put an `html` layout file in `private` and refer to it in `Mailer.init()`:

```coffeescript
Mailer.init(
  helpers: TemplateHelpers
  templates: Templates
  layout:
    name: 'emailLayout'
    path: 'email-layout.html'
    scss: 'scss/emails.scss'
)
```

Or for a specific template:

```coffeescript
Templates.invitationEmail =
  # .. props
  layout:
    name: 'specialLayout'
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

### Previewing and Sending

Noticed the `route` property on the template? That's for showing your email in the browser. It uses Iron Router's server side routes under the hood.

It expects a `path` property (feel free to use any of Iron Router's fanciness in here) and an optional `data` function providing the data context (an object). The function has access to the same scope as Iron Router's `action` hook, which means you can get a hold of parameters and the whole shebang.

**Two routes** will be added:

```
/emails/preview/<routeName>
/emails/send/<routeName>
```

The email template will compile, build SCSS, inline CSS, and render the resulting HTML for you on each refresh.

The `send` route can take an optional `?to` query parameter which sets the receiving mail address, unless set in `Mailer.config()`.

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

- `0.3.1`. Don't expose `MailerClass`'s internal `init` method.
- `0.3.0` - Initial publish.

## Contributing

PRs and help is welcomed.

***

Made by [Lookback](http://github.com/lookback)
