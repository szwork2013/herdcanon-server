module.exports = function (app) {
    "use strict";

    var User = require('../model').User;

    app.post('/users', function (req, res) {
        req.checkBody('email', 'Invalid e-Mail').notEmpty().isEmail();
        req.checkBody('password', 'Invalid Password').notEmpty().isLength(6);
        req.checkBody('name', 'Invalid name').notEmpty().isLength(4);

        var errors = req.validationErrors();
        if(errors) {
            res.status(400).send(errors);
        } else {
            var email = req.body.email,
                password = req.body.password,
                name = req.body.name;

            User.register(email, password, name, function (err, user) {
                if(err) {
                    if(err.code === 11000) {
                        res.status(400).send({error: 'Name or email already exist'});
                    } else {
                        res.status(500).send(err);
                    }
                } else {
                    res.send({success:true});
                }
            });
        }
    });
};
