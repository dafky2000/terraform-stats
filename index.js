const fetch = require('node-fetch');
const express = require('express');
const app = express();
const router = express.Router();
const path = __dirname + '/views/';
const mustache_express = require('mustache-express');

// Register '.mustache' extension with The Mustache Express
app.engine('mustache', mustache_express ());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');

let LAST_UPDATE = new Date();
let DATA = {};
let RENDERED_DATA = {};
function data_update() {
	fetch('https://api.auction.decentraland.org/api/parcelState/range/-150,-150/150,150')
	// fetch('https://api.auction.decentraland.org/api/parcelState/range/-50,-50/50,50')
		.then(function(res) {
			return res.text();
		}).then(function(ret) {
			console.log('Received new data at ' + LAST_UPDATE.toLocaleString());
			DATA = JSON.parse(ret).data;
			LAST_UPDATE = new Date();
			setTimeout(data_update, 300000);
		}).then(function() {
			const data_for_auction = DATA.filter(function(data) { return !data.projectId; });
			const data_w_amount = data_for_auction.filter(function(data) { return (!isNaN(parseInt(data.amount))); });
			const data_wo_amount = data_for_auction.filter(function(data) { return (isNaN(parseInt(data.amount))); });
			const data_w_amount_first = data_w_amount.filter(function(data) { return (data.x <= 13 && data.x >= -12 && data.y <= 12 && data.y >= -12); });
			const data_parcels_per_address = data_w_amount.reduce(function(accum, data) { accum[data.address] = (accum[data.address] || 0) + 1; return accum;   }, {});
			const data_parcels_per_address_sorted = Object.keys(data_parcels_per_address).map(function(item) { return [item, data_parcels_per_address[item]]; }).sort(function(a, b) { return b[1] - a[1]; });
			const data_amount_per_address = data_w_amount.reduce(function(accum, data) { accum[data.address] = (accum[data.address] || 0) + parseInt(data.amount); return accum; }, {});
			const data_amount_per_address_sorted = Object.keys(data_amount_per_address).map(function(item) { return [item, data_amount_per_address[item]]; }).sort(function(a, b) { return b[1] - a[1]; });

			RENDERED_DATA = {
				public: {
					total_bid: data_w_amount.reduce(function(accum, data) { return accum += parseInt(data.amount); }, 0).toLocaleString(),
					avg_bid: parseInt(
							data_w_amount.reduce(function(accum, data) { return accum += parseInt(data.amount);  }, 0) / data_w_amount.length
					).toLocaleString(),
					avg_bid_first_circle: parseInt(
							data_w_amount_first.reduce(function(accum, data) { return accum += parseInt(data.amount);  }, 0) / data_w_amount_first.length
					).toLocaleString(),
					max_bid: Math.max.apply(null, data_w_amount.map(function(data) { return data.amount; })).toLocaleString(),
					parcels_wo_bids: data_wo_amount.length.toLocaleString(),
					most_winning_address: data_parcels_per_address_sorted[0][0].toLocaleString(),
					most_winning_count: data_parcels_per_address_sorted[0][1].toLocaleString(),
					most_bid: data_amount_per_address_sorted[0][1].toLocaleString(),
					last_update: LAST_UPDATE.toLocaleString(),
				}
			};
		});
};

router.use(function (req,res,next) {
	console.log("/" + req.method);
	next();
});

router.get("/",function(req,res){
	res.render(path + "index.mustache", RENDERED_DATA);
});

// router.get("/about",function(req,res){
		// res.sendFile(path + "about.html");
// });

// router.get("/contact",function(req,res){
		// res.sendFile(path + "contact.html");
// });

app.use("/",router);

// app.use("*",function(req,res){
// 	res.sendFile(path + "404.html");
// });

data_update();
app.listen(8081,function(){
	console.log("Live at port 8081");
});
