var fs = require("fs"),
    rimraf = require("rimraf"),
    mkdirp = require("mkdirp");
var postSchema = require('../models/post.model');

var userSchema = require('../models/user.model');

var posts = require('../routes/posts.js');
var users = require('./users');
var devices = require('./devices');
var multiparty = require('multiparty');
var random = require("randomstring");
var redis = require('redis');
var fs = require('fs');
var gm = require('gm');
var CryptoJS = require('crypto-js');

let secret = require("../config/secret");

var ExifImage = require('exif').ExifImage;
var redisClient = redis.createClient({
    password:secret.redisKey,

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});

var fileInputName = process.env.FILE_INPUT_NAME || "qqfile",
    originalPath ='/Users/sabet/Projects/Hexaks/Files/Pictures/',
    smallAndMediumPath ='/Users/sabet/Projects/Hexaks/Files/Statics/Pictures/',
    profilePicturesPath ='/Users/sabet/Projects/Hexaks/Files/Statics/ProfilePics/',
    chunkDirName = "chunks",
    maxFileSize =  100000000, // in bytes, 0 for unlimited 100MB
    minFileSizeToChunk = 1000000; // in bytes 1mb

var uploader = {

    onUpload: function (req, res,type,user) {
        let form = new multiparty.Form();
        form.parse(req, function (err, fields, files) {
            if (err) throw err;
            // text/plain is required to ensure support for IE9 and older
            if (files) {
                let format = "";
                if(files.image_data && files.image_data[0] && (Object.keys(fields).length === 0)){
                    format = "jpg";
                }
                else{
                    format = fields.qqfilename[0].split(".")[fields.qqfilename[0].split(".").length - 1];
                }
                if(type === "post"){
                    redisClient.get("uploading:"+user.userId, function (err, value) {
                        if(err) throw err;
                        if(value) {
                            if(value==="post") {
                                redisClient.get("uploadCounts:"+user.userId, function (err, countsx) {
                                    let counts = parseInt(countsx);
                                    if (counts && counts > 0) {
                                        counts++;
                                    }
                                    else if(isNaN(counts) || !counts){
                                        counts = 1;
                                    }

                                    if(counts < 20) {

                                        let pathis = "";
                                        let size = "";
                                        redisClient.get("uploadingPost:"+user.userId, function (err, postIdx) {
                                            if (err) throw err;
                                            let uploadingPost = "";
                                            if((postIdx===null || !postIdx)){

                                            }
                                            uploadingPost = postIdx;
                                            console.log(uploadingPost);
                                            if (fields.qqfilename[0]) {
                                                if (fields.qqfilename[0].split("sss").length > 1) {

                                                    size = "-Small";
                                                    pathis = smallAndMediumPath;
                                                }
                                                else if (fields.qqfilename[0].split("mmm").length > 1) {
                                                    size = "-Medium";
                                                    pathis = smallAndMediumPath;
                                                }
                                                else {
                                                    size = "";
                                                    pathis = originalPath;

                                                }

                                                let extra = `${counts}`;
                                                if ((counts === 1) && (uploadingPost === null)) {
                                                    uploadingPost = CryptoJS.AES.encrypt((user.userId + "|-p-|" + counts + ":" + random.generate(10)).toString(), secret.postIdKey).toString();
                                                    uploadingPost = uploadingPost.split("/").join("|");
                                                    console.log("postId : " + uploadingPost);
                                                    redisClient.set("uploadingPost:"+user.userId, uploadingPost + "===." + format);
                                                    redisClient.expire("uploadCounts:"+user.userId, (5 * 60000));
                                                    redisClient.expire("uploadingPost:"+user.userId, (5 * 60000));
                                                    redisClient.expire("uploading:"+user.userId, (5 * 60000));

                                                }

                                                if (size === "") {
                                                    pathis = originalPath;
                                                    console.log("counts" + counts);
                                                    redisClient.set("uploadCounts:"+user.userId, counts.toString());
                                                    // image data extraction
                                                    console.log("post object creation");
                                                    posts.Create(user, format, uploadingPost.split("===.")[0], fields.qqfilename[0], counts, function (callback) {
                                                        if(!callback || callback.message){
                                                            res.send(callback);
                                                        }
                                                        else{
                                                            uploader.onSimpleUpload(fields, files[fileInputName][0], pathis, uploadingPost.split("===.")[0] + "-" + extra + "-===." + format, res, uploadingPost.split("===.")[0] + "-" + extra);

                                                        }
                                                        console.log(callback);
                                                    });
                                                }
                                                else {
                                                    uploader.onSimpleUpload(fields, files[fileInputName][0], pathis, uploadingPost.split("===.")[0] + "-" + extra + "-"+ size + "===." + format, res, "");

                                                }
                                            }
                                            else {
                                                res.send({result: false, message: "File has no name"});
                                            }
                                        });
                                    }
                                    else{
                                        res.send({result:false,message:"Maximum upload counts per request reached : 20 , submit your Posts and continue again"});
                                    }
                                });
                            }
                            
                        }
                    });
                }
                else if(type === "profPics"){
         
                    let randomPart = random.generate(6);
                    uploader.onSimpleUpload(fields, files.image_data[0], profilePicturesPath,user.userId+ "-"+ randomPart +"."+format, res,"");

                }
                else if(type === "badge"){

                }
                else if(type === "category"){

                }
                else{
                    res.send({result:false,message:"Did not initialized for upload"});
                }
                    
            }
            else {
                res.send("403 bad request");
            }
        });
    },

onSimpleUpload: function (fields, file, path,fileName ,res,postId) {
    let uuid;
    if(fields.qquuid)
        uuid = fields.qquuid;
    responseData = {
        success: false
    };
    if(fields.qqfilename)
        file.name = fields.qqfilename;
    else
        file.name = fields.qqfilename;
    file.fullName = fileName;

    if (uploader.isValid(file.size)) {
        uploader.moveUploadedFile(fileName,file,uuid,path,postId, function () {
        responseData.success = true;
        responseData.url = fileName;
        res.send(responseData);
        },
        function () {
            responseData.error = "Problem copying the file!";
            responseData.url = fileName;
            res.send(responseData);
        });
    }
    else {
        uploader.failWithTooBigFile(responseData, res);
    }
},
onChunkedUpload:function (fields, file,path,newFileName,res){

    var size = parseInt(fields.qqtotalfilesize),
        uuid = fields.qquuid,
        index = fields.qqpartindex,
        totalParts = parseInt(fields.qqtotalparts),
        responseData = {
            success: false
        };
    console.log(fields);
    file.name = newFileName;
    file.path = path;
    if (uploader.isValid(size)) {
        uploader.storeChunk(file,path,uuid, index,totalParts, function () {
                if (index < totalParts - 1) {
                    responseData.success = true;
                    responseData.postId = newFileName;
                    res.send(responseData);
                }
                else {
                    uploader.combineChunks(file, uuid, function () {
                            responseData.success = true;
                            responseData.postId = newFileName;
                            res.send(responseData);
                        },
                        function () {
                            responseData.error = "Problem conbining the chunks!";
                            res.send(responseData);
                        });
                }
            },
            function (reset) {
                responseData.error = "Problem storing the chunk!";
                res.send(responseData);
            });
    }
    else {
        uploader.failWithTooBigFile(responseData, res);
    }
},

failWithTooBigFile:function (responseData, res) {
    responseData.error = "Too big!";
    responseData.preventRetry = true;
    res.send(responseData);
},

onDeleteFile:function (req, res) {
    let uuid = req.params.uuid,
        dirToDelete = uploadedFilesPath + uuid;

    rimraf(dirToDelete, function (error) {
        if (error) {
            console.error("Problem deleting file! " + error);
            res.status(500);
            res.send(false);
        }

        res.send(true);
    });
},
minChukSize:function (size) {
    return ((size < minFileSizeToChunk) || (minFileSizeToChunk === 0));
},
isValid:function (size) {
    return maxFileSize === 0 || size < maxFileSize;
},

moveFile:function(fileName,destinationDir, sourceFile, destinationFile,postId, success, failure) {

        if((destinationDir.split("ProfilePics").length === 2) && (fileName.split(".").length === 1)){
            fileName = fileName+".jpg";
        }

        mkdirp(destinationDir, sourceFile.fullName , function (error) {
            let sourceStream, destStream;
            if (error) {
                console.error("Problem creating directory " + destinationDir + "   ----:----    " + error);
                failure();
            }
            else {
                sourceStream = fs.createReadStream(sourceFile);
                destStream = fs.createWriteStream(destinationFile);

                sourceStream
                    .on("error", function (error) {
                        console.error("Problem copying file: " + error.stack);
                        destStream.end();
                        failure();
                    })
                    .on("end", function () {
                        destStream.end();
                        // after upload is done
                        if(postId !== "") {
                            gm((sourceFile)).identify(
                                function (err, data) {
                                    if (err) console.log("ERR "+err);
                                    if (data) {
                                        let rejected = {
                                            value:false,
                                            updatedAt:Date.now()
                                        };
                                        let witdth = 0;
                                        let height = 0;
                                        if(!data.size){

                                        }
                                        else{
                                            console.log(data.size.width, data.size.height);
                                            if (data.size.width < 600 || data.size.height < 600) {
                                                rejected.value = true;
                                                rejected.reason = "Low Resolution";
                                            }
                                            height = data.size.height;
                                            width = data.size.width;
                                        }
                                        new ExifImage({image: destinationDir +"/"+ fileName}, function (error, exifData) {

                                            if (error) console.log("exif extraction failed "+ error);
                                            let exif = null;
                                            if (exifData) {
                                                exif = exifData.exif || null;
                                            }
                                            let device = null;
                                            if (exif && exifData.image !== {} && exifData.image) {
                                                let gpsLocation = exifData.gps || {};
                                                
                                                devices.create(exifData.image.Make, exifData.image.Model, function (resultId) {
                                                    if (resultId !== null) {
                                                        device = {
                                                            brand: exifData.image.Make,
                                                            model: exifData.image.Model,
                                                        };
                                                    }
                                                    console.log("postId" + postId);
                                                    postSchema.updateOne({
                                                            postId: postId,
                                                        }, {
                                                            $set: {
                                                                rejected: rejected,
                                                                exifData: exif,
                                                                device: device,
                                                                "originalImage.resolution.x": width,
                                                                "originalImage.resolution.y": height,
                                                                gps: gpsLocation
                                                            }
                                                        }
                                                        , function (err, result) {
                                                            if (err) throw err;
                                                            if (result.n > 0) {
                                                                console.log("Post Datas Updated Successfully");
                                                                posts.imageProcessing(postId, destinationDir + fileName);
                                                            }
                                                            else {
                                                                console.log("Post Datas Failed To Update");
                                                            }
                                                        });
                                                });
                                            }
                                            else {
                                                postSchema.updateOne({
                                                        postId: postId,

                                                    }, {
                                                        $set: {
                                                            exifData: null,
                                                            device: null,
                                                            "originalImage.resolution.x": width,
                                                            "originalImage.resolution.y": height,
                                                            gps: null,
                                                            rejected: rejected
                                                        }
                                                    }
                                                    , function (err, result) {
                                                        if (err) throw err;
                                                        if (result.n > 0) {
                                                            console.log("Post Datas Updated Successfully");
                                                            posts.imageProcessing(postId, destinationDir + fileName);
                                                        }
                                                        else {
                                                            console.log("Post Datas Failed To Update");
                                                        }
                                                    });
                                                    
                                            }
                                        });
                                    }
                                });
                        }
                        else{
                            if(destinationDir.split("ProfilePics").length > 1){
                                
                                gm(destinationDir + fileName.split("-")[1])
                                    .blur(15, 15)
                                    .write(destinationDir + fileName.split("-")[1].split(".")[0] + "-blur." + fileName.split(".")[1], function (err) {
                                        if (!err) {
                                            console.log('created blur image');
                                        }
                                        else console.log("blur image failed :" + err);
                                    });
                                userSchema.updateOne({userId:fileName.split("-")[0]},{$set:{profilePictureSet:fileName.split("-")[1]}},function(err,resx){
                                   if(resx.n > 0){
                                    console.log("profilePicture updated");
                                    users.updateSingleUserInfoInCache(fileName.split("-")[0],"profilePictureSet",fileName.split("-")[1],"set",function(callback){
                                        if(!callback.message){
                                            console.log("updated profilePictureSet in cache");
                                        }
                                        else{
                                            console.log("failed to update profilePictureSet in cache");
                                        }
                                    });
                                   }
                                   else{
                                    console.log("profilePicture Failed to update");
                                   }
                                });


                            }
                            else {

                                gm(destinationDir + fileName)
                                    .blur(25, 25)
                                    .write(destinationDir + fileName.split("===.")[0] + "-blur===." + fileName.split("===.")[1], function (err) {
                                        if (!err) {
                                            console.log('created blur image');
                                        }
                                        else console.log("blur image failed :" + err);
                                    });
                            }
                        }
                        success();
                    })
                .pipe(destStream);
            }
    });
},

moveUploadedFile : function(fileName,file, uuid, path,postId,success, failure) {
    let destinationDir = path;
    let fileDestination = destinationDir + fileName;
    if(postId !== ""){
        console.log("postID :" +postId);
        let changedPostId = postId.split("|").join("/").slice(0,-2); // rooted
        console.log("CHANGED postID : " +changedPostId);
        let bytes = CryptoJS.AES.decrypt(changedPostId,secret.postIdKey);
        let decrypted = bytes.toString(CryptoJS.enc.Utf8);
        destinationDir = path+decrypted.split("|-p")[0].toString() + "/";
        fileDestination = destinationDir + fileName;
    }
    else{
        if(path.split("ProfilePics").length > 1){ // profile picture condition
            let userId = fileName.split("-")[0];
            destinationDir = path+userId + "/";
            fileDestination = destinationDir + fileName.split("-")[1];
        }
    }
    uploader.moveFile(fileName,destinationDir, file.path, fileDestination,postId,success, failure);
},

storeChunk:function (file, path,uuid,index, numChunks, success, failure) {
    let destinationDir = path,
        chunkFilename = uploader.getChunkFilename(index, numChunks),
        fileDestination = destinationDir + chunkFilename;
        console.log(destinationDir + chunkFilename);
    uploader.moveFile(destinationDir, fileDestination, success, failure);
},

combineChunks :function (file, uuid, success, failure) {
    let chunksDir = uploadedFilesPath + uuid + "/" + chunkDirName + "/",
        destinationDir = uploadedFilesPath + uuid + "/",
        fileDestination = destinationDir + file.name;

    fs.readdir(chunksDir, function (err, fileNames) {
        let destFileStream;

        if (err) {
            console.error("Problem listing chunks! " + err);
            failure();
        }
        else {
            fileNames.sort();
            destFileStream = fs.createWriteStream(fileDestination, {flags: "a"});

            uploader.appendToStream(destFileStream, chunksDir, fileNames, 0, function () {
                    rimraf(chunksDir, function (rimrafError) {
                        if (rimrafError) {
                            console.log("Problem deleting chunks dir! " + rimrafError);
                        }
                    });
                    success();
                },
                failure);
        }
    });
},

appendToStream : function(destStream, srcDir, srcFilesnames, index, success, failure) {
    if (index < srcFilesnames.length) {
        fs.createReadStream(srcDir + srcFilesnames[index])
            .on("end", function () {
                uploader.appendToStream(destStream, srcDir, srcFilesnames, index + 1, success, failure);
            })
            .on("error", function (error) {
                console.error("Problem appending chunk! " + error);
                destStream.end();
                failure();
            })
            .pipe(destStream, {end: false});
    }
    else {
        destStream.end();
        success();
    }
},

getChunkFilename : function(index, count) {
    let digits = String(count).length,
        zeros = new Array(digits + 1).join("0");

    return (zeros + index).slice(-digits);
}

};
module.exports = uploader;
