fs = Npm.require 'fs'
path = Npm.require 'path'
sass = Npm.require 'node-sass'

share.MailerUtils =
  
  joinUrl: (base, path) ->
    # Remove any trailing slashes
    base = base.replace(/\/$/, '')

    # Add front slash if not exist already
    unless /^\//.test(path)
      path = '/' + path

    return base + path

  addDoctype: (html) ->
    '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n' + html

  readFile: (relativePathFromApp) ->
    file = path.join(process.env.PWD, relativePathFromApp)

    try
      return fs.readFileSync(file, encoding: 'utf8')
    catch ex
      throw new Meteor.Error 500, 'Could not find file: ' + file, ex.message

  toCSS: (scss) ->
    file = path.join(process.env.PWD, scss)

    try
      return sass.renderSync(file: file, sourceMap: false).css
    catch ex
      # ex is somehow a JSON string.
      e = JSON.parse(ex)
      throw new Meteor.Error 500, 'Sass failed to compile: ' + e.file or scss, e.message
