// controllers/auth-controller.js

const db = require('../lib/db.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');

const userMiddleware = require('../middleware/auth-middleware.js');

module.exports = {
    registerUser: (req, res, next) => {
        const role = req.body.role || 'user';
        db.query(
            'SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
            [req.body.username, req.body.email],
            (err, result) => {
                // handle query error
                if (err) {
                    return res.status(500).send({
                        message: err,
                    });
                }
                // check if username or email already exists
                if (result && result.length) {
                    return res.status(409).send({
                        message: 'Username or email already in use!',
                    });
                } else {
                    // username or email not in use
                    bcrypt.hash(req.body.password, 10, (err, hash) => {
                        if (err) {
                            return res.status(500).send({
                                message: err,
                            });
                        } else {
                            db.query(
                                'INSERT INTO users (id, username, email, password, phone, role, name, registered) VALUES (?, ?, ?, ?, ?, ?, ?, now());',
                                [uuid.v4(), req.body.username, req.body.email, hash, req.body.phone, role, req.body.name],
                                (err, result) => {
                                    if (err) {
                                        return res.status(400).send({
                                            message: err,
                                        });
                                    }
                                    return res.status(201).send({
                                        message: 'Registered!',
                                    });
                                }
                            );
                        }
                    });
                }
            }
        );
    },

    registerCollector: (req, res, next) => {
        const role = req.body.role || 'collector';
        db.query(
            'SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
            [req.body.username, req.body.email],
            (err, result) => {
                // handle query error
                if (err) {
                    return res.status(500).send({
                        message: err,
                    });
                }
                // check if username or email already exists
                if (result && result.length) {
                    return res.status(409).send({
                        message: 'Username or email already in use!',
                    });
                } else {
                    // username or email not in use
                    bcrypt.hash(req.body.password, 10, (err, hash) => {
                        if (err) {
                            return res.status(500).send({
                                message: err,
                            });
                        } else {
                            const newUserId = uuid.v4();
                            db.query(
                                'INSERT INTO users (id, username, email, password, phone, role, name, registered) VALUES (?, ?, ?, ?, ?, ?, ?, now());',
                                [newUserId, req.body.username, req.body.email, hash, req.body.phone, role, req.body.name],
                                (err, result) => {
                                    if (err) {
                                        return res.status(400).send({
                                            message: err,
                                        });
                                    }

                                    db.query(
                                        'INSERT INTO collectors (user_id, current_latitude, current_longitude, drop_latitude, drop_longitude) VALUES (?, ?, ?, ?, ?)',
                                        [newUserId, 0, 0, 0, 0], // Ganti value1 dan value2 dengan nilai yang sesuai
                                        (orderErr, orderResult) => {
                                            if (orderErr) {
                                                return res.status(400).send({
                                                    message: orderErr,
                                                });
                                            }
                                            return res.status(201).send({
                                                message: 'Registered and order placed!',
                                            });
                                        }
                                    );

                                    return res.status(201).send({
                                        message: 'Registered!',
                                    });
                                }
                            );
                        }
                    });
                }
            }
        );
    },

    loginUser: (req, res, next) => {
        db.query(
            `
            SELECT users.*, collectors.ID AS collector_ID, collectors.drop_latitude, collectors.drop_longitude,
            collectors.current_latitude, collectors.current_longitude
            FROM users
            LEFT JOIN collectors ON users.ID = collectors.user_ID
            WHERE users.username = ? OR users.email = ?
            `,
            [req.body.username, req.body.email],
            (err, result) => {
                // handle query error
                if (err) {
                    return res.status(400).send({
                        message: err,
                    });
                }
                // check if username or email not found
                if (!result.length) {
                    return res.status(400).send({
                        message: 'Username or email not found!',
                    });
                }
                bcrypt.compare(
                    req.body.password,
                    result[0]['password'],
                    (bErr, bResult) => {
                        // handle bcrypt compare error
                        if (bErr) {
                            return res.status(400).send({
                                message: 'Invalid credentials!',
                            });
                        }
                        if (bResult) {
                            // password match
                            const token = jwt.sign(
                                {
                                    username: result[0].username,
                                    userId: result[0].id,
                                    role: result[0].role,
                                    collectorId: result[0].collector_ID, // Include collector ID in the payload
                                    drop_latitude: result[0].drop_latitude,
                                    drop_longitude: result[0].drop_longitude,
                                    current_latitude: result[0].current_latitude,
                                    current_longitude: result[0].current_longitude, 
                                },
                                'SECRETKEY',
                                { expiresIn: '7d' }
                            );
                            db.query(
                                `UPDATE users SET last_login = now() WHERE id = ?;`,
                                [result[0].id],
                                (updateErr, updateResult) => {
                                    // handle update query error
                                    if (updateErr) {
                                        return res.status(400).send({
                                            message: updateErr,
                                        });
                                    }
                                    return res.status(200).send({
                                        message: 'Logged in successfully!',
                                        token,
                                        user: result[0],
                                    });
                                }
                            );
                        } else {
                            console.log('Password mismatch:', req.body.password, result[0]['password']);
                            return res.status(400).send({
                                message: 'Invalid password!',
                            });
                        }
                    }
                );
            }
        );
    },

    logoutUser: (req, res, next) => {
        userMiddleware.clearSession(req, res, () => {
            res.status(200).send({ 
                message: 'Logged out successfully!'
            });
        });
    }
};