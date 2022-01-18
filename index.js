const fs = require('fs');
const path = require('path');

module.exports = {
  improve: '@apostrophecms/login',
  bundle: {
    directory: 'modules',
    modules: getBundleModuleNames()
  },
  init(self) {
    self.apos.template.append('head', '@apostrophecms/login:recaptcha');
  },
  components(self) {
    return {
      recaptcha(req, data) {
        return {
          sitekey: self.options.recaptcha.site
        };
      }
    };
  },
  requirements(self) {

    if (!self.options.recaptcha.site || !self.options.recaptcha.secret) {
      // Not playing around. No point in instantiating this module if you don't
      // configure it.

      // Unfortunately we're too early here to localize the error message.
      throw new Error('The login reCAPTCHA site key, secret key, or both are not configured');
    }

    return {
      add: {
        AposReCaptcha: {
          phase: 'beforeSubmit',
          async props(req) {
            return {
              sitekey: self.options.recaptcha.site
            };
          },
          async verify(req) {
            if (!req.body.requirements.AposReCaptcha) {
              throw self.apos.error('invalid', req.t('AposRecap:missingConfig'));
            }

            await self.checkRecaptcha(req, req.body.requirements.AposReCaptcha);
          }
        }
      }
    };
  },
  methods(self) {
    return {
      async checkRecaptcha (req, token) {
        const secret = self.options.recaptcha.secret;

        if (!secret) {
          return;
        }

        try {
          const url = 'https://www.google.com/recaptcha/api/siteverify';
          const recaptchaUri = `${url}?secret=${secret}&response=${token}`;

          const response = await self.apos.http.post(recaptchaUri);

          if (!response.success) {
            throw self.apos.error('invalid', req.t('AposRecap:invalidToken'));
          }
        } catch (e) {
          self.apos.util.error(e);
          throw self.apos.error('error', req.t('AposRecap:recaptchaErr'));
        }
      }
    };
  },
  helpers(self) {
    return {
      getLoginUrl() {
        return self.login();
      }
    };
  }
};

function getBundleModuleNames() {
  const source = path.join(__dirname, './modules/@apostrophecms');
  return fs
    .readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => `@apostrophecms/${dirent.name}`);
}
