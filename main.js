function WikiData()
{
	this.title;
	this.id;
	this.length;
	this.values;
}


/**
 * Object containing functions to extract and store data from Wikipedia.
 *
 * Makes use of MediaWiki API.
 */
WikipediaAPI = new function()
{
	var data = new WikiData;

	this.getData = function()
	{
		return data;
	}
	
	this.setData = function(value)
	{
		data.title = value.title;
		data.id = value.id;
		data.length = value.length;
		data.values = value.values;
	}
	
	this.getRevisions = function(title)
	{
		var script = document.createElement('script');
		script.className = 'json';
		script.src = 'http://en.wikipedia.org/w/api.php?action=query&prop=revisions&indexpageids&titles=' + title + '&rvprop=user|timestamp|size&rvlimit=max&format=json&callback=WikipediaAPI.extract';
		document.head.appendChild(script);
	}
	
	this.extract = function(jsonp)
	{
		// Get page id to see if query was valid
		data.id = jsonp['query']['pageids'][0];
		
		// Assign data values from jsonp if valid
		if (data.id != -1)
		{
			data.title = jsonp['query']['pages'][data.id]['title'];
			data.length = jsonp['query']['pages'][data.id]['revisions'].length;
			data.values = jsonp['query']['pages'][data.id]['revisions'];
		}
		else
		{
			data.title = "";
			data.length = 0;
			data.values = [];
		}

		// After data is extracted, send it to the charts API for parsing
		ChartsAPI.displayStatus(data);
		ChartsAPI.drawCharts(data);
	}
}



/**
 * Object handling the creation and display of infographics
 *
 * Makes use of Google Charts API.
 */
ChartsAPI = new function()
{
	this.displayStatus = function(data)
	{
		if (data.id != -1)
			document.getElementById('status').innerText = "Displaying data for the last " + data.length + " edits to article \"" + data.title + ".\"";
		else
			document.getElementById('status').innerText = "Article not found. Is the title spelled correctly?";
	}

	this.drawCharts = function(data)
	{
		// Render all charts regardless of display setting
		drawSizeHistogram(data);
		drawUserPieChart(data);
		drawCalendarChart(data);
		
		// Only display the active chart
		document.getElementById(document.querySelector('.active').id.slice(4)).style.display = "block";
	}
	
	/**
	 * Draws a histogram displaying the sizes of article edits in bytes
	 *
	 * @param	data	 WikiData Object with data to display
	 */
	var drawSizeHistogram = function(data)
	{
		// Create a data table
		var table = new google.visualization.DataTable();
		
		// Add table headings
		table.addColumn('string', 'User');
		table.addColumn('number', 'Bytes');
		
		// Iterate through data to add users and sizes to table
		for (i = 0; i < data.length; i++)
		{
			table.addRow([data.values[i].user, data.values[i].size]);
		}

		// Set chart options
		var options = {
			title: 'Distribution of Edit Sizes in Bytes',
			titleTextStyle: {fontSize: 24},
			height: 720,
			width: 720,
			legend: { position: 'none' },
		};
		
		// Draw the chart
		document.getElementById('histogram').style.display = "block";
		var chart = new google.visualization.Histogram(document.getElementById('histogram'));
		chart.draw(table, options);
		document.getElementById('histogram').style.display = "none";
	}
	
	var drawUserPieChart = function(data)
	{
		// Create a data table
		var table = new google.visualization.DataTable();
		
		// Add table headings
		table.addColumn('string', 'User');
		table.addColumn('number', 'Edits');
		
		// Sort data based on user names
		data.values.sort(function(a, b)
		{
			if (a.user > b.user)
				return 1;
			else if (a.user < b.user)
				return -1;
				
			return 0;
		});
		
		// Create new array to hold users and the number of times they have edited
		var edits = [];
		
		// Iterate through data
		for (i = 0; i < data.length; i++)
		{
			if (i > 0 && data.values[i].user == edits[edits.length - 1][0])
			{
				// Increase counter if same user
				edits[edits.length - 1][1] += 1;
			}
			else
			{
				// Else push new user to stack with count of 1
				edits.push([data.values[i].user, 1]);
			}
		}
		
		// Add resulting data to table
		table.addRows(edits);
		
		// Set chart options
		var options = {
			title: 'Percentage of Edits by User',
			titleTextStyle: {fontSize: 24},
			height: 720,
			width: 720,
			legend: { position: 'none' },
		};
		
		// Draw the chart
		document.getElementById('pie').style.display = "block";
		var chart = new google.visualization.PieChart(document.getElementById('pie'));
		chart.draw(table, options);
		document.getElementById('pie').style.display = "none";
	}

	var drawCalendarChart = function(data)
	{
		// Create a data table
		var table = new google.visualization.DataTable();
		
		// Add table headings
		table.addColumn('date', 'Date');
		table.addColumn('number', 'Edits');
		
		// Create new array to hold dates and number of times each has appeared
		var edits = [];
		
		// Create temporary variables to hold date
		var temp;
		
		// Iterate through data
		for (i = 0; i < data.length; i++)
		{
			// Create temporary date variable and slice up timestamp to fill it
			temp = new Date(data.values[i].timestamp.slice(0, 4), data.values[i].timestamp.slice(5, 7) - 1, data.values[i].timestamp.slice(8, 10));
			
			// Compare date elements individually; comparing full dates does not work.
			if (i > 0 && temp.getDate() == edits[edits.length - 1][0].getDate() && temp.getMonth() == edits[edits.length - 1][0].getMonth() && temp.getYear() == edits[edits.length - 1][0].getYear())
			{
				// Increase counter if same date
				edits[edits.length - 1][1] += 1;
			}
			else
			{
				// Else push new date to stack with count of 1
				edits.push([temp, 1]);
			}
		}

		// Add resulting edits count to table
		table.addRows(edits);
		
		// Set chart options
		var options = {
			title: 'Distribution of Edits over Time',
			height: 720,
			width: 720,
			calendar: { cellSize: 12 },
		};

		// Draw the chart
		document.getElementById('calendar').style.display = "block";
		var chart = new google.visualization.Calendar(document.getElementById('calendar'));
		chart.draw(table, options);
		document.getElementById('calendar').style.display = "none";
	}
}


/**
 * Controls user interaction with application
 */
Controller = new function()
{
	this.switchTab = function(item)
	{
		// Deactivate previous tab and corresponding chart
		document.getElementById(document.querySelector('.active').id.slice(4)).style.display = "none";
		document.querySelector('.active').className = "inactive";
		
		// Activate selected tab and corresponding chart
		item.className = "active";
		document.getElementById(document.querySelector('.active').id.slice(4)).style.display = "block";
	}
}
 