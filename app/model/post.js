module.exports = (function() {
    "use strict";

    var mongoose = require('mongoose'),
        async = require('async'),
        plugins = require('./plugin'),
        slugifyPlugin = plugins.slugifyPlugin,
        modifiedPlugin = plugins.modifiedPlugin,
        textSearchPlugin = require('mongoose-text-search'),
        ObjectId = mongoose.Schema.Types.ObjectId,
        Mixed = mongoose.Schema.Types.Mixed,

        voteMatch = function(user_id) {
            return function(v) {
                return v.user_id === user_id;
            };
        },

        CommentSchema = new mongoose.Schema({
            user_id: {
                type: ObjectId,
                ref: 'User',
                required: true
            },
            posted: {
                type: Date,
                "default": Date.now
            },
            content: {
                type: String,
                trim: true,
                required: true
            }
        }),

        VoteSchema = new mongoose.Schema({
            user_id: {
                type: ObjectId,
                ref: 'User',
                required: true
            },
            voted: {
                type: Date,
                "default": Date.now
            },
            val: {
                type: Number,
                "default": 1
            }
        }),

        PostSchema = new mongoose.Schema({
            user_id: {
                type: ObjectId,
                ref: 'User',
                required: true
            },
            title: {
                type: String,
                trim: true,
                required: true
            },
            content: {
                type: String,
                trim: true
            },
            votes: [VoteSchema],
            comments: [CommentSchema],
            tags: [String],
            spam: {
                type: Boolean,
                "default": false
            },
            sum: {
                type: Number,
                "default": 0
            },
            average: {
                type: Number,
                "default": 0
            },
            down: {
                type: Number,
                "default": 0
            },
            up: {
                type: Number,
                "default": 0
            }
        });

    PostSchema.index('user_id');
    PostSchema.index('votes.user_id');
    PostSchema.index('comments.user_id');
    PostSchema.index('sum');
    PostSchema.index('average');
    PostSchema.index('up');
    PostSchema.index('down');
    PostSchema.index('tags', {
        sparse: true
    });
    PostSchema.index('spam');
    PostSchema.index({
        title: 'text',
        tags: 'text',
        content: 'text'
    }, {
        name: 'TextIndex',
        weights: {
            title: 10,
            tags: 7,
            content: 5
        }
    });

    PostSchema.plugin(slugifyPlugin, {
        field: 'title',
        model: 'Post'
    });
    PostSchema.plugin(modifiedPlugin);
    PostSchema.plugin(textSearchPlugin);

    PostSchema.pre('save', function(done) {
        if (!(this.votes.length > 0)) {
            this.sum = 0;
            this.average = 0;
            this.down = 0;
            this.up = 0;
        }
        else {
            this.sum = this.votes.sum(function(v) {
                return v.val;
            });
            this.average = this.sum / this.votes.length;
            this.down = this.votes.count(function(v) {
                return v.val < 0;
            });
            this.up = this.votes.count(function(v) {
                return v.val > 0;
            });
        }
        return done();
    });

    PostSchema.methods.voteFor = function(user) {
        return this.votes.find(voteMatch(user._id));
    };

    PostSchema.methods.addVote = function(user, value) {
        if (value == null) {
            value = 1;
        }
        this.votes.remove(voteMatch(user._id));
        if (value !== 0) {
            return this.votes.add({
                user_id: user._id,
                val: value,
                voted: Date.now()
            });
        }
    };

    PostSchema.virtual('downvotes').get(function() {
        return this.votes.findAll(function(v) {
            return v.val < 0;
        });
    });

    PostSchema.virtual('upvotes').get(function() {
        return this.votes.findAll(function(v) {
            return v.val > 0;
        });
    });

    PostSchema.methods.populateUserData = function(done) {
        if ((this.user_id != null) && (this.user == null)) {
            return redis.hgetall("user:" + this.user_id, (function(_this) {
                return function(err, user) {
                    if (err) {
                        return done(err);
                    }
                    else {
                        _this.user = user;
                        return done(null, _this);
                    }
                };
            })(this));
        }
        else {
            return done(null, this);
        }
    };

    PostSchema.statics.populatePostsWithUserData = function(posts, done) {
        var iterator;
        iterator = function(post, done) {
            return post.populateUserData(done);
        };
        return async.each(posts, iterator, done);
    };

    return PostSchema;
}());