// Módulos para importar
var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var multer = require('multer');
var cloudinary = require('cloudinary');
var method_override = require('method-override');
var session = require('express-session');
var crypto = require('crypto');
var crypto_algorithm = 'aes-256-ctr';
var crypto_password = 'gmolina';

// Configuración de Cloudinary
// Las imágenes de los productos subidas se guardan en Cloudinary
cloudinary.config({
	cloud_name: "gmolinac91",
	api_key: "453195548562374",
	api_secret: "DM0CfFRiu0WZf4bA7denaRijD70"
});

// Configuraciones del servidor
// Se define la variable "app" que utiliza el módulo de express
var app = express();

// Se hace un parser de los productos con el módulo Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Se sobreescribe el método de enviar los formularios, dado que algunos navegadores no soportan el método PUT, por eso se utiliza POST
app.use(method_override("_method"));

// Se utiliza el módulo Multer para poder subir las imágenes a la carpeta "uploads" temporalmente para luego subirlas a Cloudinary
app.use(multer({dest: "./uploads"}));

// Se va a utilizar la session para la autenticación de los usuarios
app.use(session({
	secret: 'gmolinac91',
	resave: false,
	saveUninitialized: true
}));

// Se específica que se va a hacer uso del motor de vistas "Jade"
app.set("view engine", "jade");

// Se define que la carpeta "public" va a poder ser accedida por los usuarios a la hora de hacer consultas a las páginas, por eso ahi se incluyen
// archivos como los de CSS, JavaScript, etc, los cuales deberian de ser públicos
app.use(express.static("public"));

// Se define que el servidor va a estar escuchando en el puerto "8080"
app.set('port', process.env.PORT || 8080);
app.listen(app.get('port'));

// Conexión a MongoDB
// Se realiza la conexión la base de datos MongoDB
mongoose.connect("mongodb://localhost/db_foodfacilito");

// Se obtiene la conexión
var db = mongoose.connection;

// Se utiliza el métido 'Schema' de Mongoose
var Schema = mongoose.Schema;

// Se define el esquema de los productos, el cual va a ser utilizado por MongoDB
var productSchema = new Schema({
	title: String,
	description: String,
	imageURL: String,
	pricing: Number
});

// Se define un atributo virtual del esquema ProductSchema para MongoDB
productSchema.virtual("image_url").get(function(){
	if (this.imageURL === "" || this.imageURL === "default.png") {
		return "default.png";
	}
	return this.imageURL;
});

// Se declara el objeto 'Product' para poder utilizarlo en las rutas
var Product = db.model("Product", productSchema);

//Definir el esquema de los productos, el cual va a ser utilizado por MongoDB
var userSchema = new Schema({
	firstName: String,
	lastName: String,
	username: String,
	password: String
});

// Se declara el objeto 'Product' para poder utilizarlo en las rutas
var User = db.model("User", userSchema);

// Se define las rutas de la aplicación
// Se define la ruta "/", la cual va a ser la ruta raíz de la aplicación
app.get("/", function(req,res){
	res.render("index", {
		session: req.session.user,
		sessionUserCompleteName: req.session.completeUserName
	});
});

// Se define la ruta get "/menu" para poder visualizar los productos
app.get("/menu", function(req,res){
	Product.find(function(err,doc){
		if (err) {
			console.log(err);
		} else {
			res.render("menu/index", {
				products: doc,
				session: req.session.user,
				sessionUserCompleteName: req.session.completeUserName
			});
		}
	});
});

// Se define la ruta get "/menu/add" la cual va a ser utilizada por el usuario para poder crear un producto
app.get("/menu/add", verificarAutenticacionPaginas, function(req,res){
	res.render("menu/add", {
		session: req.session.user,
		sessionUserCompleteName: req.session.completeUserName
	});
});

// Se define la ruta post "/menu" la cual va a ser utilizada para poder crear los productos por el servidor
app.post("/menu/add", verificarAutenticacionPaginas, function(req,res){
	var data = {
		title: req.body.title,
		description: req.body.description,
		imageURL: "default.png",
		pricing: req.body.pricing
	};

	var product = new Product(data);

	// Se verifica si se seleccionó una imagen, si es asi se sube a Cloudinary
	if (req.files.hasOwnProperty("image_product")) {
		cloudinary.uploader.upload(req.files.image_product.path, function(result) {
			product.imageURL = result.url;
			product.save(function(err){
				res.redirect("/admin");
			});
		});
	// Si no, guarda el producto con la imagen temporal alojada prviamente en Cloudinary
	} else {
		product.save(function(err){
			res.redirect("/admin");
		});
	}
});

// Se define la ruta get "/menu/edit/:id" la cual va a ser utilizada por el servidor para editar los productos
app.get("/menu/edit/:id", verificarAutenticacionPaginas, function(req,res){
	var id_product = req.params.id;
	Product.findOne({_id: id_product}, function(err,product){
		res.render("menu/edit", {
			product: product,
			session: req.session.user,
			sessionUserCompleteName: req.session.completeUserName
		});
	});
});

// Se define la ruta put "/menu/:id" la cual va a ser utilizada por el servidor para editar los productos
app.put("/menu/:id", verificarAutenticacionPaginas, function(req,res){
	var id_product = req.params.id;
	var data = {
		title: req.body.title,
		description: req.body.description,
		pricing: req.body.pricing
	};

	if (req.files.hasOwnProperty("image_product")) {
		cloudinary.uploader.upload(req.files.image_product.path, function(result) {
			data.imageURL = result.url;
			Product.update({_id: id_product}, data, function(){
				res.redirect("/admin");
			});
		});
	} else {
		Product.update({_id: id_product}, data, function(){
			res.redirect("/admin");
		});
	}
});

