var mongoose = require( 'mongoose' );
var User = require('../models/user');
var jwt = require('jsonwebtoken'); 
var config = require('../config');

exports.signupListener = function(req, res, next){
    // Check for registration errors
     const name = req.body.name;
     const email = req.body.email;
     const username = req.body.username;
     const password = req.body.password;
     const usertype = 'LIS';

     if (!name || !email || !username || !password) {
         return res.status(201).json({ success: false, message: 'Posted data is not correct or incomplete.'});
     }
 
     User.findOne({ username: username }, function(err, existingUser) {
         if(err){ return res.status(201).json({ success: false, message:'Error processing request '+ err}); }
 
         // If user is not unique, return error
         if (existingUser && existingUser.status != 'STSRJCT') {
             return res.status(201).json({
                 success: false,
                 message: 'Username already exists.'
             });
         }
        // If no error, create account
        User.findOne({ $and:[{email:email.toLowerCase()}, {usertype: usertype}] }, function(err, eUser) {
            if(err){ return res.status(400).json({ success: false, message:'Error processing request '+ err}); }
                    // If user is not unique, return error
            if (eUser && eUser.status != 'STSRJCT') {
                return res.status(201).json({
                    success: false,
                    message: 'Email address is already linked to another user.'
                });
            }
            let oUser = new User({
                name: name,
                email: email.toLowerCase(),
                contactno: '-',
                bankaccno: '-',
                bankname: '-',
                username: username,
                password: password,
                usertype: 'LIS',
                status: 'STSACT',
                balance: 0
            });
        
            oUser.save(function(err, oUser) {
                if(err){ return res.status(201).json({ success: false, message:'Error processing request '+ err}); }
            
                res.status(200).json({
                    success: true,
                    message: 'User created successfully. You can now login as Listener.'
                });
            });
        });
    });
}

exports.login = function(req, res, next){
    const usertype = 'LIS';
    const status = 'STSACT'
    // find the user
    User.findOne({ username: req.body.username, status: status }, function(err, user) {
		if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err}); }

		if (!user) {
            
            User.findOne({ $and:[{email:req.body.username.toLowerCase()}, {usertype: usertype}], status: status }, function(err, eUser) {
                if(err){ return res.status(400).json({ success: false, message:'Error processing request '+ err}); }
                        // If user is not unique, return error
                
                if (eUser && eUser.status != 'STSRJCT') {
                    
                    eUser.comparePassword(req.body.password, function (err, isMatch) {
                        if (isMatch && !err) {
                            var token = jwt.sign({data:eUser}, config.secret, {
                                expiresIn: config.tokenexp});
                            
                            let last_login = eUser.lastlogin;
                            
                            // login success update last login
                            eUser.lastlogin = new Date();
                            
                            
                            eUser.save(function(err) {
                                if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err}); }
        
                                res.status(201).json({
                                    success: true,
                                    message: {'userid': eUser._id, 'username': eUser.username, 'name': eUser.name, 'usertype': eUser.usertype, 'balance': eUser.balance, 'lastlogin': last_login, 'filepath': eUser.photopath},
                                    token: token
                                });
                            });
                        } else {
                            res.status(201).json({ success: false, message: 'Incorrect password credentials.' });
                        }
                    });	

                } else {
                    return res.status(201).json({ success: false, message: 'Incorrect user login credentials.' });
                }
            
            });
		}else if (user) {
            if (user.status == 'STSACT') {
                user.comparePassword(req.body.password, function (err, isMatch) {
                    if (isMatch && !err) {
                        var token = jwt.sign({data:user}, config.secret, {
                            expiresIn: config.tokenexp});
                        
                        let last_login = user.lastlogin;
                        
                        // login success update last login
                        user.lastlogin = new Date();
                        
                        
                        user.save(function(err) {
                            if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err}); }
    
                            res.status(201).json({
                                success: true,
                                message: {'userid': user._id, 'username': user.username, 'name': user.name, 'usertype': user.usertype, 'balance': user.balance, 'lastlogin': last_login, 'filepath': user.photopath},
                                token: token
                            });
                        });
                    } else {
                        res.status(201).json({ success: false, message: 'Incorrect password credentials.' });
                    }
                });	
    
            } else {
                //console.log('This not active condition.');
                res.status(201).json({ success: false, message: 'Incorrect user account. User is not active yet.' });
            }
        }
	});
}
/*
exports.login = function(req, res, next){
    // find the user
    User.findOne({ username: req.body.username }, function(err, user) {
		if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err}); }

		if (!user) {
			res.status(201).json({ success: false, message: 'Incorrect login credentials.' });
		}else if (user) {
            if (user.status == 'STSACT') {
                user.comparePassword(req.body.password, function (err, isMatch) {
                    if (isMatch && !err) {
                        var token = jwt.sign({data:user}, config.secret, {
                            expiresIn: config.tokenexp});
                        
                        let last_login = user.lastlogin;
                        
                        // login success update last login
                        user.lastlogin = new Date();
                        
                        
                        user.save(function(err) {
                            if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err}); }
    
                            res.status(201).json({
                                success: true,
                                message: {'userid': user._id, 'username': user.username, 'name': user.name, 'usertype': user.usertype, 'balance': user.balance, 'lastlogin': last_login, 'filepath': user.photopath},
                                token: token
                            });
                        });
                    } else {
                        res.status(201).json({ success: false, message: 'Incorrect login credentials.' });
                    }
                });	
    
            } else {
                //console.log('This not active condition.');
                res.status(201).json({ success: false, message: 'Incorrect user account. User is not active yet.' });
            }
        }
	});
}
*/
exports.authenticate = function(req, res, next){
    // check header or url parameters or post parameters for token
	var token = req.body.token || req.query.token || req.headers['authorization'];
    //console.log(token);
	if (token) {
		jwt.verify(token, config.secret, function(err, decoded) {			
			if (err) {
				return res.status(201).json({ success: false, message: 'Authenticate token expired, please login again.', errcode: 'exp-token' });
			} else {
				req.decoded = decoded;	
				next();
			}
		});
	} else {
		return res.status(201).json({ 
			success: false, 
			message: 'Fatal error, Authenticate token not available.',
            		errcode: 'no-token'
		});
	}
}

