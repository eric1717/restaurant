var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var app = express();
var MongoClient = require('mongodb').MongoClient; 
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var mongourl = 'mongodb://Eric:q12345@ds127536.mlab.com:27536/restaurant';
var fs = require('fs');
var formidable = require('formidable');
var ExifImage = require('exif').ExifImage;

app = express();
app.set('view engine','ejs');

var SECRETKEY1 = 'Name';
var SECRETKEY2 = 'Demo';

app.use(session({
  name: 'session',
  keys: [SECRETKEY1,SECRETKEY2]
}));

var users = new Array(
	{name: 'admin', password: 'admin'},
	{name: 'guest', password: ''},
	{name: 'demo', password: ''},
    {name: 'student', password: ''}
);



app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));


app.post('/api/restaurant/create/',function(req,res){
	console.log("Incoming request: "+req.method);
	console.log("req.path:\n "+req.path);
	console.log("req.body:\n "+req.body.name+" "+req.body.age);
	console.log("Testing");
	res.write("Testing");

	MongoClient.connect(mongourl,function(err,db){
		assert.equal(err,null);
		var resJson;
		console.log('Connected to MongoDB\n');
		insertPhoto(db,req.body,function(result){
			db.close();
			if(result!=null){
				resJson = '{"status": "ok","_id": "'+ObjectId(result._id)+'"}';
				console.log(ObjectId(result._id));
			}
			else{
				resJson = '{"status:"failed"}';
			}
			console.log("create successful!");
			res.end(resJson);
		});
	});
});

app.get('/api/restaurant/read/:key1/:key2',function(req,res){
	console.log('Incoming request: '+req.method);
	console.log('Path '+req.path);
	console.log('Request body: ' + req.body);
	console.log('key1: ' + req.params.key1);
	console.log('key2: ' + req.params.key2);
	var criteria = {};
	criteria[req.params.key1]=req.params.key2;
	console.log(criteria);
	MongoClient.connect(mongourl,function(err,db){
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		findRestaurant(db,criteria,0,function(restaurants){
			db.close();
			res.writeHead(200, {"Content-Type": "text/plain"})
			if(restaurants.length==0){
                res.end("{}");
            }else{
                res.end(JSON.stringify(restaurants));
            }//console.log(JSON.parse(restaurants));
			console.log(restaurants);
		});
	});
	//res.status(200).end('Connection closed');
});



app.get('/',function(req,res) {
	console.log(req.session);
	if (!req.session.authenticated) {
		res.redirect('/login');
	} else {
		res.status(200);
		res.redirect('/read');
	}
});


app.get('/search',function(req,res) {
	res.status(200);
	var no_keys = 0;
	var criteria = {};
	var max=0;
	for (key in req.query){
		if(req.query[key]!=''){
			criteria[key] = req.query[key];
			no_keys++;
		}
		
	}
	console.log("criteria"+JSON.stringify(criteria));
	if(no_keys==0){
		res.render('search');
	} else {
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
			findRestaurant(db,criteria,max,function(restaurants) {
				db.close();
				console.log('Disconnected MongoDB\n');
				res.render('read',{name:req.session.username, r:restaurants});
			});
		});
	}
});

app.get('/login',function(req,res) {
	res.sendFile(__dirname + '/public/login.html');
});

app.post('/login',function(req,res) {
	for (var i=0; i<users.length; i++) {
		if (users[i].name == req.body.name &&
		    users[i].password == req.body.password) {
			req.session.authenticated = true;
			req.session.username = users[i].name;
		}
	}
	res.redirect('/');
});

app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});

app.get('/read',function(req,res) {
	var max = 20;
	var max = req.query.max;
	var criteria = req.query.criteria;
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		findRestaurant(db,criteria,max,function(restaurant) {
			db.close();
			console.log('Disconnected MongoDB\n');
			res.render('read',{name:req.session.username, r:restaurant});
		});
	});
});

