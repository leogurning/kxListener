const mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

const Schema = mongoose.Schema;

const ArtistSchema = new Schema({
    labelid: {type:String, required: true},
    artistname: {type:String, required: true},
    artistphotopath: {type:String, required: true},
    artistphotoname: {type:String, required: true},
    status: {type:String, required: true},
    about: {type:String}
});

ArtistSchema.plugin(mongoosePaginate);
ArtistSchema.plugin(mongooseAggregatePaginate);

module.exports = mongoose.model('artist', ArtistSchema, 'artist');