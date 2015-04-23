module.exports = (function () {
    var mongoose = require('mongoose'),
        bcrypt = require('bcrypt'),
        plugins = require('./plugin'),
        BCRYPT_ROUNDS = 12,
        Schema = mongoose.Schema,

        UserSchema = new Schema({
            email: {
                type: String,
                required: true,
                lowercase: true,
                trim: true
            },
            password: {
                type: String,
                required: true
            },
            name: {
                type: String,
                trim: true,
                required: true
            },
            role: {
                type: String,
                'default': 'user',
                trim: true,
                lowercase: true,
                'enum': ['user', 'admin', 'moderator']
            }
        });

    UserSchema.index('email', { unique: 1 });
    UserSchema.index('name', { unique: 1 });
    UserSchema.index('role');

    UserSchema.plugin(plugins.slugifyPlugin, { model: 'User' });
    UserSchema.plugin(plugins.modifiedPlugin);

    UserSchema.virtual('username').get(function () {
        return this.email;
    });

    UserSchema.virtual('username').set(function (name) {
        this.email = name;
    });

    UserSchema.statics.findByUsername = function (username, done) {
        return this.findOne({email: username}, done);
    };

    UserSchema.statics.register = function (email, password, name, done) {
        var user = new (mongoose.model('User'));
        user.email = email;
        user.password = password;
        user.name = name;

        user.save(done);
    };

    UserSchema.methods.validatePassword = function (password, done) {
        bcrypt.compare(password, this.password, function (err, res) {
            if (err) {
                done(err);
            } else {
                done(null, !!res);
            }
        });
    };

    UserSchema.pre('save', function (done) {
        if(this.isModified('password')) {
            var self = this;
            bcrypt.genSalt(BCRYPT_ROUNDS, function (err, salt) {
                if(err) return done(err);
                bcrypt.hash(self.password, salt, function (err, hash) {
                    self.password = hash;
                    done();
                });
            });
        } else {
            done();
        }
    });

    return UserSchema;
}());