app.get("/new", function(req,res){
	console.log('Incoming request: %s', req.path);
	if (!req.session.authenticated) {
		res.redirect('/login');
	}  else {
		res.render('new');
	}
	
	//res.sendFile(__dirname + '/public/new.html');
});

app.post("/create", function(req,res){
	res.status(200);
    console.log('Incoming request: %s', req.path);
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      var filename = files.photo.path;
	  var mimetype = files.photo.type;
	  //var title = (req.body.title.length > 0) ? req.body.title : "untitled";
	  //console.log("title = " + title);
	  console.log("filename = " + filename);
	  var exif = {};
	  var image = {};
	  var lat;
	  var lon;
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
			if (exif['gps'] && Object.keys(exif['gps']).length !== 0) {
				console.log(exif['gps'].length);
				lat = gpsDecimal(
					exif['gps'].GPSLatitudeRef,  // direction
					exif['gps'].GPSLatitude[0],  // degrees
					exif['gps'].GPSLatitude[1],  // minutes
					exif['gps'].GPSLatitude[2]  // seconds
				);
	
				lon = gpsDecimal(
					exif['gps'].GPSLongitudeRef,
					exif['gps'].GPSLongitude[0],
					exif['gps'].GPSLongitude[1],
					exif['gps'].GPSLongitude[2]
				);
				console.log(lat,lon);
			}
			else {
				console.log("No GPS in image");
			}
		  }
		})
	  } catch (error) {}
	  
	  
		
      fs.readFile(filename, function(err,data) {
        MongoClient.connect(mongourl,function(err,db) {
			var new_r = {};
			var address = {};
			var grades = {};
			var restaurant_id = Math.floor(Math.random()*(100000-1));
			new_r['name'] = (fields.Name.length > 0) ? fields.Name : "untitled";
			new_r['borough'] = fields.Borough;
			new_r['cuisine'] = fields.Cuisine;
			new_r['mimetype'] = mimetype;
			new_r['photo'] = new Buffer(data).toString('base64');
			
			address['street'] = fields.Street;
			address['building'] = fields.Building;
			address['zipcode'] = fields.Zipcode;
			new_r['address'] = address;

			var coord= {};
			/*coord['lon']=fields.lon;
			coord['lat']=fields.lat;*/
			if(lon != null){
				new_r['coord']=[lat,lon];
			}else{
				new_r['coord'] = [fields.lat,fields.lon];
			}
			console.log(new_r['coord']);
			//grades['user'] = null
			//grades['score'] = null
			new_r['grades'] = [];
			
			new_r['owner'] = req.session.username;
			new_r['restaurant_id'] = restaurant_id;
			//var data = db.collection('restaurant').findOne(new_r['restaurant_id']);
			insertPhoto(db,new_r,function(result) {
				console.log("create successful!");
				/*res.writeHead(200, {"Content-Type": "text/plain"});
				res.end("Success")
				res.redirect('/')*/
				findid(db,restaurant_id,function(rest) {
					db.close();
					res.redirect('\display?_id='+rest);
				  })
		  	})
        });
      })
    });
});

app.get('/delete',function(req,res){
	MongoClient.connect(mongourl, function(err, db) {
		var id={};
		id['_id']=ObjectId(req.query._id);
		console.log("id"+JSON.stringify(id));
		assert.equal(null, err);
		var owner;
		findowner(db,id,function(rest_owner) {
			owner = rest_owner;
			if(owner == req.session.username){
				console.log("remove id"+JSON.stringify(id));
				removeRestaurant(db, id, function() {
					db.close();
					console.log('remove done!');
					res.redirect('/');
				});
			} else {
				var msg = "You are not Owner, You can't delete it !";
				console.log("User: "+req.session.username+" is not owner"+owner);
				res.render('errormsg',{name:req.session.username,id:req.query._id,msg:msg});
				//res.writeHead(404, {"Content-Type": "text/HTML"});
				//res.end('<HTML><body>You are not Owner <br><a href="/display?_id='+req.query._id+'">Back</a></BODY></HTML>');				
				//res.redirect('/display?_id='+req.query._id);
			}
		})
	});

	var removeRestaurant = function(db,id,callback){
		db.collection('restaurant').deleteOne(id,function(err,result){
			assert.equal(err,null);
			console.log("Delete was successfully");
			callback(result);
		});
	};
});

