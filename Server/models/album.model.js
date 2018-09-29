const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var postSchema = require('../models/post.model');
var users = require('../routes/users');
var posts = require('../routes/posts');
var mongoosePaginate = require('mongoose-paginate');
var autoIncrement = require('mongoose-sequence')(mongoose);
var Float = require('mongoose-float').loadType(mongoose);

var albumSchema = new Schema({
    album_id:Number,
    albumId : String, // must have ownerId after Encryption
    ownerId : String,
    thumbnail : String, // 1 post id - default - first one - can be chosen by user
    collaborators : [], // userIds who can attach posts in this album shared by the owner [] default
    title : String,
    views : Number, // all children views
    rate : {      // for all childrennew and old
        value : Float, // (rate.counts / views) * rate.number = rate.value
        number : Float,
        points : Number,
        counts : Number
    },
    activated:Boolean,
    deleted:Boolean,
    reportsCount : Number,
    counts : Number, // number of children // max size : 500
    createdAt : Number,
    updatedAt : Number
});

albumSchema.methods.Create = function(albumObject,callback){
    if(albumObject.title && albumObject.albumId && (typeof albumObject.title === "string") &&  (albumObject.title.length > 6) &&
        (typeof albumObject.albumId === "string") &&  (albumObject.albumId.length > 6) &&  albumObject.ownerId && (typeof albumObject.ownerId === "string") &&  (albumObject.ownerId.length > 6)) {
        let newAlbum = new Album(albumObject);
        let now = Date.now();
        newAlbum.title = albumObject.title;
        newAlbum.albumId = albumObject.albumId;
        newAlbum.createdAt = now;
        newAlbum.updatedAt = now;
        newAlbum.thumbnail = ""; // 1 post id - default - first one - can be chosen by user
        newAlbum.collaborators = []; // userIds who can attach posts in this album shared by the owner [] default
        newAlbum.activated = true;
        newAlbum.rate = {      //
            number: 0.0,
            counts: 0,
            points: 0,
            value: 0.0
        };
        newAlbum.reportsCount = 0;
        newAlbum.views = 0;
        newAlbum.deleted = false;
        newAlbum.ownerId = albumObject.ownerId;
        newAlbum.save();
        return callback(true);
    }
    else{
        return callback({result:false,message:"504 Bad Request"});
    }
};


albumSchema.methods.Remove = function(req,res,user){
    let albumId = req.body.albumId || null;
    if(albumId) {
        album.update({albumId: albumId,ownerId:user.userId},{deleted:true},function(err,result){

        });
        postSchema.updateMany({ album: albumId,ownerId : user.userId },{deleted:true},function(err,result){

        });
    }
    else{
        res.send({result:false,message:"504 Bad request"});
    }

};
albumSchema.methods.getUserAlbumsList = function(req,res,user){

};
albumSchema.methods.Paginate = function(query,options,user,req,res){
    album.paginate(query,options,function(err,albums){
        if(err) {
            console.log(err);
            res.send({docs:[],total:0});
        }
        else {
            if(albums){
                console.log(albums);
                albums.owners = {};
                if(albums.docs.length > 0) {
                    let postIds = [];
                    for (let x = 0; x < albums.docs.length; x++) {
                        if (!albums.owners[albums.docs[x].ownerId]) {
                            users.getUserInfosFromCache(albums.docs[x].ownerId,function(info) {
                                if (!info.message) {
                                    console.log(info);
                                    if(user && info.blockList.indexOf(user.userId) > -1) { // he is blocked by him
                                        delete albums.docs[x];
                                    }
                                    else{
                                        if(user && postIds.indexOf(albums.docs[x].ownerId) === -1){
                                            postIds.push(albums.docs[x].ownerId);
                                            albums.owners[albums.docs[x].ownerId] = info;
                                        }
                                    }
                                }
                                else {
                                    console.log("err :" + err + " / values : " + info);
                                    albums.owners[albums.docs[x].ownerId] = {};
                                }
                            });
                        }
                        else {
                            if (x === albums.docs.length - 1) {
                                console.log(posts);
                                res.send(posts);
                            }
                        }
                    }
                }
                else{
                    res.send({docs:[],total:0});
                }
            }
            else{
                res.send(posts);
            }
        }
    });
};
albumSchema.pre('save', function(next){
    let now = Date.now();
    if(this.updatedAt) {
        this.updatedAt = now;
    }
    else{
        this.createdAt = now;
        this.updatedAt = now;
    }
    next();
});
autoIncrement
albumSchema.plugin(mongoosePaginate);
albumSchema.plugin(autoIncrement, {id:"album_id",inc_field: 'album_id', disable_hooks: true});
let Album = mongoose.model('albums', albumSchema);
let album = mongoose.model('albums');
module.exports = album;