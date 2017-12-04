var http = require('http');
var url = require('url');
var fs = require('fs');
var formidable = require('formidable');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;

var mongourl = "mongodb://eric1717:e1234567@ds141434.mlab.com:41434/eric1768";

var server = http.createServer(function (req, res) {
  var parsedURL = url.parse(req.url,true);
  var queryAsObject = parsedURL.query;
  
  if (parsedURL.pathname == '/fileupload') {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      console.log(JSON.stringify(files));
      var filename = files.filetoupload.path;
      var title = (fields.title.length > 0) ? fields.title : "untitled";
      var mimetype = files.filetoupload.type;
      console.log("title = " + title);
      console.log("filename = " + filename);
      fs.readFile(filename, function(err,data) {
        MongoClient.connect(mongourl,function(err,db) {
          var new_r = {};
          new_r['title'] = title;
          new_r['mimetype'] = mimetype;
          new_r['image'] = new Buffer(data).toString('base64');
          insertPhoto(db,new_r,function(result) {
            db.close();
            res.writeHead(200, {"Contentf-Type": "text/plain"});
            res.end('Photo was inserted into MongoDB!');
          })
        });
      })
    });
  } else if (parsedURL.pathname == '/photos') {
    MongoClient.connect(mongourl, function(err,db) {
      assert.equal(err,null);
      console.log('Connected to MongoDB');
      findPhoto(db,{},function(photos) {
        db.close();
        console.log('Disconnected MongoDB');
        res.writeHead(200, {"Content-Type": "text/html"});			
				res.write('<html><head><title>Photos</title></head>');
				res.write('<body><H1>Photos</H1>');
				res.write('<H2>Showing '+photos.length+' document(s)</H2>');
				res.write('<ol>');
				for (var i in photos) {
          res.write('<li><a href=/display?_id='+
          photos[i]._id+'>'+photos[i].title+'</a></li>');
				}
				res.write('</ol>');
				res.end('</body></html>');
      })
    });
  } else if (parsedURL.pathname == '/display') {
    MongoClient.connect(mongourl, function(err,db) {
      assert.equal(err,null);
      console.log('Connected to MongoDB');
      var criteria = {};
      criteria['_id'] = ObjectID(queryAsObject._id);
      findPhoto(db,criteria,function(photo) {
        db.close();
        console.log('Disconnected MongoDB');
        console.log('Photo returned = ' + photo.length);
        /*var image = new Buffer(photo[0].image,'base64'); 
        res.writeHead(200, {"Content-Type": "text/html"});	
        res.end('<body><html>');		
        res.write('<h7>image</h7>');
				res.write('<img src="data:image/jpeg;base64,'+image+'" width="100" height="50" alt="base64 test">');
				res.write('');
        res.end('</body></html>');*/


        /*
        var image = new Buffer(photo[0].image,'base64');
                
        var contentType = {};
        contentType['Content-Type'] = photo[0].mimetype;
        console.log('Preparing to send ' + JSON.stringify(contentType));
        res.writeHead(200, contentType);
        //res.write('<img src="data:image/jpeg;base64,'+base64+'" width="100" height="50" alt="base64 test">');
        res.end(image);*/



        //var base64 = new Buffer(photo[0].image).toString('base64');
        var image = new Buffer(photo[0].image,'base64');


        var base64 = new Buffer(image).toString('base64');


        var contentType = {};
        contentType['Content-Type'] = photo[0].mimetype;
        console.log('Preparing to send ' + JSON.stringify(contentType));
        res.writeHead(200, contentType);
        //res.write('<img src="data:image/jpeg;base64,'+base64+'" width="100" height="50" alt="base64 test">');
        res.end(image);


        
        
      });
    });
  } else {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write('<form action="fileupload" method="post" enctype="multipart/form-data">');
    res.write('Title: <input type="text" name="title" minlength=1><br>');
    res.write('<input type="file" name="filetoupload"><br>');
    res.write('<input type="submit">');
    res.write('</form>');
    res.end();
  }
});

function insertPhoto(db,r,callback) {
  db.collection('photos').insertOne(r,function(err,result) {
    assert.equal(err,null);
    console.log("insert was successful!");
    console.log(JSON.stringify(result));
    callback(result);
  });
}

function findPhoto(db,criteria,callback) {
  var cursor = db.collection("photos").find(criteria);
  var photos = [];
  cursor.each(function(err,doc) {
    assert.equal(err,null);
    if (doc != null) {
      photos.push(doc);
    } else {
      callback(photos);
    }
  });
}

server.listen(process.env.PORT || 8099);
