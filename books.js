var fs = require("fs"),
    path = require("path"),
    sort = require("javascript-natural-sort"),
	_util = require("./util"),
	aws = require("./aws");

function parseBookInfo(nconf, includeUnsorted, restricted, books)
{
	// read books.json
	var info = {};

	if(restricted)
		info = JSON.parse(fs.readFileSync(nconf.get("restricted_path") + "/books.json"));
	else
		info = JSON.parse(fs.readFileSync(nconf.get("path") + "/books.json"));

	var unsortedCount = 0;
	var categories = {};
	var series = {};

	// this is a bit of a mess, but basically what we're doing here is going over every book
	// and finding out if we have an info on it in books.json
	var ba = 
		Object.keys(books)
		.map(function(k) {
			var book = books[k];
			var bookInfo = info[k];
			// nothing in books.json, go with defaults
			if(!bookInfo)
			{
				book.unsorted = true;
				unsortedCount++;
				return book;
			}

			book.name = bookInfo.name || book.name;
			book.authors = bookInfo.authors;
			book.category = bookInfo.category || "Other";
			book.series = bookInfo.series || null;
			book.seriesPos = bookInfo.seriesPos || 1;
			return book;
		})
		.forEach((b) => {
			if(!includeUnsorted && b.unsorted) return;

			// add book to the proper category
			if(categories[b.category])
			{
				categories[b.category].push(b);
			}
			else
			{
				categories[b.category] = [b];
			}

			// add book to the proper series if a series is set
			if(b.series != null && series[b.series])
			{
				series[b.series].push(b);
			}
			else if(b.series != null)
			{
				series[b.series] = [b];
			}
		});

	// check to see if we're missing any books
	Object.keys(info).forEach((k) => {
		if(!books[k])
		{
			console.log("Missing book: " + k);
		}
	});

	// put in placeholders for series
	Object.keys(series).forEach((k) => {
		var bk = "_series_" + k;
		var category = series[k][0].category;

		books[bk] = {
			name: info._series[k].name,
			authors: info._series[k].authors,
			extensions: [],
			category: category,
			key: k,
			keyId: k.replace(/\s+/g, "_"),
			series: null,
			isSeries: true
		};

		if(categories[category])
			categories[category].push(books[bk]);
		else
			categories[category] = [books[bk]];

		series[k].sort((a, b) => a.seriesPos - b.seriesPos);
	});

	// sort books inside categories
	Object.keys(categories).forEach((c) => {
		if(!categories[c])
			categories[c] = [];
		categories[c].sort((a, b) => sort(_util.sortTitle(a.name.toLowerCase()), _util.sortTitle(b.name.toLowerCase())));
	});

	var categoryIds = {};
	info._categories.forEach((c) => {
		categoryIds[c] = c.replace(/[^A-Za-z]/g, "_").toLowerCase();
	});

	return {books: categories, categories: info._categories.sort(), categoryIds: categoryIds, series: series, unsortedCount: unsortedCount};
}

// get all the books
// includeUnsorted - should we include books that have no metadata? default is false
// restricted - should we get books that are restricted or regular books? default is false (regular)
function getBooks(nconf, includeUnsorted, restricted, cb)
{
	if(includeUnsorted === undefined) includeUnsorted = false;
	if(restricted === undefined) restricted = false;

	aws(nconf).listBooks((err, files) => {
		if(err)
		{
			return cb(err, null);
		}

		var books = {};

		// go file by file through the data folder
		// we do this instead of parsing through books.json first,
		// so that we can add files that aren't in books.json
		files.forEach(function(f) {
			var ext = path.extname(f);
			// ignore books.json!
			if(ext == ".json" || ext == ".opf")
			{
				return;
			}

			var name = path.basename(f, ext);
			ext = ext.substr(1);
			// if we've already added this book, add a new extension
			if(books[name])
			{
				books[name].extensions.push(ext);
				return;
			}

			books[name] = {
				name: name,
				extensions: [ext],
				file: name,
				unsorted: false,
				category: "Other",
				series: null
			};
		});

		cb(parseBookInfo(nconf, includeUnsorted, restricted, books));
	});
};

function getUnsortedBooks(nconf, restricted, cb)
{
	getBooks(nconf, true, restricted, (res) => {
		cb(res.books["Other"].filter(b => b.unsorted));
	});
}

exports.getBooks = getBooks;
exports.getUnsortedBooks = getUnsortedBooks;