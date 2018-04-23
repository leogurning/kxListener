const mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

const Schema = mongoose.Schema;

const SongpurchaseSchema = new Schema({
    labelid: {type:String, required: true},
    listenerid: {type:String, required: true},
    songid:{type:String, required: true},
    artistid: {type:String, required: true},
    albumid: {type:String, required: true},
    songprice: {type:Number, required: true},
    purchasedt: {type:Date, required: true},
    paymentmtd:{type:String, required: true},
    approvedt: {type:Date},
    status: {type:String, required: true},
    objsongid: { type:mongoose.Schema.ObjectId, required: true},
    objartistid: { type:mongoose.Schema.ObjectId, required: true},
    objalbumid: { type:mongoose.Schema.ObjectId, required: true},
    objlabelid: { type:mongoose.Schema.ObjectId, required: true},
    objlistenerid: { type:mongoose.Schema.ObjectId, required: true},
});

SongpurchaseSchema.plugin(mongoosePaginate);
SongpurchaseSchema.plugin(mongooseAggregatePaginate);

module.exports = mongoose.model('songpurchase', SongpurchaseSchema, 'songpurchase');