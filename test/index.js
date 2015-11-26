'use strict';

const Code = require('code');
const Hoek = require('hoek');
const Lab = require('lab');
const Mongo = require('../lib/index.js');
const MongoClient = require('mongodb').MongoClient;
const Wadofgum = require('wadofgum');
const Validation = require('wadofgum-json-schema');
const ZSchema = require('z-schema');
const Validator = new ZSchema();

// Fixtures
const Recs = require('./fixtures/recs.js');
const UserSchema = require('./fixtures/userSchema.js');

// Set-up lab
const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;
const before = lab.before;
const beforeEach = lab.beforeEach;
const after = lab.after;

describe('Validation', () => {

    let testDb;
    before((done) => {

        const url = 'mongodb://localhost:27017/wadofgum_db';
        MongoClient.connect(url, (err, db) => {

            expect(err).to.not.exist();
            testDb = db;
            done();
        });
    });

    beforeEach((done) => {

        Recs.forEach((rec) => delete rec._id);
        done();
    });

    after((done) => {

        testDb.close(() => {

            testDb = null;
            done();
        });
    });

    it('should load from a mixin', (done) => {

        class User extends Wadofgum.mixin(Mongo) {};
        expect(User).to.exist();
        expect(User.capabilities.has('mongodb')).to.equal(true);
        done();

    });

    it('should assert if validation mixin is not defined', (done) => {

        class User extends Wadofgum.mixin(Mongo) {};
        expect(() => {

            User.db = testDb;
        }).to.throw(Error);
        done();

    });


    it('should set db object to model class', (done) => {

        class User extends Wadofgum.mixin(Mongo, Validation) {};
        User.schema = UserSchema;
        User.db = testDb;
        expect(User.meta.get('db')).to.be.an.object();
        expect(User.type).to.equal('User');
        done();

    });


    it('should set db object to model class', (done) => {

        class User extends Wadofgum.mixin(Mongo, Validation) {};
        User.schema = UserSchema;
        User.validator = Validator;
        expect(User.meta.has('schema')).to.equal(true);
        expect(User.meta.has('metaSchema')).to.equal(true);
        expect(User.meta.has('validator')).to.equal(true);
        done();

    });

    it('should expose a save method on the instance of model class object', (done) => {

        class User extends Wadofgum.mixin(Validation, Mongo) {};
        User.schema = UserSchema;
        User.db = testDb;
        User.validator = Validator;
        const user = new User();
        user.save((err, doc) => {

            expect(err).to.exist();
            expect(doc).to.not.exist();
            User.schema = UserSchema;
            const validUser = new User({
                _id: '563ce539918409541f6b24af',
                person: {
                    name: 'John',
                    age: 50,
                    dateOfBirth: '05-10-1975'
                }

            });
            validUser.save((err, docA) => {

                expect(err).to.exist();
                expect(docA).to.not.exist();

                validUser.person.dateOfBirth = '1975-10-05';
                validUser.save({ w: 1 }, (err, docB) => {

                    expect(err).to.not.exist();
                    expect(docB.ops[0]).to.exist();
                    expect(docB.result.n).to.be.above(0);
                    done();
                });
            });
        });
    });

    it('should generate an id on save method on the instance of model class object', (done) => {

        class User extends Wadofgum.mixin(Validation, Mongo) {};
        const ridsSchema = Hoek.clone(UserSchema);
        ridsSchema.metaSchema.rids = ['name', 'age'];
        User.schema = ridsSchema;
        User.db = testDb;
        User.validator = Validator;
        const user = new User({
            person: {
                name: 'Fred',
                age: 50,
                dateOfBirth: '1975-05-10'
            }
        });
        user.save((err, doc) => {

            expect(err).to.exist();
            expect(doc).to.not.exist();
            ridsSchema.metaSchema.rids = ['person.name', 'person.age'];
            User.schema = ridsSchema;
            const validUser = new User({
                person: {
                    name: 'John',
                    age: 50,
                    dateOfBirth: '05-10-1975'
                }

            });
            validUser.save((err, docA) => {

                expect(err).to.exist();
                expect(docA).to.not.exist();

                validUser.person.dateOfBirth = '1975-10-05';
                validUser.save({ w: 1 }, (err, docB) => {

                    expect(err).to.not.exist();
                    expect(docB.ops[0]).to.exist();
                    expect(docB.result.n).to.be.above(0);
                    done();
                });
            });
        });
    });

    it('should expose a findOne method on the instance of model class object', (done) => {

        class User extends Wadofgum.mixin(Mongo, Validation) {};
        User.schema = UserSchema;
        User.db = testDb;
        const userFind = new User({
            _id: '563ce539918409541f6b24af'
        });

        userFind.findOne((err, doc) => {

            expect(err).to.not.exist();
            expect(doc._id).to.equal('563ce539918409541f6b24af');
            expect(doc.person.name).to.equal('John');

            userFind.findOne({ 'person.name': 0 }, (err, docA) => {

                expect(err).to.not.exist();
                expect(doc._id).to.equal('563ce539918409541f6b24af');
                expect(docA.person.name).to.not.exist();
                done();
            });
        });
    });

    it('should expose a updateOne method on the instance of model class object', (done) => {

        class User extends Wadofgum.mixin(Validation, Mongo) {};
        User.schema = UserSchema;
        User.db = testDb;
        const user = new User({
            _id: '563ce539918409541f6b24af',
            person: {
                name: 'Frank',
                age: 35,
                dateOfBirth: '05-10-1981'
            }
        });
        user.updateOne((err, doc) => {

            expect(err).to.not.exist();
            expect(doc.result.nModified).to.equal(1);
            const newUser = new User({
                _id: '563ce49d227e258022be8fed',
                person: {
                    name: 'Frank',
                    age: 105,
                    dateOfBirth: '05-10-1981'
                }
            });
            newUser.updateOne({ upsert: true }, (errA, docA) => {

                expect(errA).to.not.exist();
                expect(docA.result.nModified).to.equal(0);
                done();

            });

        });
    });

    it('should expose a replaceOne method on the instance of model class object', (done) => {

        class User extends Wadofgum.mixin(Validation, Mongo) {};
        User.schema = UserSchema;
        User.db = testDb;
        User.validator = Validator;
        const user = new User({
            _id: '563ce539918409541f6b24af',
            person: {
                name: 'John',
                age: 100,
                dateOfBirth: '1981-10-05'
            }
        });
        user.replaceOne((err, doc) => {

            expect(err).to.not.exist();
            expect(doc.result.nModified).to.equal(1);
            expect(doc.ops[0]._id).to.equal('563ce539918409541f6b24af');
            expect(doc.ops[0].person.name).to.equal('John');
            expect(doc.ops[0].person.age).to.equal(100);
            expect(doc.ops[0].person.dateOfBirth).to.equal('1981-10-05');

            const newUser = new User({
                _id: '563ce49d227e258022be8fed',
                person: {
                    name: 'Frank',
                    age: 105,
                    dateOfBirth: '05-10-1981'
                }
            });
            newUser.replaceOne({ bypassDocumentValidation: true }, (errA, docA) => {

                expect(errA).to.exist();
                expect(docA).to.not.exist();
                done();
            });
        });
    });

    it('should expose a deleteOne method on the instance of model class object', (done) => {

        class User extends Wadofgum.mixin(Validation, Mongo) {};
        User.schema = UserSchema;
        User.db = testDb;
        const user = new User({
            _id: '563ce539918409541f6b24af'
        });
        user.deleteOne({ bypassDocumentValidation: true }, (err, res) => {

            expect(err).to.not.exist();
            expect(res.result.n).to.equal(1);
            expect(user._id).to.equal('563ce539918409541f6b24af');

            const nextUser = new User({
                _id: '663ce539918409541f6b24af'
            });
            nextUser.deleteOne((err, resA) => {

                expect(err).to.not.exist();
                expect(resA.result.n).to.equal(1);
                expect(nextUser._id).to.equal('663ce539918409541f6b24af');
                done();
            });
        });
    });

    it('should expose a count method on the model object', (done) => {

        class User extends Wadofgum.mixin(Mongo, Validation) {};
        User.schema = UserSchema;
        User.db = testDb;
        User.count((err, count) => {

            expect(err).to.not.exist();
            expect(count).to.be.a.number().and.equal(3);
            done();
        });
    });

    it('should expose a distinct method on the model class object', (done) => {

        class User extends Wadofgum.mixin(Mongo, Validation) {};
        User.schema = UserSchema;
        User.db = testDb;
        User.distinct('person.name', (err, docs) => {

            expect(err).to.not.exist();
            expect(docs).to.include(['Michael Jackson', 'Frank', 'John']);
            expect(docs).to.be.an.array().and.to.have.length(3);
            done();
        });
    });

    it('should expose a find method on the model class object', (done) => {

        class User extends Wadofgum.mixin(Mongo, Validation) {};
        User.schema = UserSchema;
        User.db = testDb;
        User.find((err, docs) => {

            expect(err).to.not.exist();
            expect(docs).to.be.an.array().and.to.have.length(3);
            done();
        });
    });

    it('should expose a insertMany method on the model class object', (done) => {

        class User extends Wadofgum.mixin(Validation, Mongo) {};
        User.schema = UserSchema;
        User.db = testDb;
        User.validator = Validator;
        User.insertMany(Recs, (err, res) => {

            expect(err).to.not.exist();
            expect(res.insertedCount).to.equal(3);
            expect(res.ops[0].person.name).to.be.a.string();
            expect(res.ops[0].person.age).to.be.a.number();
            User.insertMany(Recs, (err, resA) => {

                expect(err).to.exist();
                expect(err.details[0].code).to.equal('INVALID_TYPE');
                expect(resA).to.not.exist();
                done();
            });
        });
    });

    it('should insertMany and created custom ids from rids on the model class object', (done) => {

        class User extends Wadofgum.mixin(Validation, Mongo) {};
        const ridsSchema = Hoek.clone(UserSchema);
        ridsSchema.metaSchema.rids = ['name', 'age'];
        User.schema = ridsSchema;
        User.db = testDb;
        User.validator = Validator;
        User.insertMany(Recs, (err, res) => {

            expect(err).to.exist();
            expect(err.details).to.include(['name', 'age']);
            ridsSchema.metaSchema.rids = ['person.name', 'person.dateOfBirth'];
            User.schema = ridsSchema;

            User.insertMany(Recs, { wtimeout: 5000 }, (err, resA) => {

                expect(err).to.not.exist();
                expect(resA.ops).to.have.length(3);
                expect(resA.insertedIds).to.include(['sam::1994-12-25', 'frank::1964-12-25', 'kathy::1974-12-25']);

                Recs[0].person.age = null;
                User.insertMany(Recs, { wtimeout: 5000 }, (err, resB) => {

                    expect(err).to.exist();
                    expect(err.details[0]).to.be.an.object();
                    expect(err.details[0].code).to.equal('INVALID_TYPE');
                    done();
                });
            });
        });
    });

    it('should expose a deleteMany method on the model class object', (done) => {

        class User extends Wadofgum.mixin(Validation, Mongo) {};
        User.schema = UserSchema;
        User.db = testDb;
        User.deleteMany({}, (err, res) => {

            expect(err).to.not.exist();
            expect(res.deletedCount).to.be.above(0);
            done();
        });
    });

});
