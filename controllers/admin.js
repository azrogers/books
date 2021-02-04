var express = require("express"),
	_util = require("../util"),
	books = require("../books"),
	fs = require("fs"),
	async = require("async"),
	xml2js = require("xml2js"),
	path = require("path"),
	aws = require("../aws"),
	GuildModel = require("../models/guild");

function guilds(nconf, db, router)
{
	router.get("/guilds/info.json", (req, res) => {
		if(!req.query.id)
			return res.json({ error: true, message: "No ID provided." });
		GuildModel.load(db, req.query.id, (err, model) => {
			if(err) throw err;

			if(model == null)
			{
				res.json({ error: false, data: null });
			}
			else
				res.json({ error: false, data: model });
		});
	});
}

module.exports = function(nconf, db)
{
	var router = express.Router();
	router.use(_util.checkAccount(nconf, _util.PERMISSION_LEVELS.ADMIN));

	// unsorted books
	router.get("/unsorted.json", (req, res) => {
		books.getUnsortedBooks(nconf, req.query.restricted, (unsorted) => {
			var dict = {};
			unsorted.forEach((b) => {
				dict[b.name] = {
					name: b.name,
					authors: ["Unknown"],
					category: "Other"
				};
			});
			res.json(dict);
		});
	});

	router.get("/opfs", (req, res) => {
		var files = fs.readdirSync("data")
			.filter((f) => f.substr(-3) == "opf");
		var opfs = files
			.map((f) => fs.readFileSync("data/" + f, "utf8"))
			.map((f) => { return (cb) => xml2js.parseString(f, cb) });

		async.parallel(opfs, (err, results) => {
			if(err) throw err;

			var books = {};
			for(var i = 0; i < results.length; i++)
			{
				var filename = files[i];
				var data = results[i];
				var title = data.package.metadata[0]["dc:title"][0];
				var authors = 
					data.package.metadata[0]["dc:creator"]
					.map((a) => {
						var name = a["_"];
						var parts = name.split(",");
						if(parts.length == 2)
						{
							name = parts[1].trim() + " " + parts[0].trim();
						}

						return name;
					});

				books[path.basename(filename, ".opf")] = {
					name: title,
					authors: authors,
					category: "Other"
				};
			}

			res.json(books);
		});
	});

	// a logged in admin user can visit this url to reload the config file
	// bad solution...
	router.post("/reload", (req, res) => {
		nconf.file({ file: "config.json" });
		res.send("reloaded ok");
	});

	router.post("/cache/clear", (req, res) => {
		aws(nconf).clearBooksCache();
		res.send("cleared ok");
	});

	router.get("/", (req, res) => {
		_util.renderPage(req, res, nconf, "admin/index");
	});

	//guilds(nconf, db, router);

	return router;
}