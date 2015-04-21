module.exports = function(schema, options) {
    "use strict";
    
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
    
    schema.index({ created: -1 });
    
    if (options.index != null) {
        schema.index({
            modified: options.index
        }, {
            sparse: true
        });
    }
    
    schema.pre('save', function(done) {
        this.modified = Date.now();
        done();
    });
};

