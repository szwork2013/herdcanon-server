module.exports = function(app) {
    "use strict";

    var Post = require('../model').Post,

        makeNewPost = function(req, res, next) {
            res.locals.post = new Post({
                user_id: req.user._id
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
                    post.populateUserData(function(err) {
                        if (err) return next(err);

                        res.locals.post = post;
                        next();
                    });
                });
            }
            else {
                res.status('400').send('Missing post slug');
            }
        };
};