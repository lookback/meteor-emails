// # Routes
//
// This package supports browser routes, so you can **preview**
// and **send email designs** from the browser.

// This function adds the `preview` route from a `template` object.
// It will apply the returned data from a `data` function on the
// provided `route` prop from the template.

import Utils from './utils';

const CONTENT_TYPES = {
  html: 'text/html',
  text: 'text/plain'
};

const arrayOrString = (str) =>
  Array.isArray(str) ? str : str.split(',');

export default function Routing(template, settings, render, compile) {
  check(template, Object);
  check(template.name, String);

  if (template && !template.route) {
    Utils.Logger.info(`Cannot set up route for '${template.name}' mailer template - missing 'route' propery. See documentation.`, 'mailer');
    return;
  }

  check(template.route.path, String);
  check(settings.routePrefix, String);
  check(render, Function);
  check(compile, Function);

  const previewAction = (type) => {
    check(type, Match.OneOf('html', 'text'));

    return (req, res, params, _) => {
      let data = null;

      try {
        data = template.route.data && template.route.data.call(res, params);
      } catch (ex) {
        let msg = '';
        const exception = `Exception in ${template.name} data function: ${ex.message}`;

        const func = template.route.data.toString();

        if (func.indexOf('this.params') !== -1) {
          msg = `Seems like you're calling this.params in the data function for the template '${template.name}'. As of 0.7.0, this package doesn't use Iron Router for server side routing, and thus you cannot rely on its API.\n\nYou can access URL params with the new function signature:\n\n\tfunction data(params:object)\n\ninstead of using this.params. The function scope (this) is now an instance of NodeJS's http.ServerResponse.\n\nSee https://github.com/lookback/meteor-emails#version-history for more info.\n\nThe exception thrown was: ${ex.message}`;
        } else if (func.indexOf('this.') !== -1 && Package['iron:router']) {
          msg = `Seems like you're accessing 'this' in the data function for '${template.name}'. As of 0.7.0, we've removed Iron Router, and thus you cannot rely on its API.\n\nThe function scope is now an instance of NodeJS's http.ServerResponse.\n\nSee https://github.com/lookback/meteor-emails#version-history for more info.\n\nThe exception thrown was: ${ex.message}`;
        } else {
          msg = exception;
        }

        Utils.Logger.error(msg);
        res.writeHead(500);
        res.end(msg);
      }

      // Compile, since we wanna refresh markup and CSS inlining.
      compile(template);

      Utils.Logger.info(`Rendering ${template.name} as ${type}…`);

      let content = '';

      try {
        const html = render(template.name, data);
        content = type === 'html' ? html : Utils.toText(html, settings.plainTextOpts);
        Utils.Logger.info('Rendering successful!');
      } catch (ex) {
        const msg = `Could not preview email: ${ex.message}`;
        Utils.Logger.error(msg);
        content = msg;
      }

      res.writeHead(200, {
        'Content-Type': CONTENT_TYPES[type]
      });

      return res.end(content, 'utf8');
    };
  };

  const sendAction = (req, res, params, _) => {
    const {to = settings.testEmail, cc, bcc} = params.query;

    Utils.Logger.info(`Sending ${template.name}…`);

    if (to) {
      let data = null;

      try {
        data = template.route.data && template.route.data.call(res, params);
      } catch (ex) {
        Utils.Logger.error(`Exception in ${template.name} data function: ${ex.message}`);
        return;
      }

      const options = {
        to: arrayOrString(to),
        data,
        template: template.name,
        subject: `[TEST] ${template.name}`
      };

      if (cc) {
        options.cc = arrayOrString(cc);
      }

      if (bcc) {
        options.bcc = arrayOrString(bcc);
      }

      const result = Mailer.send(options);

      let msg = '';

      if (result === false) {
        res.writeHead(500);
        msg = 'Did not send test email, something went wrong. Check the logs.';
      } else {
        res.writeHead(200);
        const reallySentEmail = !!process.env.MAIL_URL;
        msg = reallySentEmail
          ? `Sent test email to ${to}` + ((cc) ? ` and cc: ${cc}` : '') + ((bcc) ? `, and bcc: ${bcc}` : '') // eslint-disable-line
          : 'Sent email to STDOUT';
      }

      Utils.Logger.info(msg);
      res.end(msg);

    } else {
      res.writeHead(400);
      res.end('No testEmail or ?to parameter provided.');
    }
  };

  const types = {
    preview: previewAction('html'),
    text: previewAction('text'),
    send: sendAction
  };

  _.each(types, (action, type) => {
    const path = `/${settings.routePrefix}/${type}${template.route.path}`;
    const name = Utils.capitalizeFirstChar(template.name);
    const routeName = String(type + name);

    Utils.Logger.info(`Add route: [${routeName}] at path ${path}`);

    Picker.route(path, (params, req, res) => action(req, res, params, template));
  });
}
