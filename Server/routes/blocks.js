var requestIp = require("request-ip");
var findHashtags = require('find-hashtags');
var CryptoJS = require("crypto-js");
var blockSchema = require('../models/block.model');
var Block = new blockSchema();



var blocks = {

    paginateBlockList: function(req, res,user,pageNumber) {
        let query = {
            "blocker": user.userId,
            "activated":true
        };
        let options = {
            select: 'blocked blockId updatedAt',
            sort: {updatedAt: +1},
            page: pageNumber,
            limit: 10
        };
        Block.Paginate(query, options, req, res); // Authorized
                        
    },
    getUserBlockers:function(userId,callback){
        if(userId === null){
            return callback([]);
        }
        else{
            blockSchema.find({blocked:userId,deleted:false,activated:true},{blocker:1,updatedAt:1},function(err,blockList){
                if(err) throw err;
                if(blockList.length===0){
                    return callback([]);
                }
                else{
                    let blockers = [];
                    for(let z  = 0 ;z < blockList.length;z++){
                        blockers.push(blockList[z].blocker);
                        if(z === blockList.length -1){
                            return callback(blockers);
                        }
                    }
                }
            });
        }
    },
    block:function(blocker,blocked,callback){
        Block.create(blocker,blocked,function(resultx){
            return callback(resultx);
        });
    },
    unblock:function(blocker,blocked,callback){
        Block.remove(blocker,blocked,function(resultx){
            return callback(resultx);
        });
    },
    check:function(blocker,blocked,callback){
        Block.check(blocker,blocked,function(resultx){
            return callback(resultx);
        });
    }
};


module.exports = blocks;