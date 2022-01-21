<template></template>

<script>
export default {
  emits: [ 'done', 'block' ],
  props: {
    sitekey: String
  },
  data() {
    return {
      token: null
    };
  },
  computed: {
    recaptchaUrl() {
      return 'https://www.google.com/recaptcha/api.js?render=' + this.sitekey;
    }
  },
  mounted(){
    if (!window.grecaptcha) {
      this.addScript();
    }

    this.executeRecaptcha();
  },
  watch: {
    token(newVal) {
      if (newVal) {
        this.$emit('done', this.token);
      } else {
        this.$emit('block');
      }
    }
  },
  methods: {
    addScript() {
      let scriptElem = document.createElement('script');
      scriptElem.setAttribute('src', this.recaptchaUrl);
      scriptElem.setAttribute('defer', true);

      document.head.appendChild(scriptElem);
    },
    executeRecaptcha() {
      if (!window.grecaptcha) {
        setTimeout(this.executeRecaptcha, 100);
        return;
      }

      const self = this;

      grecaptcha.ready(() => {
        // Uses the `.then` syntax to use the .ready() method.
        grecaptcha.execute(this.sitekey, {action: 'submit'})
        .then(function(token) {
          self.token = token;
        });
      });
    }
  }
};
</script>

<style scoped></style>
