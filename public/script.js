var isOpen = {};

function toggleBookSeries(name)
{
	if(isOpen[name])
	{
		$("#series-" + name).hide(0);
		$("#book-view-" + name).text("(view)");
	}
	else
	{
		$("#series-" + name).show(0);
		$("#book-view-" + name).text("(hide)");
	}

	isOpen[name] = !isOpen[name];
}