var Mixed, ObjectId, async, copyFile, fs, gm, gridfs, imageMagick, makeDir, mkdirp, mongoose, path, resizeImg, saveImg, _ref;

gridfs = require('../grid');

mongoose = require('mongoose');

gm = require('gm');

mkdirp = require('mkdirp');

fs = require('fs');

gridfs = require('../grid');

path = require('path');

async = require('async');

_ref = mongoose.Schema.Types, ObjectId = _ref.ObjectId, Mixed = _ref.Mixed;

imageMagick = gm.subClass({
    imageMagick: true
});

makeDir = function(dir, done) {
    return fs.exists(dir, function(e) {
        if (e) {
            return done(null);
        } else {
            return mkdirp(dir, function(err) {
                return done(err);
            });
        }
    });
};

resizeImg = function(filepath, prefix, width, height, done) {
    var filename, img;
    filename = path.join(path.dirname(filepath), prefix + "-" + (path.basename(filepath, path.extname(filepath))) + ".png");
    img = imageMagick(filepath);
    if (!(width === 0 || height === 0)) {
        img.resize(width, height);
    }
    return img.autoOrient().quality(90).noProfile().write(filename, function(err) {
        if (err != null) {
            return done(err);
        } else {
            return done(null, filename);
        }
    });
};

saveImg = function(filepath, done) {
    var name;
    name = path.basename(filepath);
    return gridfs.put(filepath, name, {}, function(err, result) {
        if (err != null) {
            return done(err);
        } else {
            fs.unlink(filepath);
            return done(err, result.fileId);
        }
    });
};

copyFile = function(src, dest, done) {
    return fs.stat(src, function(err, stat) {
        var _is, _os;
        if (err != null) {
            return done(err);
        } else {
            _is = fs.createReadStream(src);
            _is.on('error', function(err) {
                return done(err);
            });
            _os = fs.createWriteStream(dest);
            _is.pipe(_os);
            _os.on('close', function() {
                return fs.utimes(dest, stat.atime, stat.mtime, done);
            });
            return _os.on('error', function(err) {
                return done(err);
            });
        }
    });
};

module.exports = function(schema, options) {
    var defaultImg, field, generateUrl, idField, obj, sizes;
    if (options == null) {
        options = {};
    }
    field = options.field || 'image';
    generateUrl = options.getUrl || function(size, id) {
        return "/image/" + field + "/" + id + "/" + size;
    };
    defaultImg = options.defaultImg || '';
    idField = options.idField || '_id';
    sizes = options.sizes || {
        original: {
            width: 0,
            height: 0
        }
    };
    obj = {};
    obj[field] = Mixed;
    schema.add(obj);
    schema.methods['set' + field.camelize(true)] = function(filename, done) {
        var fns, s;
        fns = (function() {
            var _results;
            _results = [];
            for (s in sizes) {
                _results.push((function(s) {
                    var size;
                    size = sizes[s];
                    return function(cb) {
                        return resizeImg(filename, s, size.width, size.height, function(err, file) {
                            if (err != null) {
                                return cb(err);
                            } else {
                                return saveImg(file, function(err, id) {
                                    return cb(err, {
                                        id: id,
                                        name: s
                                    });
                                });
                            }
                        });
                    };
                })(s));
            }
            return _results;
        })();
        return async.parallel(fns, (function(_this) {
            return function(err, results) {
                var img, n, old_file, r, _i, _len;
                if (err != null) {
                    return done(err);
                } else {
                    img = {};
                    for (_i = 0, _len = results.length; _i < _len; _i++) {
                        r = results[_i];
                        img[r.name] = r.id;
                    }
                    console.log(img);
                    old_file = _this[field];
                    if ((old_file != null) && typeof old_file === 'object') {
                        for (s in old_file) {
                            n = '' + old_file[s];
                            if (!(n.length !== 24 || n.length !== 12)) {
                                gridfs["delete"](n);
                            }
                        }
                    }
                    _this[field] = img;
                    return done();
                }
            };
        })(this));
    };
    schema.methods["get" + (field.camelize(true)) + "Url"] = function(size) {
        var _ref1;
        if (size == null) {
            size = '';
        }
        if (!this[field] || ((_ref1 = typeof this[field]) !== 'object' && _ref1 !== 'string')) {
            return defaultImg;
        } else if (typeof this[field] === 'string') {
            return this[field];
        } else {
            obj = this[field];
            if (obj[size]) {
                return generateUrl(size, this[idField]);
            } else {
                return defaultImg;
            }
        }
    };
    return schema.methods["get" + (field.camelize(true)) + "Data"] = function(size, done) {
        var fid;
        if (size == null) {
            size = '';
        }
        if (!this[field] || typeof this[field] !== 'object' || (this[field][size] == null)) {
            return done({
                message: 'No valid input'
            });
        } else {
            fid = '' + this[field][size];
            return gridfs.get(fid, done);
        }
    };
};