exports.getuserDetails = function(req, res, next){
    User.find({_id:req.params.id}).exec(function(err, user){
        if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err}); }
        res.status(201).json({
		success: true, 
		data: user });
    });
}

exports.updateUser = function(req, res, next){
    const name = req.body.name;
    const email = req.body.email;
    const contactno = req.body.contactno;
    const bankaccno = req.body.bankaccno;
    const bankcode = req.body.bankcode;
    const bankname = req.body.bankname;
    const userid = req.params.id;
    const usertype = 'LIS';

    if (!name || !email || !userid) {
        return res.status(422).json({ success: false, message: 'Posted data is not correct or incompleted.'});
    } else {
	  User.findById(userid).exec(function(err, user){
		if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
			
		if(user){
            User.findOne({ $and:[{email:email.toLowerCase()}, {usertype: usertype}, {_id:{$ne: userid}}] }, function(err, eUser) {
                if(err){ return res.status(400).json({ success: false, message:'Error processing request '+ err}); }
                        // If user is not unique, return error
                if (eUser && eUser.status != 'STSRJCT') {
                    return res.status(201).json({
                        success: false,
                        message: 'Email address is already linked to another user.'
                    });
                }
                user.name = name;
                user.email = email.toLowerCase();
                user.contactno = contactno;
                user.bankaccno = bankaccno;
                user.bankcode = bankcode;
                user.bankname = bankname;
                user.save(function(err){
                    if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err }); }
                    res.status(200).json({
                        success: true,
                        message: 'User details updated successfully'
                    });
                });
            });
		} else {
            return res.status(201).json({
                success: false,
                message: 'Error finding user data.'
            });
        }
	  });
   }
}

exports.updatePassword = function(req, res, next){
    const userid = req.params.id;
    const oldpassword = req.body.oldpassword;
    const password = req.body.password;

    if (!oldpassword || !password || !userid) {
        return res.status(422).json({ success: false, message: 'Posted data is not correct or incompleted.'});
    } else {
        
	User.findOne({ _id: userid }, function(err, user) {
            if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err}); }
            if (user) {
                user.comparePassword(oldpassword, function (err, isMatch) {
                    if (isMatch && !err) {
                        
                        user.password = password;
                        
                        user.save(function(err) {
                            if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err}); }

                            res.status(201).json({
                                success: true,
                                message: 'Password updated successfully'
                            });
                        });
                    } else {
                        res.status(201).json({ success: false, message: 'Incorrect old password.' });
                    }
                });	
            }
        });
    }
}

