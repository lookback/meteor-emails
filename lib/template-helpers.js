import Utils from './utils';

// # Template helpers
//
// Built-in template helpers.
export default {
  // `baseUrl` gives you a full absolute URL from a relative path.
  //
  //     {{ baseUrl '/some-path' }} => http://root-domain.com/some-path
  baseUrl(path) {
    return Utils.joinUrl(Mailer.settings.baseUrl, path);
  },

  // `emailUrlFor` takes an Iron Router route (with optional params) and
  // creates an absolute URL.
  //
  //    {{ emailUrlFor 'myRoute' param='foo' }} => http://root-domain.com/my-route/foo
  emailUrlFor(routeName, params) {
    const theRouter = Package['iron:router'] ? Router : FlowRouter;

    if (theRouter && theRouter.path) {
      return Utils.joinUrl(Mailer.settings.baseUrl,
        theRouter.path.call(theRouter, routeName, params.hash));
    }

    Utils.Logger.warn(`We noticed that neither Iron Router nor FlowRouter is installed, thus 'emailUrlFor' can't render a path to the route '${routeName}.`);
    return '//';
  }
};
