TemplateHelpers = {

  enumerate: function(arr, limit, oxfordComma) {

    if(arr) {

      if(limit instanceof Spacebars.kw) {
        var options = limit,
            limit = options.hash.limit,
            oxfordComma = options.hash.oxfordComma;
      }

      oxfordComma = oxfordComma === undefined ? true : oxfordComma;
      limit = limit === undefined ? -1 : limit;

      if(arr.length === 1 || limit === 1) {
        return arr[0];
      }

      if(limit !== -1) {
        arr = arr.slice(0, limit);
      }

      var length = arr.length,
          last = arr.pop(),
          suffix = ' and ';

      if(oxfordComma === true
        || (typeof oxfordComma === 'number' && length >= oxfordComma)) {
        suffix = ', ' + suffix;
      }

      return arr.join(', ') + suffix + last;
    }
  }

};
