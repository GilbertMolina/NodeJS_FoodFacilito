// Módulos para importar
var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var multer = require('multer');
var cloudinary = require('cloudinary');
var method_override = require('method-override');
var app_password = "12345";

// Configuración de Cloudinary
// Las imágenes de los productos subidas se guardan en Cloudinary
cloudinary.config({
	cloud_name: "gmolinac91",
	api_key: "453195548562374",
	api_secret: "DM0CfFRiu0WZf4bA7denaRijD70"
});

// Se define la variable "app" que utiliza el módulo de express
var app = express();

// Se realiza la conexión la base de datos MongoDB
mongoose.connect("mongodb://localhost/db_foodfacilito");

// Se hace un parser de los productos con el módulo Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Se sobreescribe el método de enviar los formularios, dado que algunos navegadores no soportan el método PUT, por eso se utiliza POST
app.use(method_override("_method"));

// Se utiliza el módulo Multer para poder subir las imágenes a la carpeta "uploads" temporalmente para luego subirlas a Cloudinary
app.use(multer({dest: "../FoodFacilito/uploads"}));

//Definir el esquema de los productos, el cual va a ser utilizado por MongoDB
var productSchema = {
	title: String,
	description: String,
	imageURL: String,
	pricing: Number
};

// Se define el esquema Product en MongoDB, haciendo uso del esquema definido "productSchema" y se almacena en la variable "Product"
var Product = mongoose.model("Product", productSchema);

// Se específica que se va a hacer uso del motor de vistas "Jade"
app.set("view engine", "jade");

// Se define que la carpeta "public" va a poder ser accedida por los usuarios a la hora de hacer consultas a las páginas, por eso ahi se incluyen
// archivos como los de CSS, JavaScript, etc, los cuales deberian de ser públicos
app.use(express.static("public"));

// Se define las rutas de la aplicación
// Se define la ruta "/", la cual va a ser la ruta raíz de la aplicación
app.get("/", function(req,res){
	res.render("index");
});

// Se define la ruta get "/menu" para poder visualizar los productos
app.get("/menu", function(req,res){
	Product.find(function(err,doc){
		if (err) {
			console.log(err);
		} else {
			res.render("menu/index", { products: doc });
		}
	});
});

// Se define la ruta get "/menu/add" la cual va a ser utilizada por el usuario para poder crear un producto
app.get("/menu/add", function(req,res){
	res.render("menu/add");
});

// Se define la ruta post "/menu" la cual va a ser utilizada para poder crear los productos por el servidor
app.post("/menu/add", function(req,res){
	if (req.body.password == app_password) {
		var data = {
			title: req.body.title,
			description: req.body.description,
			imageURL: "data.png",
			pricing: req.body.pricing
		};

		var product = new Product(data);

		cloudinary.uploader.upload(req.files.image_product.path, function(result) { 
			product.imageURL = result.url;
			product.save(function(err){
				res.redirect("/menu");
			});
		});
	}else{
		res.redirect("menu/add");
	}
});

// Se define la ruta get "/menu/edit/:id" la cual va a ser utilizada por el servidor para editar los productos
app.get("/menu/edit/:id", function(req,res){
	var id_product = req.params.id;
	Product.findOne({_id: id_product}, function(err,product){
		res.render("menu/edit", { product: product });
	});
});

// Se define la ruta put "/menu/edit/:id" la cual va a ser utilizada por el servidor para editar los productos
app.put("/menu/edit/:id", function(req,res){
	if (req.body.password == app_password) {
		var data = {
			title: req.body.title,
			description: req.body.description,
			pricing: req.body.pricing
		};

		var id_product = req.params.id;
		Product.update({_id: id_product}, data, function(){
			res.redirect("/menu");
		});
	}else{
		res.redirect("/");
	}
});

// Se define la ruta get "/menu/delete/:id" la cual va a ser utilizada por el servidor para eliminar los productos
app.get("/menu/delete/:id", function(req,res){
	var id_product = req.params.id;
	Product.findOne({_id: id_product}, function(err,product){
		res.render("menu/delete", { product: product });
	});
});

// Se define la ruta put "/menu/delete/:id" la cual va a ser utilizada por el servidor para eliminar los productos
app.put("/menu/delete/:id", function(req,res){
	if (req.body.password == app_password) {
		var data = {
			title: req.body.title,
			description: req.body.description,
			pricing: req.body.pricing
		};

		var id_product = req.params.id;
		Product.remove({_id: id_product}, function(){
			res.redirect("/menu");
		});
	}else{
		res.redirect("/");
	}
});

// Se define la ruta get "/contacto" la cual va a ser utilizada por el usuario para poder ponerse en contacto con el administrador
app.get("/contacto", function(req,res){
	res.render("contacto");
});

// Se define la ruta get "/acercade" la cual va a ser utilizada por el usuario para poder ver la información de la página
app.get("/acercade", function(req,res){
	res.render("acercade");
});

// Se define la ruta get "/admin" la cual va a ser utilizada por el usuario para poder ver editar los productos
app.get("/admin", function(req,res){
	res.render("admin/login");
});

// Se define la ruta post "/admin" la cual va a ser utilizada para poder editar los productos por el servidor
app.post("/admin", function(req,res){
	if (req.body.password == app_password) {
		Product.find(function(err,doc){
			if (err) {
				console.log(err);
			} else {
				res.render("admin/index", { products: doc });
			}
		});
	}else{
		res.redirect("admin");
	}});

// Se define que el servidor va a estar escuchando en el puerto "8080"
app.listen(8080);
