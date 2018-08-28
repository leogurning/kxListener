const mongoose = require( 'mongoose' );
const Album = require('../models/album');
const config = require('../config');

var merge = function() {
    var obj = {},
        i = 0,
        il = arguments.length,
        key;
    for (; i < il; i++) {
        for (key in arguments[i]) {
            if (arguments[i].hasOwnProperty(key)) {
                obj[key] = arguments[i][key];
            }
        }
    }
    return obj;
};

exports.getalbum = function(req, res, next){
	Album.find({_id:req.params.id}).exec(function(err, album){
        if(err) { 
            res.status(400).json({ success: false, message:'Error processing request '+ err }); 
        }
        res.status(201).json({
		    success: true, 
		    data: album
	    });
    });
}

exports.albumreportLn = function(req, res, next){
    const albumname = req.body.albumname || req.query.albumname;
    const artistid = req.body.artistid || req.query.artistid;
    const albumyear = req.body.albumyear || req.query.albumyear;
    const albumgenre = req.body.albumgenre || req.query.albumgenre;
    const status = req.body.status || req.query.status;
    var totalcount;

    let limit = parseInt(req.query.limit);
    let page = parseInt(req.body.page || req.query.page);
    let sortby = req.body.sortby || req.query.sortby;
    let query = {};

    if(!limit || limit < 1) {
	limit = 10;
    }

    if(!page || page < 1) {
	page = 1;
    }

    if(!sortby) {
	sortby = 'albumname';
    }

    var offset = (page - 1) * limit;

    // returns albums records based on query
    if (!status) {

        if (!albumgenre) {
            if (!artistid) {
                query = { albumname: new RegExp(albumname,'i'), 
                    albumyear: new RegExp(albumyear,'i')};
            } else {
                query = { albumname: new RegExp(albumname,'i'),
                    artistid:artistid, 
                    albumyear: new RegExp(albumyear,'i')};
            }

        }else {
            if (!artistid) {
                query = { albumname: new RegExp(albumname,'i'), 
                    albumyear: new RegExp(albumyear,'i'), 
                    albumgenre: albumgenre};
            }else {
                query = { albumname: new RegExp(albumname,'i'), 
                    albumyear: new RegExp(albumyear,'i'), 
                    artistid:artistid,
                    albumgenre: albumgenre};
            }
        }

    }else{

        if (!albumgenre) {
            if (!artistid) {
                query = { albumname: new RegExp(albumname,'i'), 
                    albumyear: new RegExp(albumyear,'i'), 
                    status: status};
            } else{
                query = { albumname: new RegExp(albumname,'i'),
                    artistid:artistid, 
                    albumyear: new RegExp(albumyear,'i'), 
                    status: status};
            }

        }else {
            if (!artistid) {
                query = { albumname: new RegExp(albumname,'i'), 
                    albumyear: new RegExp(albumyear,'i'), 
                    albumgenre: albumgenre, 
                    status: status};
            } else {
                query = { albumname: new RegExp(albumname,'i'), 
                    artistid:artistid,
                    albumyear: new RegExp(albumyear,'i'), 
                    albumgenre: albumgenre, 
                    status: status};
            }
        }
    }

    Album.count(query, function(err, count){
        totalcount = count;                
        if(count > offset){
            offset = 0;
        }
    });

    var options = {
        select: 'albumname albumyear albumgenre artistid albumprice status albumphotopath albumphotoname',
        sort: sortby,
        offset: offset,
        limit: limit
    }

    Album.paginate(query, options).then(function(result) {
        res.status(201).json({
            success: true, 
            data: result,
            totalcount: totalcount
        });
    });
}

