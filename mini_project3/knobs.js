nx.onload = function() {
				/* Event listening  options */
				/*
				 This is the default anyway!
				*/
				nx.sendsTo("js");

				/* 
				this code can be useful for logging any interface events
				*/
				for (var key in nx.widgets) {
					with (nx.widgets[key]) {
						on('*', function(data) {
							// code that will be executed
							console.log(canvasID, data)
						})
					}
				} 
				
				/* styles */
			    // nx.colorize("accent", "#347");
			    // nx.colorize("border", "#bbb");
			    // nx.colorize("fill", "#eee");

			    nx.colorize("#00CCFF"); // sets accent (default)
	  			nx.colorize("border", "#222222");
	  			nx.colorize("fill", "#222222");
		
	  			dial1.val.value = 0.5;
	  			dial1.draw();
			    /* matrix settings
				//a widget can be accessed with its name
				matrix1.row = 6;
				//or as a property of nx.nxObjects
				nx.nxObjects["matrix1"].col = 6;
				
				matrix1.init();
				matrix1.sequence(400);
				matrix1.jumpTo({row:1,col:2});
				matrix1.sequenceMode = "linear"; // default. you can also use 'random'
				*/
			}