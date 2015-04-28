module.exports = function(app) {
    "use strict";

    var validator = require('validator'),
        redis = require('redis').createClient(process.env.REDIS_PORT || 6379),
        Post = require('../model').Post,

        cleanUpPost = function (post) {
            return {
                slug: post.slug,
                title: post.title,
                content: post.content,
                owner: {
                    name: post._owner.name,
                    slug: post._owner.slug
                },
                created: post.created.toISOString(),
                up: post.up,
                down: post.down,
                average: post.average,
                spam: post.spam,
                tags: post.tags
            };
        },

        makeNewPost = function(req, res, next) {
            res.locals.post = new Post({
                _owner: req.user._id
            });
            next();
        },
        loadPost = function(req, res, next) {
            var slug = req.params.slug;
            if (slug && slug.length > 0) {
                Post.findBySlug(slug, function(err, post) {
                    if (err) return next(err);
                    if (!post) {
                        res.status('404').send('Not Found');
                        return;
                    }
                    post.populate('_owner', function(err, post) {
                        if (err) return next(err);

                        req.post = post;
                        next();
                    });
                });
            }
            else {
                res.status('400').send('Missing post slug');
            }
        },

        loadPostsCount = function (req, res, next) {
            Post.count(function (err, cnt) {
                if(err) return next(err);
                req.postsCount = cnt;
                return next();
            });
        },

        loadPosts = function (req, res, next) {
            var page = req.query.page || 0,
                limit = req.query.limit || 25,
                subset = req.query.subset || 'recent';
            req.page = page;
            req.limit = limit;
            req.subset = subset;

            var query = Post.find();
            if(subset === 'popular') {
                query.sort('average');
            } else if(subset === 'best') {
                query.sort('up');
            } else {
                query.sort('-created');
            }

            query
                .limit(limit)
                .skip(page * limit)
                .populate('_owner', '_id name _slugs')
                .exec(function (err, posts) {
                if(err) return next(err);
                req.posts = posts;
                next();
            });
        },

        validatePost = function (req, res, next) {
            req.checkBody('title', 'Invalid Title').notEmpty().isLength(5, 50);
            req.checkBody('content', 'Invalid Content').notEmpty().isLength(0, 2500);

            req.sanitize('title').trim().stripLow().escape();
            req.sanitize('content').trim().stripLow().escape();

            var errors = req.validateErrors();

            if(errors) {
                res.send(errors);
                return;
            }

            var tags = req.body.tags;

            tags = (typeof tags === 'string') ? (tags.split(',').first(5)) : [];
            tags = tags.map(function (t) { return t.trim().toLowerCase(); });

            if(req.post) {
                post.content = req.body.content;
                post.title = req.body.title;
                post.tags = tags;
                next();
            } else {
                throw "Post request variable missing";
            }
        },

        savePost = function (req, res, next) {
            req.post.save(next);
        },

        aclPost = function (req, res, next) {
            var post = req.post;
            if(post._owner._id === req.user._id || req.user.role === 'admin' || req.user.role === 'moderator') {
                next();
            } else {
                res.status(403).send({error: 'no access to this post'});
            }
        },

        deletePost = function (req, res, next) {
            var post = req.post;
            post.remove(function (err) {
                if(err) return next(err);
                res.send({success:true});
            });
        },

        checkForLock = function (req, res, next) {
            redis.get('user:lock:' + req.user.id, function (err, lock) {
                redis.setex('user:lock:' + req.user.id, 5*60, 1);
                if(lock) {
                    res.send(401).send({error: 'lock active'});
                } else {
                    next();
                }
            });
        },

        reindexTags = function (req, res, next) {
            var map = function () {
                if(this.tags) {
                    for(var i = 0; i < this.tags.length; i++) {
                        emit(this.tags[i], 1);
                    }
                }
            };

            var reduce = function (previous, current) {
                var count = 0;
                for(var i = 0; i < current.length; i++) {
                    count += current[i];
                }
                return count;
            };

            var options = {
                map: map,
                reduce: reduce,
                out: 'tags'
            };

            Post.mapReduce(options, function (err, results) {
                if(err) console.log(err);
            });

            next();
        };

    app.get('/posts', loadPostsCount, loadPosts, function (req, res) {
        res.send(req.posts.map(cleanUpPost));
    });

    app.post('/posts', app.oauth.authorise(), makeNewPost, validatePost, checkForLock, savePost, reindexTags, function (req, res) {
        res.send({success: true});
    });

    app.get('/post/:slug', loadPost, function (req, res) {
        res.send(cleanUpPost(req.post));
    });

    app.post('/post/:slug', app.oauth.authorise(), loadPost, aclPost, validatePost, savePost, reindexTags, function (req, res) {
        res.send({success: true});
    });

    app.delete('/post/:slug', app.oauth.authorise(), loadPost, aclPost, deletePost, reindexTags, function (req, res) {
        res.send({success: true});
    });
};
