var express = require('express'),
    fs = require("fs"),
    rimraf = require("rimraf"),
    mkdirp = require("mkdirp");
var postSchema = require('../models/post.model');
var post = new postSchema();
var albumSchema = require('../models/post.model');
var album = new albumSchema();
var posts = require('../routes/posts.js');
var users = require('../routes/users.js');
var albums = require('../routes/albums.js');
var multiparty = require('multiparty');
var fileInputName = process.env.FILE_INPUT_NAME || "qqfile",
    privatePath ='../Private Files/Original/',
    publicPath ='../Static Files/pictures/',
    profilePicPath ='../Static Files/pictures/',
    chunkDirName = "chunks",
    maxFileSize =  40000000, // in bytes, 0 for unlimited 40MB
    minFileSizeToChunk = 1000000; // in bytes 1MB
// routes
/* GET home page. */
var uploader = {

    onUpload: function (req, res,user) {
        var postId = req.body["postId"] || undefined;
        var size = req.body["size"] || undefined;
        let form = new multiparty.Form();
        form.parse(req, function (err, fields, files) {
            if (err) throw err;
            // text/plain is required to ensure support for IE9 and older
            res.set("Content-Type", "text/plain");
            if(postId === "" && size==="Original"){
                // first upload --> create new post
                posts.create(req, res, user, files[fileInputName][0],function(callback){
                    uploader.onChunkedUpload(fields, files[fileInputName][0],callback, res);
                });
            }
            else if(postId==="Al:") {
                if(user.uploadingAlbum ==="") {
                albums.create(req, res, user,function (albumeId) {
                    posts.create(req, res, user, files[fileInputName][0], albumId, function (postId) {
                        user.uploadingAlbum = albumeId;
                        user.uploadingQueue.push(postId);
                        user.save();
                        uploader.onChunkedUpload(fields, files[fileInputName][0],postId, res);
                        });
                    });
                }
                else
                {
                    var albumId = user.uploadingAlbum;
                    posts.create(req, res, user, files[fileInputName][0], albumId, function (postId) {
                        user.uploadingQueue.push(postId);
                        user.save();
                        uploader.onChunkedUpload(fields, files[fileInputName][0],postId, res);
                    });
                }
            }
            else if((size !== undefined && postId !== undefined && postId !== "" && !postId.startsWith("Al:"))){

                let filesize = parseInt(fields.qqtotalfilesize);
                posts.getOne(postId,function(err,post){
                    if(err) throw err;
                    if(post !== null && user.uploadingQueue[postId]) {
                        if (this.isValid(filesize)) {
                            if ((size === "Medium" || size === "Small") && this.minChukSize(filesize)) {
                                this.onSimpleUpload(fields, files[fileInputName][0], postId, res);
                            }
                            else if ((size === "Large")) {
                                if (this.minChukSize(filesize)) {
                                    this.onChunkedUpload(fields, files[fileInputName][0], postId, res);
                                }
                                else {
                                    this.onSimpleUpload(fields, files[fileInputName][0], postId, res);
                                }
                            }
                            else {
                                res.send({result: false, message: "403 - Bad Request"});
                            }
                        }
                    }
                    else{
                        res.send({result: false, message: "040 -- Oops :| "});
                    }
                });
            }
            else {
                res.send({result: false, message: "403 - Bad Request"});
            }
        });
    },

    onSimpleUpload: function (fields, file, fileName ,res) {
        let uuid = fields.qquuid,
            responseData = {
                success: false
            };

        file.name = fileName;

        if (isValid(file.size)) {
            console.log(file.name[0]);
            this.moveUploadedFile(file, uuid, function () {
                    let adsInfo = {
                        id: uuid,
                        name: file.name[0],
                    };
                    posts.create(adsInfo, function () {
                    });
                    responseData.success = true;
                    res.send(responseData);


                },
                function () {
                    responseData.error = "Problem copying the file!";
                    res.send(responseData);
                });
        }
        else {
            this.failWithTooBigFile(responseData, res);
        }
    },
    onChunkedUpload:function (fields, file,newFileName,res){

        let size = parseInt(fields.qqtotalfilesize),
            uuid = fields.qquuid,
            index = fields.qqpartindex,
            totalParts = parseInt(fields.qqtotalparts),
            responseData = {
                success: false
            };

        file.name = newFileName;

        if (this.isValid(size)) {
            this.storeChunk(file, uuid, index,postId, totalParts, function () {
                    if (index < totalParts - 1) {
                        responseData.success = true;
                        responseData.postId = newFileName;
                        res.send(responseData);
                    }
                    else {
                        this.combineChunks(file, uuid, function () {
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
            this.failWithTooBigFile(responseData, res);
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

    moveFile:function (destinationDir, sourceFile, destinationFile, success, failure) {
        mkdirp(destinationDir, sourceFile.name, function (error) {
            let sourceStream, destStream;

            if (error) {
                console.error("Problem creating directory " + destinationDir + ": " + error);
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
                        success();
                    })
                    .pipe(destStream);
            }
        });
    },

    moveUploadedFile:function (file, uuid, success, failure) {
        let destinationDir = uploadedFilesPath,
            fileDestination = destinationDir + file.name;

        this.moveFile(destinationDir, file.path, fileDestination, success, failure);
    },

    storeChunk:function (file, uuid, postId,index, numChunks, success, failure) {
        let destinationDir = uploadedFilesPath + uuid + "/" + chunkDirName + "/",
            chunkFilename = this.getChunkFilename(index, numChunks),
            fileDestination = destinationDir + chunkFilename;

        this.moveFile(destinationDir, postId, fileDestination, success, failure);
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

                this.appendToStream(destFileStream, chunksDir, fileNames, 0, function () {
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
                    this.appendToStream(destStream, srcDir, srcFilesnames, index + 1, success, failure);
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
