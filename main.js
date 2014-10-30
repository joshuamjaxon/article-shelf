/**
 * Data type for storing Wikipedia Data
 */
function WikiData()
{
	this.title;		// Title
	this.id;		// Page ID
	this.length;	// Number of revisions found
	this.values;	// Actual revision data as array
}


/**
 * Object containing functions to extract and store data from Wikipedia.
 *
 * Makes use of MediaWiki API.
 */
WikipediaAPI = new function()
{
	// Private variable containing data retrieved from Wikipedia
	var data = new WikiData;

	/**
	 * Accessor method for data variable
	 */
	this.getData = function()
	{
		return data;
	}
	
	/**
	 * Sets data to another WikiData object.
	 *
	 * ONLY USED FOR DEBUGGING.
	 * 
	 * @param	value	WikiData object to be copied to data
	 */
	this.setData = function(value)
	{
		data.title = value.title;
		data.id = value.id;
		data.length = value.length;
		data.values = value.values;
	}
	
	/**
	 * Removes all nodes belonging to the class 'json.'
	 *
	 * These nodes are those from which JSONP data has been obtained from Wikipedia.
	 */
	this.deleteJSONP = function()
	{
		// Set inner HTML of JSON dump to blank, erasing its contents.
		document.getElementById('json-dump').innerHTML = "";
	}
	
	/**
	 * Adds a script tag with a query to the Wikipedia API, which returns JSONP.
	 * 
	 * Gets page ID and revision history for target article, including user, size, and timestamp
	 *
	 * @param	title	Title of article to get revision history for
	 */
	this.getRevisions = function(title)
	{
		// Set status to "Retrieving data from Wikipedia . . ."
		document.getElementById('status').innerText = "Retrieving data from Wikipedia . . .";
		
		// Create new script element for JSONP 
		var script = document.createElement('script');
		script.className = 'jsonp';
		
		// Source url get pageids and revision history for title
		script.src = 'http://en.wikipedia.org/w/api.php?action=query&prop=revisions&indexpageids&titles=' + title + '&rvprop=user|timestamp|size&rvlimit=max&format=json&callback=WikipediaAPI.extract';
		
		// Appends script to document and retrieves data from wikipedia
		document.getElementById('json-dump').appendChild(script);
	}
	
	/**
	 * This function is used as a callback to extract data from JSONP.
	 * It also updates the display status and calls the function which draws the charts.
	 * Finally, it deletes the script tag added to the JSON dump because it is no longer necessary.
	 *
	 * @param	jsonp	Object returned from query
	 */
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
		// Otherwise set them to blank
		else
		{
			data.title = "";
			data.length = 0;
			data.values = [];
		}

		// After data is extracted, send it to the charts API for parsing
		ChartsAPI.displayStatus(data);
		ChartsAPI.drawCharts(data);
		
		// JSONP is no longer neessary, so remove it
		this.deleteJSONP();
	}
}



/**
 * Object handling the creation and display of infographics
 *
 * Makes use of Google Charts API.
 */
ChartsAPI = new function()
{
	/**
	 * Changes the status of the application based on whether or not the query has been found.
	 * A page id less than zero is indicative of a query that has not been found.
	 *
	 * @param	data	 WikiData Object with page id of query
	 */
	this.displayStatus = function(data)
	{
		// If page ID is valid, or greater than one, then display the number of revisions returned.
		if (data.id >= 0)
			document.getElementById('status').innerText = "Displaying data for the last " + data.length + " edits to article \"" + data.title + ".\"";
		// Otherwise set status to not found.
		else
			document.getElementById('status').innerText = "Article not found. Is the title spelled correctly?";
	}

	/**
	 * Turns on tab interface and draws charts based on the data passed to it.
	 * 
	 * @param	data	 WikiData Object with data to display
	 */
	this.drawCharts = function(data)
	{
		// Make sure chart section and tabs are displayed
		document.querySelector('section').style.display = "block";
		document.querySelector('#tabs').style.display = "block";
	
		// Render all charts regardless of display setting
		drawSizeHistogram(data);	
		drawCalendarChart(data);	// Must be called before pie chart
		drawUserPieChart(data);		
		
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
		
		// Chart must be turned on to draw properly.
		document.getElementById('histogram').style.display = "block";
		
		// Draw the chart
		var chart = new google.visualization.Histogram(document.getElementById('histogram'));
		chart.draw(table, options);
		
		// Hide the chart
		document.getElementById('histogram').style.display = "none";
	}
	
	/**
	* Draws a calendar chart displaying the density of edits each day.
	*
	* Precondition: Must be called before pie chart!
	*
	* @param	data	 WikiData Object with data to display
	*/
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
		
		// Get number of years being displayed
		var today = new Date();
		
		// Set chart options
		var options = {
			title: 'Distribution of Edits over Time',
			height: ((today.getFullYear() - edits[edits.length - 1][0].getFullYear()) - (today.getFullYear() - edits[0][0].getFullYear()) + 1) * 110 + 25,
			width: 720,
			calendar: { cellSize: 12 },
		};

		// Chart must be displayed to draw properly
		document.getElementById('calendar').style.display = "block";
		
		// Draw the chart
		var chart = new google.visualization.Calendar(document.getElementById('calendar'));
		chart.draw(table, options);
		
		// Hide the chart
		document.getElementById('calendar').style.display = "none";
	}
	
	/**
	* Draws a pie chart displaying the percentage of edits performed by each user
	*
	* Note: Should be called after drawCalendarChart due to data sorting.
	*
	* @param	data	 WikiData Object with data to display
	*/
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
		
		// Create new array to hold revised edits, which lumps single users into one row
		var revisedEdits = [];
		
		// Set the first row of revised edits to single users
		revisedEdits.push(["Single Edits", 0]);
		
		// Iterate through edits
		for (i = 0; i < edits.length; i++)
		{
			// If the row has only one edit, increment single user counter
			if (edits[i][1] === 1)
			{
				revisedEdits[0][1] += 1;
			}
			// Otherwise push the row to revised edits
			else
			{
				revisedEdits.push(edits[i]);
			}
		}
		
		// Add resulting data to table
		table.addRows(revisedEdits);
		
		// Set chart options
		var options = {
			title: 'Percentage of Edits by User',
			titleTextStyle: {fontSize: 24},
			height: 720,
			width: 720,
			legend: { position: 'none' },
		};
		
		// Chart must be displayed to draw properly
		document.getElementById('pie').style.display = "block";
		
		// Draw the chart
		var chart = new google.visualization.PieChart(document.getElementById('pie'));
		chart.draw(table, options);
		
		// Hide the chart
		document.getElementById('pie').style.display = "none";
	}

}


/**
 * Object containing functions that control user interaction with application
 */
Controller = new function()
{
	/**
	 * Handles the switching of tabs and displayed graphs.
	 *
	 * Typically passed "this" via an onclick event.
	 */
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
 