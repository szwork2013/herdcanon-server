module.exports = function(schema, options) {
    if (options == null) {
        options = {};
    }
    schema.add({
        modified: Date,
        created: {
            type: Date,
            "default": Date.now
        }
    });
    schema.index({
        created: -1
    });
    if (options.index != null) {
        schema.index({
            modified: options.index
        }, {
            sparse: true
        });
    }
    return schema.pre('save', function(done) {
        this.modified = Date.now();
        return done();
    });
};