exports.albumaggregateLn = function(req, res, next){

    const albumname = req.body.albumname || req.query.albumname;
    const artistid = req.body.artistid || req.query.artistid;
    const albumyear = req.body.albumyear || req.query.albumyear;
    const albumgenre = req.body.albumgenre || req.query.albumgenre;
    const status = req.body.status || req.query.status;
    const msconfiggrp = 'GENRE';
    const msconfigsts = 'STSACT';
    const songpublish = 'Y';
    var totalcount;

    let limit = parseInt(req.query.limit);
    let page = parseInt(req.body.page || req.query.page);
    let sortby = req.body.sortby || req.query.sortby;
    let query = {};

    if(!limit || limit < 1) {
	    limit = 10;
    }

    if(!page || page < 1) {
	    page = 1;
    }

    if(!sortby) {
	    sortby = 'albumname';
    }

    // returns albums records based on query
    query = { albumname: new RegExp(albumname,'i'), 
        albumyear: new RegExp(albumyear,'i'),
        "msconfigdetails.group": msconfiggrp,
        "msconfigdetails.status": msconfigsts,
        "artistdetails.status": msconfigsts,
        "labeldetails.status": msconfigsts,
        "sgdetails.songpublish": songpublish,
        "sgdetails.status": msconfigsts,
    };
    
    if (artistid) {
        query = merge(query, {artistid:artistid});
    }
    if (albumgenre) {
        query = merge(query, {albumgenre: albumgenre});
    }  
    if (status) {
        query = merge(query, {status:status});
    }
    var options = {
        page: page,
        limit: limit,
        sortBy: sortby
    }
    console.log(query);
    var aggregate = Album.aggregate();        
    var olookup = {
            from: 'artist',
            localField: 'objartistid',
            foreignField: '_id',
            as: 'artistdetails'
        };
    var olookup1 = {
        from: 'msconfig',
        localField: 'albumgenre',
        foreignField: 'code',
        as: 'msconfigdetails'
    };
    var olookup2 = {
        from: 'user',
        localField: 'objlabelid',
        foreignField: '_id',
        as: 'labeldetails'
    };
    var olookup3 = {
        from: 'song',
        localField: '_id',
        foreignField: 'objalbumid',
        as: 'sgdetails'
    };

    var ounwind2 = 'labeldetails';

    var ounwind = 'artistdetails';
    var ounwind1 = 'msconfigdetails';
    var oproject = {
        labelid:1,
        artistid:1,
        albumname: 1,
        albumyear: 1,
        albumgenre:1,
        "genrevalue": "$msconfigdetails.value",
        objartistid:1,
        "artist": "$artistdetails.artistname",
        "labelname": "$labeldetails.name",
        albumprice:1,
        status:1,
        albumphotopath:1,
        albumphotoname:1,
        "sgdetails": "$sgdetails.objalbumid",
        "noofsongs": { $size: "$sgdetails.objalbumid" }        
    };

    //var osort = { "$sort": { sortby: 1}};
    aggregate.lookup(olookup).unwind(ounwind);
    aggregate.lookup(olookup1).unwind(ounwind1);
    aggregate.lookup(olookup2).unwind(ounwind2); 
    aggregate.lookup(olookup3); 
    aggregate.match(query);  
    aggregate.project(oproject);
    //aggregate.sort(osort);
    
    Album.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
        if(err) 
        {
            res.status(400).json({
                success: false, 
                message: err.message
            });
        }
        else
        { 
            res.status(201).json({
                success: true, 
                data: results,
                npage: pageCount,
                totalcount: count
            });
        }
    })
}

exports.getalbumaggregateLn = function(req, res, next){
    const albumid = new mongoose.Types.ObjectId(req.params.id);
    const msconfiggrp = 'GENRE';
    const msconfigsts = 'STSACT';

    let query = {};

    if (!albumid) {
        return res.status(422).send({ error: 'Parameter data is not correct or incompleted.'});
    }else{
        query = { _id:albumid };
    }     

    var aggregate = Album.aggregate();        
    var olookup = {
            from: 'artist',
            localField: 'objartistid',
            foreignField: '_id',
            as: 'artistdetails'
        };
    var olookup1 = {
        from: 'msconfig',
        localField: 'albumgenre',
        foreignField: 'code',
        as: 'msconfigdetails'
    };    
    var ounwind = 'artistdetails';
    var ounwind1 = 'msconfigdetails';
    var oproject = {
        labelid:1,
        artistid:1,
        albumname: 1,
        albumyear: 1,
        albumgenre:1,
        "genrevalue": "$msconfigdetails.value",
        objartistid:1,
        "artist": "$artistdetails.artistname",
        albumprice:1,
        status:1,
        albumphotopath:1,
        albumphotoname:1        
    };

    //var osort = { "$sort": { sortby: 1}};
    aggregate.lookup(olookup).unwind(ounwind);
    aggregate.lookup(olookup1).unwind(ounwind1);  
    aggregate.match(query);  
    aggregate.project(oproject);
    
    aggregate.exec(function(err, result) {
        if(err) 
        {
            res.status(400).json({
                success: false, 
                message: err.message
            });
        }
        else
        {
            res.status(201).json({
                success: true, 
                data: result
            });
        }
    });  
}