/* global describe, beforeEach, afterEach, it, before, after */
/* jshint expr: true*/
(function () {
    "use strict";

    var MONGO_URL = 'mongodb://localhost/herdcanon-test',
        mongoose = require('mongoose'),
        db = require('../app/model'),
        User = db.User;

    describe('Users', function () {
        var currentUser = null;

        before(function (done) {
            mongoose.connect(MONGO_URL, done);
        });

        after(function (done) {
            mongoose.disconnect(done);
        });

        beforeEach(function (done) {
            User.register('testie@test.com', 'password', 'testie mctest', function (err, doc) {
                if(err) return done(err);
                currentUser = doc;
                done();
            });
        });

        afterEach(function (done) {
            User.remove({}, done);
        });

        it('registers a new user', function (done) {
            User.register('laura@test.com', 'password2', 'laura mctest', function (err, doc) {
                (err === null).should.be.ok;
                doc.should.be.ok;
                doc.password.should.not.equal('password2');
                doc.email.should.equal('laura@test.com');
                doc.name.should.equal('laura mctest');
                done();
            });
        });

        it('finds a user by name', function (done) {
            User.findByUsername(currentUser.username, function (err, doc) {
                (err === null).should.be.ok;
                doc.should.be.ok;
                doc.email.should.equal(currentUser.email);
                done();
            });
        });

        it('verifies a user\'s password', function (done) {
            currentUser.validatePassword('password', function (err, verified) {
                (err === null).should.be.ok;
                verified.should.be.ok;
                done();
            });
        });

        it('changes name but not password', function (done) {
            var oldPassword;
            oldPassword = currentUser.password;
            currentUser.name = 'testiemcsupertest';
            currentUser.save(function (err) {
                (err === null).should.be.ok;
                User.findById(currentUser.id, function (err, doc) {
                    (err === null).should.be.ok;
                    doc.should.be.ok;
                    doc.name.should.equal('testiemcsupertest');
                    doc.password.should.equal(oldPassword);
                    done();
                });
            });
        });

        it('changes password', function (done) {
            var oldPassword;
            oldPassword = currentUser.password;
            currentUser.password = 'password2';
            currentUser.save(function (err) {
                (err === null).should.be.ok;
                User.findById(currentUser.id, function (err, doc) {
                    (err === null).should.be.ok;
                    doc.should.be.ok;
                    doc.password.should.not.equal('password2');
                    doc.password.should.not.equal(oldPassword);
                    doc.validatePassword('password', function (err, v) {
                        (err === null).should.be.ok;
                        v.should.not.be.ok;
                        doc.validatePassword('password2', function (err, v) {
                            (err === null).should.be.ok;
                            v.should.be.ok;
                            done();
                        });
                    });
                });
            });
        });

        it('fails to register a name twice', function (done) {
            User.register('testie@test.com', 'password', 'testy mctest', function (err) {
                (err === null).should.not.be.ok;
                err.code.should.equal(11000);
                done();
            });
        });

    });
}());
