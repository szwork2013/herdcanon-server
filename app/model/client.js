module.exports = (function () {
    var mongoose = require('mongoose'),
        plugins = require('./plugin'),
        Schema = mongoose.Schema,

        ClientSchema = new Schema({
            _id: {
                type: String,
                required: true,
                lowercase: true,
                trim: true
            },
            secret: {
                type: String,
                required: true
            }
        });

    ClientSchema.plugin(plugins.modifiedPlugin);

    ClientSchema.pre('save', function (done) {
        if(!this.secret) {
            var self = this;
            require('crypto').randomBytes(48, function(ex, buf) {
                self.secret = buf.toString('hex');
                done();
            });
        } else {
            done();
        }
    });

    return ClientSchema;
}());