exports.checkFbListener = function(req, res, next){
    // Check for registration errors
    const appid = req.params.id;
    const name = req.query.name;
    const email = req.query.email;
    const photopath = req.body.photopath
    const usertype = 'LIS';

     if (!appid || !name || !email) {
         return res.status(201).json({ success: false, code: '000', message: 'Posted data is not correct or incomplete.'});
     }
 
     User.findOne({ username: appid }, function(err, existingUser) {
         if(err){ return res.status(201).json({ success: false, code: '001', message:'Error processing request '+ err}); }
 
         // If user is not unique, return error
         if (existingUser && existingUser.status != 'STSRJCT') {
             return res.status(201).json({
                 success: true,
                 code: '002',
                 message: 'Username already exists.'
             });
         }
        // If no error, create account
        User.findOne({ $and:[{email:email.toLowerCase()}, {usertype: usertype}] }, function(err, eUser) {
            if(err){ return res.status(400).json({ success: false, code: '003', message:'Error processing request '+ err}); }
                    // If user is not unique, return error
            if (eUser && eUser.status != 'STSRJCT') {
                return res.status(201).json({
                    success: false,
                    code: '004',
                    message: 'Email address is already linked to another user.'
                });
            }

            if (photopath) {
                let oUser = new User({
                    name: name,
                    email: email.toLowerCase(),
                    contactno: '-',
                    bankaccno: '-',
                    bankname: '-',
                    username: appid,
                    password: appid,
                    photopath:photopath,
                    photoname:appid,
                    usertype: 'LIS',
                    status: 'STSACT',
                    balance: 0
                });
            
                oUser.save(function(err, oUser) {
                    if(err){ return res.status(201).json({ success: false, code: '005', message:'Error processing request '+ err}); }
                
                    res.status(200).json({
                        success: true,
                        message: 'User created successfully. You can now login as Listener.'
                    });
                });
            } else {
                let oUser = new User({
                    name: name,
                    email: email.toLowerCase(),
                    contactno: '-',
                    bankaccno: '-',
                    bankname: '-',
                    username: appid,
                    password: appid,
                    usertype: 'LIS',
                    status: 'STSACT',
                    balance: 0
                });
            
                oUser.save(function(err, oUser) {
                    if(err){ return res.status(201).json({ success: false, code: '005', message:'Error processing request '+ err}); }
                
                    res.status(200).json({
                        success: true,
                        message: 'User created successfully. You can now login as Listener.'
                    });
                });
            }
        });
    });
}

exports.updateprofilephoto = function(req, res, next){
    const userid = req.params.id;
    const photopath = req.body.photopath;
    const photoname = req.body.photoname;

    if (!userid || !photopath || !photoname) {
        return res.status(422).json({ success: false, message: 'Posted data is not correct or incompleted.'});
    } else {
        User.findById(userid).exec(function(err, user){
		if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
			
		if(user){
            user.photopath = photopath;
            user.photoname = photoname;

		}
		user.save(function(err){
			if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err }); }
			res.status(201).json({
				success: true,
				message: 'Profile Photo details updated successfully'
			});
		});
	});
   }
}

exports.updatePmtmethod = function(req, res, next){
    const userid = req.params.id;
    const pmtmethod = req.body.pmtmethod;
    const ccno = req.body.ccno;
    const ccholdername = req.body.ccholdername;
    const ccissuerbank = req.body.ccissuerbank;
    const expmth = req.body.expmth;
    const expyr = req.body.expyr;
    const ccvno = req.body.ccvno;

    if (!userid) {
        return res.status(422).json({ success: false, message: 'Posted data is not correct or incompleted.'});
    } else {
	User.findById(userid).exec(function(err, user){
		if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
			
		if(user){
            user.pmtmethod = pmtmethod;
            if (pmtmethod === 'PMTCC') {
                user.ccno = ccno;
                user.ccholdername = ccholdername;
                user.ccissuerbank = ccissuerbank;
                user.expmth = expmth;
                user.expyr = expyr;
                user.ccvno = ccvno;
            }
		}
		user.save(function(err){
			if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err }); }
			res.status(201).json({
				success: true,
				message: 'User details updated successfully'
			});
		});
	});
   }
}