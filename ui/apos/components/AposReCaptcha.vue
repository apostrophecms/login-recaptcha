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
  mounted(){
    const self = this;
    grecaptcha.ready(() => {
      // Uses the `.then` syntax to use the .ready() method.
      grecaptcha.execute(this.sitekey, {action: 'submit'})
      .then(function(token) {
        self.token = token;
      });
    });
  },
  watch: {
    token(newVal) {
      if (newVal) {
        this.$emit('done', this.token);
      } else {
        this.$emit('block');
      }
    }
  }
};
</script>

<style scoped></style>
