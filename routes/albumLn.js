const mongoose = require( 'mongoose' );
const Album = require('../models/album');
const config = require('../config');

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

    var options = {
        page: page,
        limit: limit,
        sortBy: sortby
    }

    var aggregate = Album.aggregate();        
    var olookup = {
            from: 'artist',
            localField: 'objartistid',
            foreignField: '_id',
            as: 'artistdetails'
        };
    var oproject = {
        labelid:1,
        artistid:1,
        albumname: 1,
        albumyear: 1,
        albumgenre:1,
        objartistid:1,
        "artist": "$artistdetails.artistname",
        albumprice:1,
        status:1,
        albumphotopath:1,
        albumphotoname:1        
    };
    var ounwind = 'artist';
    //var osort = { "$sort": { sortby: 1}};
    aggregate.match(query).lookup(olookup);
    aggregate.project(oproject);
    aggregate.unwind(ounwind);
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