app.get('/update',function(req,res){
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		var criteria = {};
		criteria['_id'] = ObjectId(req.query._id);
		max=1;
		console.log('Connected to MongoDB\n');
		console.log(JSON.stringify(criteria));
		var owner;
		findowner(db,criteria,function(rest_owner) {
			owner = rest_owner;
			if(owner == req.session.username){
				findRestaurant(db,criteria,max,function(restaurant) {
					db.close();
					console.log('Disconnected MongoDB\n');
					res.render('update',{r:restaurant});
				});
			} else {
				db.close();
				var msg = "You are not Owner, You can't modify it !";
				console.log("User: "+req.session.username+" is not owner"+owner);
				res.render('errormsg',{name:req.session.username,id:req.query._id,msg:msg});
				//res.writeHead(404, {"Content-Type": "text/HTML"});
				//res.end('<HTML><body>You are not Owner <br><a href="/display?_id='+req.query._id+'">Back</a></BODY></HTML>');
				//res.redirect('/display?id='+req.query._id);
			}
		});
	});
});

app.post('/update',function(req,res){
	res.status(200);
	var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      var filename = files.photo.path;
      var mimetype = files.photo.type;
      	fs.readFile(filename, function(err,data) {
			MongoClient.connect(mongourl,function(err,db) {
				console.log('Connected to MongoDB\n');
				assert.equal(err,null);
				var criteria = {};
				criteria['_id'] = ObjectId(req.query._id);

				var new_r = {};

				new_r['name'] = (fields.name.length > 0) ? fields.name : "untitled";
				new_r['borough'] = fields.borough;
				new_r['cuisine'] = fields.cuisine;
				console.log(mimetype);
				if(mimetype!="application/octet-stream"){
					new_r['mimetype'] = mimetype;
					new_r['photo'] = new Buffer(data).toString('base64');
				}

				var address = {};
				address['street'] = fields.street;
				address['building'] = fields.building;
				address['zipcode'] = fields.zipcode;
				new_r['address'] = address;

				var coord= {};
				/*coord['lon']=fields.lon;
				coord['lat']=fields.lat;*/
				new_r['coord'] = [fields.lat,fields.lon];
				
		
				console.log('/update ');
				console.log('Preparing update: ' + JSON.stringify(new_r));
				updateRestaurant(db,criteria,new_r,function(result) {
					db.close();
					console.log('Disconnected to MongoDB\n');
					res.redirect('/display?_id='+req.query._id);
					/*res.writeHead(200, {"Content-Type": "text/plain"});
					res.end("update was successful!");*/
				});			
			});
	  	});
	});
	
});

app.get('/display', function(req,res) {
	MongoClient.connect(mongourl, function(err,db) {
	  assert.equal(err,null);
	  console.log('Connected to MongoDB');
	  var criteria = {};
	  criteria['_id'] = ObjectId(req.query._id);
	  findPhoto(db,criteria,{},function(photo) {
		db.close();
		console.log('Disconnected MongoDB');
		console.log('Photo returned = ' + photo.length);
		var lat = 0;
		var lon = 0;
		try{
		  lat = photo[0].coord[0];
		  lon = photo[0].coord[1];
		}
		catch(err){}
		console.log(lat,lon);       
		res.status(200);
		res.render("display",{p:photo[0],lat:lat,lon:lon});
	  });
	});
  });
  

