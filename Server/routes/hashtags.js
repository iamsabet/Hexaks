var hashtagSchema = require('../models/hashtag.model');
var Hashtag = new hashtagSchema();
/* GET home page. */
var hashtags = {

    autoCompleteHashtags : function(req, res,user) {
        
        hashtagSchema.search(req.body.text, 12, 5, function (autoCompletedList) {
            if(autoCompletedList !== false) {
                res.send(autoCompletedList);
            }
            else{
                res.send([]);
            }
        });
    },
    initialHashtagsInCache: function(mode){
        Hashtag.initial(mode);
    },
    create: function(now,hashtagName,callback) {
        Hashtag.Create(now,0,hashtagName,function(result1){
            if(result1){
                console.log("hour record hashtag = " + hashtagName);
                Hashtag.Create(now,1,hashtagName,function(result2){
                    if(result2){
                        console.log("day record hashtag = " + hashtagName);
                        Hashtag.Create(now,3,hashtagName,function(result3){
                            if(result3){
                                console.log("month record hashtag = " + hashtagName);
                                return callback(true);
                            }
                        });
                    }
                });
            }
        });
    },
    getOne: function(req, res,next,user) {
        var id = req.params.id;
        var user = data[0]; // Spoof a DB call
        res.json(user);
    },

};


module.exports = hashtags;