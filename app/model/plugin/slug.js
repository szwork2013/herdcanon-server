var mongoose,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

mongoose = require('mongoose');

module.exports = function(schema, options) {
  var field, mkslug, model, modelName, reserved;
  if (options == null) {
    options = {};
  }
  field = options.field || 'name';
  reserved = options.reserved || ['new', 'edit'];
  modelName = options.model;
  model = null;
  mkslug = function(name) {
    if (options.slugify && typeof options.slugify === 'function') {
      return slugify(name);
    } else {
      return name.parameterize();
    }
  };
  schema.add({
    _slugs: [String]
  });
  schema.index({
    _slugs: 1
  }, {
    unique: true,
    sparse: true
  });
  schema.pre('save', function(done) {
    var slug;
    slug = mkslug(this[field]);
    if (__indexOf.call(this._slugs, slug) >= 0) {
      return done();
    } else {
      if (!model) {
        model = mongoose.model(modelName);
      }
      if (!model) {
        throw new Error('Modelname is required!');
      }
      return model.count({
        _slugs: new RegExp("^" + slug)
      }, (function(_this) {
        return function(err, cnt) {
          if (cnt > 0) {
            slug += "-" + cnt;
          }
          if (_this._slugs) {
            _this._slugs.unshift(slug);
          } else {
            _this._slugs = [slug];
          }
          return done();
        };
      })(this));
    }
  });
  (schema.virtual('slug')).get(function() {
    return this._slugs[0];
  });
  return schema.statics.findBySlug = function(slug, done) {
    return this.findOne({
      _slugs: slug
    }, done);
  };
};
