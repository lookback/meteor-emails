Templates = {};

Templates.sample = {
  path: 'sample-email/template.html',    // Relative to the 'private' dir.
  scss: 'sample-email/style.scss',       // Mail specific SCSS.

  helpers: {
    capitalizedName: function() {
      return this.name.charAt(0).toUpperCase() + this.name.slice(1);
    }
  },

  route: {
    path: '/sample/:name',
    data: function() {
      return {
        name: this.params.name,
        names: ['Johan', 'John', 'Paul', 'Ringo']
      };
    }
  }
};
