var _gaq = _gaq || [];

function loadtracking() {
	window._gaq.push(['_setAccount', 'UA-32545823-1']);
	window._gaq.push(['_trackPageview']);

	(function() {
		var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
		ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
		var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
	})();
}

function trackOutboundLink(link) { 
	try { 
		_gaq.push(['_trackEvent', 'Outbound Link', link.href]); 
	} catch(err){}
	 
	setTimeout(function() {
		document.location.href = link.href;
	}, 100);
}


var serviceTimeouts = {};

function loadnotifications(){

	var url = 'http://api.adaofeliz.com/v1_0/notifications/';  
	var serviceid = 'loadnotifications'; 

	var delay = Math.floor(Math.random() * 60000) + 5000;

	$.ajax(
	{ url: url, dataType: 'jsonp', jsonp: 'callback', 

		success: function(data) {

			content = data;

			if(content && typeof(content['notifications']) !== 'undefined') {
				for (var key in content['notifications']) {
					value = content['notifications'][key];
					if(value > 0) {
						$("#" + key + "-social-notification").text(value);
						$("#" + key + "-social-notification").show(1000);
					} else {
						$("#" + key + "-social-notification").hide(1000);
					}
				}
			}
			clearTimeout(serviceid); 

			serviceTimeouts[serviceid] = setTimeout(function(){
				loadnotifications();
			}, delay);

		}, 
		error: function (request, status, error) {

			clearTimeout(serviceid);
			serviceTimeouts[serviceid] = setTimeout(function(){
				loadnotifications();
			}, delay);
		}
	});

  return false; 
};