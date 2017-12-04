var express = require('express');
var app = express();
app.set('view engine', 'ejs');

var bodyParser = require('body-parser')
var fileUpload = require('express-fileupload');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var ExifImage = require('exif').ExifImage;
var fs = require('fs');

var mongourl = "mongodb://user:chunkit@ds125016.mlab.com:25016/restaurants";
/*"mongodb://eric1717:e1234567@ds141434.mlab.com:41434/eric1768";
/**/


app.use(fileUpload());

app.listen(process.env.PORT || 8099);

app.get('/new', function(req,res) {
  res.status(200);
  res.render("upload");
});

app.get('/', function(req,res) {
  res.redirect('/photos');
});

app.get('/photos', function(req,res) {
  console.log('/photos');
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    findPhoto(db,{},{_id:1,name:1},function(photos) {
      db.close();
      console.log('Disconnected MongoDB');
      res.status(200);
      res.render("list",{p:photos});
    })
  });
});

app.post('/fileupload', function(req,res) {
  var filename = req.files.filetoupload.name;
  var title = (req.body.title.length > 0) ? req.body.title : "untitled";
  var mimetype = req.files.filetoupload.mimetype;
  console.log("title = " + title);
  console.log("filename = " + filename);
  //
  var exif = {};
  var image = {};
  image['image'] = filename;

  try {
    new ExifImage(image, function(error, exifData) {
      if (error) {
        console.log('ExifImage: ' + error.message);
      }
      else {
        exif['image'] = exifData.image;
        exif['exif'] = exifData.exif;
        exif['gps'] = exifData.gps;
        console.log('Exif: ' + JSON.stringify(exif));
      }
    })
  } catch (error) {}
  //
  fs.readFile(filename, function(err,data) {
    MongoClient.connect(mongourl,function(err,db) {
      var new_r = {};
      new_r['title'] = title;
      new_r['mimetype'] = mimetype;
      new_r['image'] = new Buffer(data).toString('base64');
      new_r['exif'] = exif;
      insertPhoto(db,new_r,function(result) {
        db.close();
        res.status(200);
        res.end('Photo was inserted into MongoDB!');
      })
    });
  })
});

app.get('/display', function(req,res) {
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    var criteria = {};
    criteria['_id'] = ObjectID(req.query._id);
    findPhoto(db,criteria,{},function(photo) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('Photo returned = ' + photo.length);
        var lat = -1;
        var lon = -1
        try{
        lat = photo[0].coord[0];
        lon = photo[0].coord[1];
        }catch(err){}
        
/*
      if (photo[0].exif.gps &&
          Object.keys(photo[0].exif.gps).length !== 0) {
        var lat = gpsDecimal(
          photo[0].exif.gps.GPSLatitudeRef,  // direction
          photo[0].exif.gps.GPSLatitude[0],  // degrees
          photo[0].exif.gps.GPSLatitude[1],  // minutes
          photo[0].exif.gps.GPSLatitude[2],  // seconds
        );
        var lon = gpsDecimal(
          photo[0].exif.gps.GPSLongitudeRef,
          photo[0].exif.gps.GPSLongitude[0],
          photo[0].exif.gps.GPSLongitude[1],
          photo[0].exif.gps.GPSLongitude[2],
        );
      }*/
      console.log(lat,lon);      
      res.status(200);
      res.render("photo",{p:photo[0],lat:lat,lon:lon});
    });
  });
});


