const assert = require('assert');
const testUtil = require('apostrophe/test-lib/test');

describe('Forms module', function () {
  let apos;

  this.timeout(25000);

  after(async function () {
    testUtil.destroy(apos);
  });

  const siteConfig = {
    // reCAPTCHA test keys
    // https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha-what-should-i-do
    site: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
    secret: '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'
  };

  // Improving
  it('should improve the login module', async function () {
    apos = await testUtil.create({
      shortname: 'loginTest',
      testModule: true,
      modules: {
        '@apostrophecms/express': {
          options: {
            port: 4242,
            // csrf: {
            //   exceptions: [ '/api/v1/@apostrophecms/form/submit' ]
            // },
            session: {
              secret: 'test-this-module'
            },
            apiKeys: {
              skeleton_key: { role: 'admin' }
            }
          }
        },
        '@apostrophecms/login-recaptcha': {
          options: {
            testOption: 'suprise'
          }
        },
        '@apostrophecms/login': {
          options: {
            recaptcha: {
              site: siteConfig.site,
              secret: siteConfig.secret
            }
          }
        }
      }
    });

    const login = apos.modules['@apostrophecms/login'];
    assert(login.options.testOption === 'suprise');
  });

  const mary = {
    username: 'marygold',
    pw: 'asdfjkl;'
  };

  it('should be able to insert test user', async function() {
    assert(apos.user.newInstance);
    const user = apos.user.newInstance();
    assert(user);

    user.title = 'Mary Gold';
    user.username = mary.username;
    user.password = mary.pw;
    user.email = 'mary@gold.rocks';
    user.role = 'editor';

    const doc = await apos.user.insert(apos.task.getReq(), user);
    assert(doc._id);
  });

  it('should not be able to login a user without meeting the beforeSubmit requirement', async function() {

    const jar = apos.http.jar();

    // establish session
    let page = await apos.http.get('/', { jar });

    assert(page.match(/logged out/));

    const context = await apos.http.post(
      '/api/v1/@apostrophecms/login/context',
      {
        method: 'POST',
        body: {},
        jar
      }
    );

    assert(context.requirementProps);
    assert(context.requirementProps.AposRecaptcha);
    assert.strictEqual(context.requirementProps.AposRecaptcha.sitekey, siteConfig.site);

    try {
      await apos.http.post(
        '/api/v1/@apostrophecms/login/login',
        {
          method: 'POST',
          body: {
            username: mary.username,
            password: mary.pw,
            session: true
          },
          jar
        }
      );
      assert(false);
    } catch (e) {
      assert(e.status === 400);
      assert.strictEqual(e.body.message, 'The reCAPTCHA token was missing while verifying login.');
      assert.strictEqual(e.body.data.requirement, 'AposRecaptcha');
    }

    // Make sure it really didn't work
    page = await apos.http.get('/', { jar });

    assert(page.match(/logged out/));
  });

  it('should log in with a recaptcha token', async function() {

    const jar = apos.http.jar();

    // establish session
    let page = await apos.http.get('/', { jar });

    assert(page.match(/logged out/));

    // intecept the logger
    let savedArgs = [];
    apos.login.logInfo = (...args) => {
      savedArgs = args;
    };

    await apos.http.post(
      '/api/v1/@apostrophecms/login/login',
      {
        method: 'POST',
        body: {
          username: mary.username,
          password: mary.pw,
          session: true,
          requirements: {
            // The reCAPTCHA test keys accept any token value.
            AposRecaptcha: 'valid-token'
          }
        },
        jar
      }
    );

    assert.equal(savedArgs[0], 'recaptcha-complete');
    assert(savedArgs[1].ip);
    console.log(savedArgs[1]);

    page = await apos.http.get('/', { jar });

    assert(page.match(/logged in/));
  });

  it('should log bad token request', async function () {
    // intercept http
    const post = apos.http.post;
    apos.http.post = async function () {
      return {
        success: false,
        foo: 'bar'
      };
    };

    // intecept the logger
    let savedArgs = [];
    apos.login.logInfo = (...args) => {
      savedArgs = args;
    };

    try {
      await apos.login.checkRecaptcha(apos.task.getReq({
        ip: '1.1.1.1'
      }), 'invalid-token');
    } catch (e) {
      //
    }
    assert.equal(savedArgs[0], 'recaptcha-invalid-token');
    assert.deepEqual(savedArgs[1], {
      ip: '1.1.1.1',
      data: {
        success: false,
        foo: 'bar'
      }
    });

    apos.http.post = post;
  });
});
