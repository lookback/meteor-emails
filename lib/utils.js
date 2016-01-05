// # Utils package for `lookback:emails`

const fs = Npm.require('fs');
const path = Npm.require('path');
const htmlToText = Npm.require('html-to-text');

const TAG = 'mailer-utils';

// This package assumes that assets (templates, SCSS, CSS ..) are
// stored in the `private` directory. Thanks to that, Meteor won't
// touch the HTML and CSS, which are non-JS files.
//
// However, since the file paths are screwed up when bundling and
// deploying Meteor apps, we need to set the BUNDLE_PATH env var
// to keep track of where the bundle lives.
//
// When deployed, set the BUNDLE_PATH env var to the location, perhaps:
//     /var/www/app/bundle
// For Modulus, you need to use the APP_DIR variable, which you do NOT need to set
const isDevEnv = () => process.env.NODE_ENV === 'development';

const developmentPrivateDir = () => {
  if (!isDevEnv())
    return;
  // In development, using pwd is fine. Remove the .meteor/foo/bar stuff though.
  const meteorRoot = process.cwd().replace(/(\.meteor.*)/g, '');
  return path.join(meteorRoot, 'private');
};

const productionPrivateDir = () => {
  if (isDevEnv())
    return;

  const meteorRoot = fs.realpathSync(process.cwd() + '/../');
  return fs.realpathSync(meteorRoot + '/../');
};

const privateDir = process.env.BUNDLE_PATH || process.env.APP_DIR || productionPrivateDir();

let ROOT = privateDir && path.join(privateDir, 'programs', 'server', 'assets', 'app');

ROOT = ROOT || developmentPrivateDir();

Utils = {
  // Takes an HTML string and outputs a text version of it. Catches and logs errors.
  toText(html, opts = {}) {
    try {
      return htmlToText.fromString(html, opts);
    } catch (ex) {
      return Utils.Logger.error(`Could not make plain-text version from html: ${ex.message}`);
    }
  },

  capitalizeFirstChar(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },

  // Set up a logger to use through `MailerUtils.Logger`. Verify
  // that necessary methods exists on the injected `logger` and
  // fallback if not.
  setupLogger(logger, opts) {
    const defaults = {
      suppressInfo: false
    };

    opts = _.extend({}, defaults, opts);

    const res = ['info', 'warn', 'error'].map(function(method) {
      if (!_.has(logger, method)) {
        console.warn(`The injected logger must support the ${method} method.`);
        return false;
      }
      return true;
    });

    if (_.compact(res).length === 0) {
      console.warn('Falling back to the native logger.');
      this.Logger = console;
    } else {
      this.Logger = logger;
    }

    // Just do a noop for the `info` method
    // if we're in silent mode.
    if (opts.suppressInfo === true) {
      return this.Logger.info = function() {};
    }
  },

  joinUrl(base, path) {
    // Remove any trailing slashes.
    const root = base.replace(/\/$/, '');

    // Add front slash if not exist already.
    if (!/^\//.test(path)) {
      path = '/' + path;
    }
    return root + path;
  },

  addStylesheets(template, html, juiceOpts = {}) {
    check(template, Match.ObjectIncluding({
      name: String,
      css: Match.Optional(String),
      scss: Match.Optional(String)
    }));

    try {
      let content = html;

      if (template.css) {
        const css = Utils.readFile(template.css);
        content = juice.inlineContent(content, css, juiceOpts);
      }

      if (template.scss) {
        const scss = Utils.toCSS(template.scss);
        content = juice.inlineContent(content, scss, juiceOpts);
      }

      return content;

    } catch (ex) {
      Utils.Logger.error(`Could not add CSS to ${template.name}: ${ex.message}`, TAG);
      return html;
    }
  },

  addDoctype(html) {
    return '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n' + html;
  },

  readFile: function(relativePathFromApp) {
    const file = path.join(ROOT, relativePathFromApp);

    try {
      return fs.readFileSync(file, {
        encoding: 'utf8'
      });

    } catch (ex) {
      throw new Meteor.Error(500, `Could not find file: ${file}`, ex.message);
    }
  },

  // Take a path to a SCSS file and compiles it to CSS with `node-sass`.
  toCSS: function(scss) {
    if (!Package['chrisbutler:node-sass']) {
      Utils.Logger.warn('Sass support is opt-in since lookback:emails@0.5.0. Please add chrisbutler:node-sass from Atmosphere and try again.', TAG);
      return Utils.readFile(scss);
    }

    const file = path.join(ROOT, scss);
    const sass = Package['chrisbutler:node-sass'].sass;

    try {
      return sass.renderSync({
        file: file,
        sourceMap: false
      }).css.toString();

    } catch (ex) {
      console.error(`Sass failed to compile: ${ex.message}`);
      return console.error(`In ${ex.file || scss} at line ${ex.line}, column ${ex.column}`);
    }
  }
};
