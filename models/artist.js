const mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');

const Schema = mongoose.Schema;

const ArtistSchema = new Schema({
    labelid: {type:String, required: true},
    artistname: {type:String, required: true},
    artistphotopath: {type:String, required: true},
    artistphotoname: {type:String, required: true},
    status: {type:String, required: true}
});

ArtistSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('artist', ArtistSchema, 'artist');