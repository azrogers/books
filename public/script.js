var isOpen = {};

function toggleBookSeries(name)
{
	if(isOpen[name])
	{
		$("#series-" + name).hide(0);
		$("#book-view-" + name).text("[+]");
	}
	else
	{
		$("#series-" + name).show(0);
		$("#book-view-" + name).text("[-]");
	}

	isOpen[name] = !isOpen[name];
}

$(document).ready(function() {
	$(".category-title").click((e) => {
		var parent = $(e.target).closest(".category");
		var container = $(parent.find(".category-books")[0]);
		if(container.is(":hidden"))
		{
			$(container).show();
			parent.find(".category-hidden-display").text("[-]");
		}
		else 
		{
			$(container).hide();
			parent.find(".category-hidden-display").text("[+]");
		}
	});

	$(".category .category-books").hide();
	$(".category-hidden-display").text("[+]");
});