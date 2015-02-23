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

  emailUrlFor: ->
    if Router
      Utils.joinUrl Mailer.settings.baseUrl, Router.path.apply(Router, arguments)

MailerClass = (options) ->
  check options, Match.ObjectIncluding(
    templates: Object
    helpers: Match.Optional Object
    layout: Match.Optional Object
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

    addCSS = (css, html) ->
      return if css then juice.inlineContent(html, css, juiceOpts) else html

    # .. then any attached CSS file paths.
    if template.css
      content = addCSS Utils.readFile(template.css), content

    # .. and compile and inline any SCSS file paths.
    if template.scss
      content = addCSS Utils.toCSS(template.scss), content

    if options.layout? and template.layout isnt false
      layout = options.layout
      layoutContent = Utils.readFile(layout.path)

      if layout.css
        layoutContent = addCSS Utils.readFile(layout.css), layoutContent
        content = addCSS Utils.readFile(layout.css), content

      if layout.scss
        layoutContent = addCSS Utils.toCSS(layout.scss), layoutContent
        content = addCSS Utils.toCSS(layout.scss), content

      if template.css
        layoutContent = addCSS Utils.readFile(template.css), layoutContent

      if template.scss
        layoutContent = addCSS Utils.toCSS(template.scss), layoutContent

      SSR.compileTemplate(layout.name, layoutContent)
      addHelpers layout


    # This will place the template function in
    #
    #   Template.<template.name>

    tmpl = SSR.compileTemplate(template.name, content)

    if layout?
      tmpl.__layout = layout.name

    addHelpers template

    return tmpl

  # Render a template by name, with optional data context.
  # Will compile the template if not done already.
  render = (templateName, data) ->
    check templateName, String
    check data, Match.Optional Object

    if not Template[templateName]
      compile _.findWhere(options.templates, name: templateName)

    rendered = SSR.render templateName, data

    if Template[templateName].__layout?
      rendered = SSR.render Template[templateName].__layout, body: rendered

    Utils.addDoctype rendered

  # Send an email.
  sendEmail = (options) ->
    check options,
      to: String
      subject: String
      template: String
      replyTo: Match.Optional String
      from: Match.Optional String
      data: Match.Optional Object

    defaults =
      replyTo: settings.replyTo
      from: settings.from

    opts = _.extend {}, defaults, options

    # Render HTML with optional data context
    opts.html = render options.template, options.data

    # Send email
    Email.send(opts)


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
