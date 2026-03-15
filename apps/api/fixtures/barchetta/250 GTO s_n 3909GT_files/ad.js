var timerResize = 0;
var leftToRight = true;
var delayInPages = 2;
var delayInMinutes = 1;
var animTime = 15000;
var pauseTime = 2000;

function ReplaceRevive() {
	var bnrAny = false;
	
	var bnr465 = document.querySelector('script[src*="moduleid=465"'); 
	if ( bnr465 ) {
		bnrAny = true;
		bnr465.parentNode.innerHTML = '<ins data-revive-zoneid="36" data-revive-id="aed94be0cbf5a29e173b7c4e3650c2c8"></ins>';
	}

	var bnr440 = document.querySelector('script[src*="moduleid=440"'); 
	if ( bnr440 ) {
		bnrAny = true;
		bnr440.parentNode.innerHTML = '<ins data-revive-zoneid="36" data-revive-id="aed94be0cbf5a29e173b7c4e3650c2c8"></ins>';
	}
	
	var bnr412 = document.querySelector('script[src*="moduleid=412"'); 
	if ( bnr412 ) {
		bnrAny = true;
		var revive412 = '<style>ins > a > * { margin: 1px auto; text-align: initial; }</style>';
		revive412 += '<ins data-revive-zoneid="24" data-revive-id="aed94be0cbf5a29e173b7c4e3650c2c8"></ins>';
		revive412 += '<ins data-revive-zoneid="25" data-revive-block="1" data-revive-blockcampaign="1" data-revive-id="aed94be0cbf5a29e173b7c4e3650c2c8"></ins>';
		revive412 += '<ins data-revive-zoneid="25" data-revive-block="1" data-revive-blockcampaign="1" data-revive-id="aed94be0cbf5a29e173b7c4e3650c2c8"></ins>';
		revive412 += '<ins data-revive-zoneid="26" data-revive-block="1" data-revive-blockcampaign="1" data-revive-id="aed94be0cbf5a29e173b7c4e3650c2c8"></ins>';
		revive412 += '<ins data-revive-zoneid="26" data-revive-block="1" data-revive-blockcampaign="1" data-revive-id="aed94be0cbf5a29e173b7c4e3650c2c8"></ins>';
		revive412 += '<ins data-revive-zoneid="27" data-revive-block="1" data-revive-blockcampaign="1" data-revive-id="aed94be0cbf5a29e173b7c4e3650c2c8"></ins>';
		revive412 += '<ins data-revive-zoneid="27" data-revive-block="1" data-revive-blockcampaign="1" data-revive-id="aed94be0cbf5a29e173b7c4e3650c2c8"></ins>';
		revive412 += '<ins data-revive-zoneid="28" data-revive-block="1" data-revive-id="aed94be0cbf5a29e173b7c4e3650c2c8"></ins>';
		revive412 += '<ins data-revive-zoneid="28" data-revive-block="1" data-revive-id="aed94be0cbf5a29e173b7c4e3650c2c8"></ins>';
		revive412 += '<ins data-revive-zoneid="28" data-revive-block="1" data-revive-id="aed94be0cbf5a29e173b7c4e3650c2c8"></ins>';
		revive412 += '<ins data-revive-zoneid="29" data-revive-block="1" data-revive-id="aed94be0cbf5a29e173b7c4e3650c2c8"></ins>';
		revive412 += '<ins data-revive-zoneid="29" data-revive-block="1" data-revive-id="aed94be0cbf5a29e173b7c4e3650c2c8"></ins>';
//		revive412 += '<script async src="//ads.argos.net/adserver/www/delivery/asyncjs.php"></script>';
		bnr412.parentNode.innerHTML = revive412;
	}
	
	if ( bnrAny ) {
		var js = document.createElement("script");
		js.type = "text/javascript";
		js.src = "//ads.argos.net/adserver/www/delivery/asyncjs.php";
		document.body.appendChild(js);
	}
}

function GetAnimTime() {
	return parseInt(animTime * $(window).width() / 1000);
}

function OnWindowResize() {
	var w = $(window);
	$('#adBox').css('top', parseInt(w.height()/4) + 'px');
	$('#adBox').css('width', w.width() + 'px');
	$('#adBack').css('width', w.width() + 'px');
}

function StartAdBox(MinutesToHide, PagesToHide) {
	var displayAd = true;
	if (MinutesToHide > 0 || PagesToHide > 0) {
		var i,k,v;
		var ARRcookies = document.cookie.split(";");
		for (i = 0; i < ARRcookies.length; i++) {
			k = ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
			v = ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
			k = k.replace(/^\s+|\s+$/g,"");
			if (k == 'DisplayAdCnt') {
				if (parseInt(v) > 0) {
					PagesToHide = parseInt(v) -1;
					displayAd = false;
				}
				break;
			}
		}

		var exdate = new Date();
		exdate.setTime(exdate.getTime() + (MinutesToHide*60*1000));
		document.cookie = "DisplayAdCnt=" + PagesToHide + "; path=/; expires=" + exdate.toUTCString();
	}

	if (displayAd)
		DisplayAdBox();
}

function DisplayAdBox() {
	var w = $(window);
	var box = $('#adBox');
	var back = $('#adBack');
	var cont = $('#adCont');
	var cb = Math.floor(Math.random()*99999999999);
//	cont.html( "<a target='_blank' href='https://ads.argos.net/adserver/www/delivery/ck.php?n=aa2c8ca1&amp;cb=" + cb + "'><img border='0' alt='' src='https://ads.argos.net/adserver/www/delivery/avw.php?zoneid=36&amp;n=aa2c8ca1&amp;cb=" + cb + "' /></a>" );
	cont.html( "<iframe id='ab7a2f78' name='ab7a2f78' src='http://ads.argos.net/adserver/www/delivery/afr.php?zoneid=36&amp;cb=" + cb + "' frameborder='0' scrolling='no' width='728' height='90' allow='autoplay'></iframe>" );
	
	if (leftToRight)
		cont.css('left', '-'+cont.width()+'px');
	else
		cont.css('left', w.width()+'px');

	OnWindowResize();
	box.css('display', 'block');
	box.css('z-index', '30000');
	
	back.css('background-color', '#000000');
	back.fadeTo(0, 0.25);
	back.click(function () { CloseAdBox(); });
	
	if (pauseTime <= 0) {
		if (leftToRight)
			cont.animate({left:w.width()+'px'}, GetAnimTime(), function() { CloseAdBox(); });
		else
			cont.animate({left:'-'+cont.width()+'px'}, GetAnimTime(), function() { CloseAdBox(); });
	}
	else {
		if (leftToRight)
			cont.animate({left:parseInt((w.width()-cont.width())/2)+'px'}, GetAnimTime()/2, function() {
				window.setTimeout("$('#adCont').animate({left:$(window).width()+'px'}, GetAnimTime()/2, function() { CloseAdBox(); });", pauseTime);
			});
		else
			cont.animate({left:parseInt((w.width()-cont.width())/2)+'px'}, GetAnimTime()/2, function() {
				window.setTimeout("$('#adCont').animate({left:'-'+$('#adCont').width()+'px'}, GetAnimTime()/2, function() { CloseAdBox(); });", pauseTime);
			});
	}
}

function CloseAdBox() {
	$('#adBox').fadeOut('fast', function () { $('#adBox').remove(); });
}

$(document).ready(function () {
	ReplaceRevive();
	StartAdBox(delayInMinutes, delayInPages);

	$(window).resize(function () {
		if (timerResize != 0)
			window.clearTimeout(timerResize);
		timerResize = window.setTimeout('OnWindowResize();', 500);
	});
});