// Se define la ruta get "/menu/delete/:id" la cual va a ser utilizada por el servidor para eliminar los productos
app.get("/menu/delete/:id", verificarAutenticacionPaginas, function(req,res){
	var id_product = req.params.id;
	Product.findOne({_id: id_product}, function(err,product){
		res.render("menu/delete", {
			product: product,
			session: req.session.user,
			sessionUserCompleteName: req.session.completeUserName
		});
	});
});

// Se define la ruta delete "/menu/:id" la cual va a ser utilizada por el servidor para eliminar los productos
app.delete("/menu/:id", verificarAutenticacionPaginas, function(req,res){
	var id_product = req.params.id;
	Product.remove({_id: id_product}, function(err){
		if(err){
			console.log(err);
		}else{
			res.redirect("/admin");
		}
	});
});

// Se define la ruta get "/contacto" la cual va a ser utilizada por el usuario para poder ponerse en contacto con el administrador
app.get("/contacto", function(req,res){
	res.render("contacto", {
		session: req.session.user,
		sessionUserCompleteName: req.session.completeUserName
	});
});

// Se define la ruta get "/acercade" la cual va a ser utilizada por el usuario para poder ver la información de la página
app.get("/acercade", function(req,res){
	res.render("acercade", {
		session: req.session.user,
		sessionUserCompleteName: req.session.completeUserName
	});
});

// Se define la ruta get "/admin" la cual va a ser utilizada por el usuario para poder ver administrar los productos, se verifica el acceso
// a la vista por medio de la funcion 'verificarAutenticacionPaginas'
app.get("/admin", verificarAutenticacionPaginas, function(req,res){
	var numberOfProducts;
	Product.find(function(err,doc){
		if (err) {
			console.log(err);
		} else {
			Product.count({}, function(err,count){
				if (err){
					console.log(err);
				} else {
					res.render("admin/index", {
						products: doc,
						countProducts: count,
						session: req.session.user,
						sessionUserCompleteName: req.session.completeUserName
					});
				}
			});
		}
	});
});

// Se define la ruta get "/signup" la cual va a ser utilizada por el usuario para visualizar el formulario de registrar un usuario
app.get("/signup", function(req,res){
	res.render("signup", {
		visualizacionError: 'hidden',
		session: req.session.user,
		sessionUserCompleteName: req.session.completeUserName
	});
});

// Se define la ruta post "/signup" la cual va a ser utilizada por el servidor para registrar a un usuario
app.post("/signup", function(req,res){
	var local_firstName = req.body.firstName;
	var local_lastName = req.body.lastName;
	var local_username = req.body.username;
	var local_password = req.body.password;
	var local_confirm_password = req.body.confirm_password;

	if (local_password == local_confirm_password){
		var passwordEncriptada = encriptarContrasena(local_password);
		User.findOne({username: local_username}, function(err,user){
			if(!user){
				var user = new User({
					firstName: local_firstName,
					lastName: local_lastName,
					username: local_username,
					password: passwordEncriptada
				});
				user.save(function(err){
					res.redirect("/login");
				});
			}else{
				res.render("signup", {
					visualizacionError: '',
					usuarioExistente: 'Usuario ya existe en la base de datos',
					session: req.session.user,
					sessionUserCompleteName: req.session.completeUserName
				});
			}
		});
	}else{
		res.render("signup", {
			visualizacionError: '',
			usuarioExistente: 'Las contraseñas ingresadas no coinciden',
			session: req.session.user,
			sessionUserCompleteName: req.session.completeUserName
		});
	}
});

// Se define la ruta get "/login" la cual va a ser utilizada por el usuario para visualizar el formulario de iniciar sesión
app.get("/login", function(req,res){
	res.render("login", {
		visualizacionError: 'hidden',
		session: req.session.user,
		sessionUserCompleteName: req.session.completeUserName
	});
});

// Se define la ruta post "/login" la cual va a ser utilizada por el usuario para visualizar el formulario de iniciar sesión
app.post("/login", function(req,res){
	var local_username = req.body.username;
	var local_password = req.body.password;

	var passwordEncriptada = encriptarContrasena(local_password);
	User.findOne({username: local_username, password: passwordEncriptada}, function(err,user){
		if(user){
			req.session.user = user.username;
			req.session.completeUserName = user.firstName + " " + user.lastName;
			res.redirect("/admin");
		}else{
			res.render("login", {
				visualizacionError: '',
				accesoErroneo: 'Usuario o contraseña erróneo',
				session: req.session.user,
				sessionUserCompleteName: req.session.completeUserName
			});
		}
	});
});

// Se define la ruta post "/login" la cual va a ser utilizada por el usuario para visualizar el formulario de registrar o iniciar sesión
app.get("/logout", function(req,res){
	req.session.destroy();
    res.redirect("/login");
});

// Funciones utilizadas
// Función que valida el ingreso a las paginas, si no existe 'req.session.user' se redirige a '/login', si si existen entonces se continua
// a la siguiente función callback por medio de 'next()'
function verificarAutenticacionPaginas(req,res,next){
	if(req.session.user){
		next();
	}else{
		res.redirect("/login");
	}
}

// Función que encripta la contraseña del usuario
function encriptarContrasena(text){
	var cipher = crypto.createCipher(crypto_algorithm, crypto_password);
	var crypted = cipher.update(text,'utf8','hex');
	crypted += cipher.final('hex');
	return crypted;
}
