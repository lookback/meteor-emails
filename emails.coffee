Mailer =
  settings:
    secret: 'LtCMLxvXcFtjAYgD8%oXDkT6NeXLDv'
    routePrefix: 'emails'
    baseUrl: process.env.ROOT_URL
    testEmail: null

  config: (newSettings) ->
    @settings = _.extend(@settings, newSettings)

# Deps

juice = Npm.require 'juice'
Utils = share.MailerUtils

# Template helpers

Helpers =

  baseUrl: (path) ->
    Utils.joinUrl(Mailer.settings.baseUrl, path)

MailerClass = (options) ->
  check options, Match.ObjectIncluding(
    templates: Object
    helpers: Match.Optional Object
  )

  settings = _.extend({}, Mailer.settings, options.settings)
  globalHelpers = _.extend({}, Helpers, Blaze._globalHelpers, options.helpers)

  addHelpers = (template) ->
    check template.name, String
    check template.helpers, Match.Optional Object

    Template[template.name].helpers _.extend({}, globalHelpers, template.helpers)

  # Function for compiling a template with a name and path to
  # a HTML file to a template function, to be placed
  # in the Template namespace.
  compile = (template) ->
    check template, Match.ObjectIncluding(
      path: String
      name: String
      scss: Match.Optional String
      css: Match.Optional String
    )

    content = Utils.readFile(template.path)

    juiceOpts =
      preserveMediaQueries: true
      removeStyleTags: true
      webResources:
        images: false

    addCSS = (css) ->
      content = juice.inlineContent(content, css, juiceOpts)

    # .. then any attached CSS file paths.
    if template.css
      addCSS Utils.readFile(template.css)

    # .. and compile and inline any SCSS file paths.
    if template.scss
      addCSS Utils.toCSS(template.scss)

    # This will place the template function in
    #
    #   Template.<template.name>

    tmpl = SSR.compileTemplate(template.name, content)

    addHelpers template

    return tmpl

  # Render a template by name, with optional data context.
  # Will compile the template if not done already.
  render = (templateName, data) ->
    check templateName, String
    check data, Match.Optional(Object)

    if not Template[templateName]
      compile _.findWhere(options.templates, name: templateName)

    Utils.addDoctype SSR.render templateName, data


  # Send an email.
  sendEmail = (options) ->
    check options,
      to: String
      subject: String
      template: String
      data: Match.Optional(Object)

    html = render options.template, options.data

    Email.send(
      from: settings.from
      replyTo: settings.replyTo
      to: options.to
      subject: options.subject
      html: html
    )


  # Add routes for easy in browser debugging.

  Routes =

    # Expects a template object.
    addPreview: (template) ->
      check template.name, String
      check template.route,
        path: String
        data: Match.Optional Function

      path = settings.routePrefix + '/preview' + template.route.path

      console.log 'Adding route: /' + path

      Router.route 'emailPreview',
        path: path
        where: 'server'
        action: ->
          @response.writeHead 200, 'Content-Type': 'text/html'

          data = template.route.data and template.route.data.apply(this, arguments)
          # Compile, since we wanna refresh markup and CSS inlining.
          compile template
          html = render template.name, data

          @response.end(html, 'utf8')

    addSend: (template, to) ->
      check template.name, String
      check template.route,
        path: String
        data: Match.Optional Function

      path = settings.routePrefix + '/send' + template.route.path

      console.log 'Adding route /' + path

      Router.route 'sendEmail',
        path: path
        where: 'server'
        action: ->
          if to?
            data = template.route.data and template.route.data.apply(this, arguments)

            sendEmail(
              to: to
              data: data
              template: template.name
              subject: '[TEST] ' + template.name
            )

            reallySentEmail = !!process.env.MAIL_URL
            msg = if reallySentEmail then "Sent test email to #{to}" else "Sent email to STDOUT"

            @response.writeHead 200
            @response.end(msg)

          else
            @response.writeHead 400
            @response.end("No testEmail provided in settings.")

  # Init routine. Precompiles all templates provided and
  # setup routes if provided and if in dev mode.
  init = ->
    if options.templates
      _.each options.templates, (template, name) ->
        template.name = name

        compile template

        if template.route and process.env.NODE_ENV is 'development'
          Routes.addPreview template
          Routes.addSend template, settings.testEmail

  # Export

  init: init
  precompile: compile
  render: render
  send: sendEmail

# Exported symbol
#
# I wanna export a singleton symbol with an 'init'
# method, but still initialize variables in the main
# function body of 'MailerClass'.
Mailer.init = (opts) ->
    mailer = MailerClass(opts)
    mailer.init()

    _.extend(this, mailer)
