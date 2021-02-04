var AWS = require("aws-sdk");

var s3 = null;
var booksList = null;

module.exports = function(config)
{
	if(s3 == null)
	{
		var credentials = new AWS.Credentials(config.get("s3:id"), config.get("s3:secret"));
		AWS.config.credentials = credentials;
		var ep = new AWS.Endpoint(config.get("s3:endpoint"));
		s3 = new AWS.S3({ endpoint: ep });
	}

	function clearBooksCache()
	{
		booksList = null;
	}

	function listBooks(cb)
	{
		if(booksList != null)
		{
			return cb(null, booksList);
		}

		s3.listObjectsV2({ Bucket: config.get("s3:bucket") }, (err, data) => {
			if(err)
			{
				return cb(err, null);
			}

			booksList = data.Contents.map(f => f.Key);
			cb(null, booksList);
		});
	}

	function getBook(filename, cb)
	{
		var params = { Bucket: config.get("s3:bucket"), Key: filename, Expires: 60 * 60 * 24 };
		s3.getSignedUrl("getObject", params, cb);
	}

	return {
		listBooks: listBooks,
		getBook: getBook,
		clearBooksCache: clearBooksCache
	};
}