app.get('/map', function(req,res) {
  res.render('gmap.ejs',
             {lat:req.query.lat,lon:req.query.lon,title:req.query.title});
});
/*
var server = http.createServer(function (req, res) {
  var parsedURL = url.parse(req.url,true);
  var queryAsObject = parsedURL.query;
  
  switch(parsedURL.pathname) {
    case '/fileupload':
      var form = new formidable.IncomingForm();
      form.parse(req, function (err, fields, files) {
        console.log(JSON.stringify(files));
        var filename = files.filetoupload.path;
        var title = (fields.title.length > 0) ? fields.title : "untitled";
        var mimetype = files.filetoupload.type;
        console.log("title = " + title);
        console.log("filename = " + filename);
        //
        var exif = {};
        var image = {};
        image['image'] = filename;

        try {
          new ExifImage(image, function(error, exifData) {
            if (error) {
              console.log('ExifImage: ' + error.message);
            }
            else {
              exif['image'] = exifData.image;
              exif['exif'] = exifData.exif;
              exif['gps'] = exifData.gps;
              console.log('Exif: ' + JSON.stringify(exif));
            }
          })
        } catch (error) {

        }
        //
        fs.readFile(filename, function(err,data) {
          MongoClient.connect(mongourl,function(err,db) {
            var new_r = {};
            new_r['title'] = title;
            new_r['mimetype'] = mimetype;
            new_r['image'] = new Buffer(data).toString('base64');
            new_r['exif'] = exif;
            insertPhoto(db,new_r,function(result) {
              db.close();
              res.writeHead(200, {"Content-Type": "text/plain"});
              res.end('Photo was inserted into MongoDB!');
            })
          });
        })
      });
      break;
    case '/display':
      MongoClient.connect(mongourl, function(err,db) {
        assert.equal(err,null);
        console.log('Connected to MongoDB');
        var criteria = {};
        criteria['_id'] = ObjectID(queryAsObject._id);
        findPhoto(db,criteria,function(photo) {
          db.close();
          console.log('Disconnected MongoDB');
          console.log('Photo returned = ' + photo.length);
          //var image = new Buffer(photo[0].image,'base64');        
          //var contentType = {};
          //contentType['Content-Type'] = photo[0].mimetype;
          //console.log('Preparing to send ' + JSON.stringify(contentType));
          //res.writeHead(200, contentType);
          res.writeHead(200, "text/html");        
          res.write('<!DOCTYPE html><html>');
          res.write('<head>');
          res.write('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
          res.write('<style> img {width: 100%;height: auto;}</style></head>');
          res.write('<link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">');
          res.write('<body><div class="w3-container w3-green">');
          res.write('<center><h1>'+photo[0].title+'</h1></center>');   
          res.write('<img src="data:'+photo[0].mimetype+';base64, '+photo[0].image+'">');
          res.write('</div>');
          res.write('<body><div class="w3-container">');    
          res.write('<h2>EXIF Data</h2>');
          res.write('<h3>Make/Model: ' + photo[0].exif.image.Make + '/' +
                    photo[0].exif.image.Model + '</h3></center>');   
          res.write('<h3>Date/Time: ' + photo[0].exif.exif.DateTimeOriginal +
                    '</h3></center>');      
          res.write('<h3>GPS: ' + JSON.stringify(photo[0].exif.image.gps) +
                    '</h3></center>');   
          res.end('</div></body></html>');
          //res.end(image);
        });
      });
      break;
    case '/delete':
      MongoClient.connect(mongourl, function(err,db) {
        assert.equal(err,null);
        console.log('Connected to MongoDB');
        var criteria = {};
        for (key in queryAsObject) {
          if (key == '_id') {
            criteria[key] = ObjectID(queryAsObject[key]);
          } else {
            criteria[key] = queryAsObject[key];          
          }
        }
        deletePhoto(db,criteria,function(result) {
          res.writeHead(200, "text/plain");
          res.write('/delete was successful!\n');
          res.end(JSON.parse(result));
        });
      });
      break;
    case '/new':
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write('<!DOCTYPE html><html>');
      res.write('<head>');
      res.write('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
      res.write('</head>');
      res.write('<body><div class="w3-container w3-green">');    
      res.write('<form action="fileupload" method="post" enctype="multipart/form-data">');
      res.write('Title: <input type="text" name="title" minlength=1><br>');
      res.write('<input type="file" name="filetoupload"><br>');
      res.write('<input type="submit">');
      res.write('</form>');
      res.end('</div></body></html>');    
      res.end();
      break;
    case '/':
    case '/photos':
    default:
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
  }
});
*/

function insertPhoto(db,r,callback) {
  db.collection("restaurants").insertOne(r,function(err,result) {
    assert.equal(err,null);
    console.log("insert was successful!");
    console.log(JSON.stringify(result));
    callback(result);
  });
}

function deletePhoto(db,criteria,callback) {
  db.collection("restaurants").deleteMany(criteria,function(err,result) {
    assert.equal(err,null);
    console.log("delete was successful!");
    console.log(JSON.stringify(result));
    callback(result);
  });
}

function findPhoto(db,criteria,fields,callback) {
  var cursor = db.collection("restaurants").find(criteria);
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

function gpsDecimal(direction,degrees,minutes,seconds) {
  var d = degrees + minutes / 60 + seconds / (60 * 60);
  return (direction === 'S' || direction === 'W') ? d *= -1 : d;
}

//server.listen(process.env.PORT || 8099);