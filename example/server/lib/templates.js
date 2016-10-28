export default {
  sample: {
    path: 'sample-email/template.html',    // Relative to the 'private' dir.
    scss: 'sample-email/style.scss',       // Mail specific SCSS.

    helpers: {
      capitalizedName() {
        return this.name.charAt(0).toUpperCase() + this.name.slice(1);
      }
    },

    route: {
      path: '/sample/:name',
      data: (params) => ({
        name: params.name,
        names: ['Johan', 'John', 'Paul', 'Ringo']
      })
    }
  }
};
