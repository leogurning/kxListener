const mongoose = require( 'mongoose' );
const Artist = require('../models/artist');
const config = require('../config');
var ObjId = mongoose.Types.ObjectId;
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

exports.getartist = function(req, res, next){
	Artist.find({_id:req.params.id}).exec(function(err, artist){
        if(err) { 
            res.status(400).json({ success: false, message:'Error processing request '+ err }); 
        }
        res.status(201).json({
		    success: true, 
		    data: artist
	    });
    });
}

exports.artistreportLn = function(req, res, next){
    const artistname = req.body.artistname || req.query.artistname;
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
	sortby = 'artistname';
    }

    var offset = (page - 1) * limit;

    // returns all artists records
    if (!status) {
        query = { artistname: new RegExp(artistname,'i')};
    }else{
        query = { artistname: new RegExp(artistname,'i'), status: status};
    }

    Artist.count(query, function(err, count){
        totalcount = count;
        //console.log('count: ' + count.toString());                
        if(count > offset){
            offset = 0;
        }
    });
		
    //console.log('offset: ' + offset);                
    var options = {
        select: 'artistname status artistphotopath artistphotoname',
        sort: sortby,
        offset: offset,
        limit: limit
    }

    Artist.paginate(query, options).then(function(result) {
        res.status(201).json({
            success: true, 
            data: result,
            totalcount: totalcount
        });
    });
}

exports.artistaggregateLn = function(req, res, next){
    
    const artistid = req.body.artistid || req.query.artistid;
    //const artistname = req.body.artistname || req.query.artistname;
    const songpublish = 'Y';
    const status = req.body.status || req.query.status;
    const estatus = 'STSACT';
    var totalcount;
    
    let limit = parseInt(req.query.limit);
    let page = parseInt(req.body.page || req.query.page);
    let sortby = req.body.sortby || req.query.sortby;
    let query = {};
    //let qmatch = {};
    
    if(!limit || limit < 1) {
        limit = 10;
    }
    
    if(!page || page < 1) {
        page = 1;
    }
    
    if(!sortby) {
        sortby = 'artistname';
    }
    
    // returns songs records based on query
    query = { "sgdetails.songpublish": songpublish,
        "sgdetails.status": estatus,
        "labeldetails.status": estatus  
    };
    query1 = { "albumdetails.status": estatus };

    if (artistid) {
        query = merge(query, {artistid:artistid});
    }

    if (status) {
        query = merge(query, {status:status});
    }
    console.log(query);

    var options = {
        page: page,
        limit: limit,
        sortBy: sortby
    }

    var aggregate = Artist.aggregate();    
    
    var olookup = {
        from: 'song',
        localField: '_id',
        foreignField: 'objartistid',
        as: 'sgdetails'
    };
    //var ounwind = { "path": "$pldetails", "preserveNullAndEmptyArrays": true };
    var olookup1 = {
        from: 'album',
        localField: 'sgdetails',
        foreignField: '_id',
        as: 'albumdetails'
    };
    //var ounwind1 = 'albumdetails';
    var olookup2 = {
        from: 'user',
        localField: 'objlabelid',
        foreignField: '_id',
        as: 'labeldetails'
    };
    var ounwind2 = 'labeldetails';

    var oproject = { 
        _id:1,
        artistid:1,
        artistname:1,
        artistphotopath:1,
        artistphotopath:1,
        about:1,
        "sgdetails": "$sgdetails.objalbumid",
        "noofsongs": { $size: "$sgdetails.objalbumid" }
    }; 
    var oproject1 = { 
        _id:1,
        artistid:1,
        artistname:1,
        artistphotopath:1,
        artistphotopath:1,
        about:1,
        "noofsongs": 1,
        "albumdetails": "$albumdetails.albumphotopath"
    };     

    //aggregate.lookup(olookup);
    aggregate.lookup(olookup2).unwind(ounwind2);
    aggregate.lookup(olookup);
    aggregate.match(query);
    aggregate.project(oproject);
    aggregate.lookup(olookup1);
    aggregate.match(query1); 
    aggregate.project(oproject1);  
    
    //var osort = { "$sort": { sortby: 1}};
    //aggregate.sort(osort);
    
    Artist.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
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
    });
}