var Grid, GridStore, ObjectID, mongoose;

mongoose = require('mongoose');

GridStore = mongoose.mongo.GridStore;

Grid = mongoose.mongo.Grid;

ObjectID = mongoose.mongo.BSONPure.ObjectID;

exports.put = function(path, name, options, done) {
    var db, _base;
    db = mongoose.connection.db;
    if (options.metadata == null) {
        options.metadata = {};
    }
    if ((_base = options.metadata).filename == null) {
        _base.filename = name;
    }
    options.content_type = (require('mime')).lookup(path);
    return new GridStore(db, name, "w", options).open(function(err, file) {
        if (err != null) {
            return done(err);
        } else {
            return file.writeFile(path, done);
        }
    });
};

exports.get = function(id, done) {
    var db, store;
    db = mongoose.connection.db;
    id = new ObjectID(id);
    store = new GridStore(db, id, "r", {
        root: "fs"
    });
    return store.open(function(err, store) {
        var _ref;
        if (err != null) {
            return done(err);
        } else {
            if (("" + store.filename) === ("" + store.fileId) && (((_ref = store.metadata) != null ? _ref.filename : void 0) != null)) {
                store.filename = store.metadata.filename;
            }
            return done(null, store);
        }
    });
};

exports["delete"] = function(id, done) {
    var db;
    db = mongoose.connection.db;
    id = new ObjectID(id);
    return new GridStore(db, id, "w").open(function(err, store) {
        if (err != null) {
            return done(err);
        } else {
            return store.unlink(function(err, res) {
                if (done != null) {
                    return done(err);
                }
            });
        }
    });
};
