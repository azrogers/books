var crypto = require("crypto"),
	express = require("express"),
	path = require("path"),
	fs = require("fs"),
	xml2js = require("xml2js"),
	async = require("async"),
	_util = require("../util"),
	books = require("../books"),
	aws = require("../aws");

module.exports = function(nconf)
{
	var router = express.Router();

	// get book index
	router.get("/", _util.checkAccount(nconf), function(req, res) {
		books.getBooks(nconf, false, false, (data) => {
			data.restricted = false;
			var hash = crypto.createHash("sha256").update(req.user.id + "|" + nconf.get("share_secret")).digest("hex").substr(0, 16);			
			var urlKey = encodeURIComponent(new Buffer(hash + "|" + req.user.id).toString("base64"));
			data.urlFor = (f) => {
				return nconf.get("url") + "/file/" + urlKey + "/" + encodeURIComponent(f);
			};
			_util.renderPage(req, res, nconf, "index", data);
		});
	});

	router.get("/info", function(req, res) {
		if(_util.isAuthenticated(req))
		{
			return res.redirect(nconf.get("url") + "/");
		}

		_util.renderPage(req, res, nconf, "info", { render_menubar: false });
	});

	// download book
	router.get("/file/:code/:name", function(req, res) {
		// validate URL code
		var code = new Buffer(req.params.code, "base64").toString("utf8");
		var data = code.split("|");
		var hash = 
			crypto.createHash("sha256")
			.update(data[1] + "|" + nconf.get("share_secret"))
			.digest("hex")
			.substr(0, 16);

		if(hash != data[0])
			return res.status(403).send("access denied - let me know");

		var name = req.params.name;
		aws(nconf).getBook(name, (err, url) => {
			if(err)
			{
				throw err;
			}

			res.redirect(url);
		});
	});

	return router;
}