app.get('/map', function(req,res) {
	res.render('gmap.ejs',
			   {lat:req.query.lat,lon:req.query.lon,title:req.query.title});
});

app.get('/grade',function(req,res) {
	console.log('Incoming request: %s', req.path);
    res.render("grade",{id:req.query._id})
});


app.post('/grade', function(req, res){
	console.log('Incoming request: %s', req.path);
    var form = new formidable.IncomingForm();
	form.parse(req, function (err, field) {
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			var _id = ObjectId(field.id);
			var check;
			var username = req.session.username;
			console.log("Score is " + field.Score);
			console.log("Username is " + username);
			finduser(db, _id, username ,function(name){
				check = name;
				
				console.log("Found name is " + check);
				if (check == username)
				{
					db.close();
					var msg = 'A restaurant can only be rated once !';
					res.render('errormsg',{name:req.session.username,id:req.query._id,msg:msg});
				}
				else{
					var grades = {};
					grades['user'] = username;
					grades['score'] = field.Score;
					rate(db, grades, _id, function(result){
						db.close();
						res.redirect('/display?_id='+req.query._id);
					})
				}
			})
		});
    });
});

function rate(db, grades,_id , callback){
	var cit = {};
	console.log(_id);
	cit['_id'] = ObjectId(_id);
	db.collection('restaurant').update(cit, {"$push":{"grades": grades}}, function(err, result){
		console.log("update was successfully");
		callback(result);
	})
}

function finduser(db ,_id, username , callback){
	var cit = {};
	var call;
	cit['_id'] = ObjectId(_id);
	console.log(cit);
	db.collection('restaurant').findOne(cit, function(err, result){
		assert.equal(err,null);
		for( i in result.grades){
			if(result.grades[i].user == null){
				call = null;
			}
			if(result.grades[i].user == username){
				call = result.grades[i].user;
			}	
		}
		callback(call);
	})
}

function updateRestaurant(db,criteria,newValues,callback) {
	db.collection('restaurant').updateOne(
		criteria,{$set: newValues},function(err,result) {
			assert.equal(err,null);
			console.log("update was successfully");
			callback(result);
	});
}


function findRestaurant(db,criteria,max,callback) {
	var restaurant = [];
	if (max != 1){
	if (max > 0) {
		cursor = db.collection('restaurant').find(criteria).limit(max); 		
	} else {
		cursor = db.collection('restaurant').find(criteria); 				
	}
	cursor.each(function(err, doc) {
		assert.equal(err, null); 
		if (doc != null) {
			restaurant.push(doc);
		} else {
			callback(restaurant); 
		}
	});
	} else {
		db.collection('restaurant').findOne(criteria,function(err,restaurant) {
			assert.equal(err,null);
			console.log("get restaurant successful!");
			console.log(JSON.stringify(restaurant));
			callback(restaurant);
		  });
	}
}

function findid(db,restaurant_id,callback) {
	var cit ={};
	cit['restaurant_id']=restaurant_id;
    db.collection('restaurant').findOne(cit,{"_id.oid":1},function(err,rest) {
      assert.equal(err,null);
      console.log("get id successful!");
      console.log(JSON.stringify(rest._id));
      callback(rest._id);
	});
}

function findowner(db,id,callback) {
	
    db.collection('restaurant').findOne(id,{"owner":1},function(err,rest_owner) {
      assert.equal(err,null);
      console.log("get owner successful!");
      console.log(JSON.stringify(rest_owner.owner));
      callback(rest_owner.owner);
	});
}

function insertPhoto(db,r,callback) {
    db.collection('restaurant').insertOne(r,function(err,result) {
      assert.equal(err,null);
      console.log("insert was successful!");
      console.log(JSON.stringify(result));
      callback(result);
	});
	
}

  
function findPhoto(db,criteria,fields,callback) {
	var cursor = db.collection("restaurant").find(criteria);
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

app.listen(process.env.PORT || 8099);
