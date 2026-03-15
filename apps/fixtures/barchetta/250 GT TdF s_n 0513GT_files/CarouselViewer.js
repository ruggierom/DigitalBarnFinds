var CurrentImages = null;
function loadjscssfile(filename, filetype, callback) {
    if (filetype == "js") { //if filename is a external JavaScript file
        var fileref = document.createElement('script')
        fileref.setAttribute("type", "text/javascript")
        fileref.setAttribute("src", filename)
        if (callback)
            fileref.onload = callback;
    }
    else if (filetype == "css") { //if filename is an external CSS file
        var fileref = document.createElement("link")
        fileref.setAttribute("rel", "stylesheet")
        fileref.setAttribute("type", "text/css")
        fileref.setAttribute("href", filename)
        if (callback)
            fileref.onload = callback;
    }
    if (typeof fileref != "undefined") {
        var scriptF = document.getElementsByTagName(fileref);
        document.getElementsByTagName("head")[0].appendChild(fileref)
    }
}

(function (a) { if (typeof define === "function" && define.amd) { define(["jquery"], a) } else { a(jQuery) } }(function (d) { var c = "ellipsis", b = '<span style="white-space: nowrap;">', e = { lines: "auto", ellipClass: "ellip", responsive: false }; function a(h, q) { var m = this, w = 0, g = [], k, p, i, f, j, n, s; m.$cont = d(h); m.opts = d.extend({}, e, q); function o() { m.text = m.$cont.text(); m.opts.ellipLineClass = m.opts.ellipClass + "-line"; m.$el = d('<span class="' + m.opts.ellipClass + '" />'); m.$el.text(m.text); m.$cont.empty().append(m.$el); t() } function t() { if (typeof m.opts.lines === "number" && m.opts.lines < 2) { m.$el.addClass(m.opts.ellipLineClass); return } n = m.$cont.height(); if (m.opts.lines === "auto" && m.$el.prop("scrollHeight") <= n) { return } if (!k) { return } s = d.trim(m.text).split(/\s+/); m.$el.html(b + s.join("</span> " + b) + "</span>"); m.$el.find("span").each(k); if (p != null) { u(p) } } function u(x) { s[x] = '<span class="' + m.opts.ellipLineClass + '">' + s[x]; s.push("</span>"); m.$el.html(s.join(" ")) } if (m.opts.lines === "auto") { var r = function (y, A) { var x = d(A), z = x.position().top; j = j || x.height(); if (z === f) { g[w].push(x) } else { f = z; w += 1; g[w] = [x] } if (z + j > n) { p = y - g[w - 1].length; return false } }; k = r } if (typeof m.opts.lines === "number" && m.opts.lines > 1) { var l = function (y, A) { var x = d(A), z = x.position().top; if (z !== f) { f = z; w += 1 } if (w === m.opts.lines) { p = y; return false } }; k = l } if (m.opts.responsive) { var v = function () { g = []; w = 0; f = null; p = null; m.$el.html(m.text); clearTimeout(i); i = setTimeout(t, 100) }; d(window).on("resize." + c, v) } o() } d.fn[c] = function (f) { return this.each(function () { try { d(this).data(c, (new a(this, f))) } catch (g) { if (window.console) { console.error(c + ": " + g)} } })}}));

var Carousel = new function () {
    var SLOpen = -1;
    var CurrentIndex = -1;
    var MiddleIndex = 0;
    var OnePageSize = 1;
    var nSize = 58;
    var ThumbContainer;
    var PageNo = 0;
    var Images = 0;
    var ListItems = 60;
    var LoadOffset = -1;
    var Init;
    var zoomeInThumbs = true;
    var nMulti = 1.6;
    var InLoad = false;
    var GotoIndex = -1;
    var ImagesInView = -1;
    var mouser = null;
    var LastFillRest = -1;
    var FillRest = -1;
    var dtLastLoad = null;
    var HeaderVisible = true;
    var BodyOverflow;
    var OpenUrlOnClose = '';
    var PerformOnEnd = null;
    var LoopThrought = 1;
    var SecondsStay = 4;
    var dtImageGotAt = null;
    var ShowCloseButton = true;
    var AutoStart = false;
    var AutoStartSet = false;
    var WinMinWidth = 470;
    var ShowPlayBtnOnStart = 0;
    var IncrementViews = true;
    var FirstStart = 1;
    var _FlatMode = -1;
    var _CurrentDir = 0;
    var _SearchFor = "";
    var _SearchForAny = "";
    var _SearchForExact = "";
    var _SearchOption = "+";
    var _FolderType = -1;
    var _OnCloseFunc = null;
    var _ShowCloseTop = false;
    var lastActionWasBack = false;
    var thumbs = new Array();
    var initialSizeX = $(window).width();
    var initialSizeY = $(window).height();
    var previousOrientation = window.orientation;
    var wasZoomed = false;
    var eStartClick = null;
    var startUp = new Date();
    var ShowInfoRightParam = "alwayson";//"auto";
    var ShowInfoRight = "off";
    var ShowInfoRightWidth = 260;
    var ShowInfoTopLeft = true;
    var ShowInfoTopLeftSave = null;
    var imgInf = true;
    var imgGeo = true;
    var FirstImageDone = 3;
    var TypeOfVisibleItem = "0";
    var ImageSearchType = '11100';
    var InVideoPlaying = false;
    var SortOrder = "default";
    var SortOrderOriginal = "";
    var ShowRandomButton = true;
    var LoadingImageInProg = false;
    var tmbimages = new Array(120);
    var CheckHotSpot = true;
    var StopTimer = -1;
    var OpenNewWnd = true;
    var _FolderTypeOriginal = -1;
    var AfterImage = null;
    var BackgroundColor = '#131313';
    var theVideo = null;

    function beep() {
        var snd = new Audio("data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA//uQZAUAB1WI0PZugAAAAAoQwAAAEk3nRd2qAAAAACiDgAAAAAAABCqEEQRLCgwpBGMlJkIz8jKhGvj4k6jzRnqasNKIeoh5gI7BJaC1A1AoNBjJgbyApVS4IDlZgDU5WUAxEKDNmmALHzZp0Fkz1FMTmGFl1FMEyodIavcCAUHDWrKAIA4aa2oCgILEBupZgHvAhEBcZ6joQBxS76AgccrFlczBvKLC0QI2cBoCFvfTDAo7eoOQInqDPBtvrDEZBNYN5xwNwxQRfw8ZQ5wQVLvO8OYU+mHvFLlDh05Mdg7BT6YrRPpCBznMB2r//xKJjyyOh+cImr2/4doscwD6neZjuZR4AgAABYAAAABy1xcdQtxYBYYZdifkUDgzzXaXn98Z0oi9ILU5mBjFANmRwlVJ3/6jYDAmxaiDG3/6xjQQCCKkRb/6kg/wW+kSJ5//rLobkLSiKmqP/0ikJuDaSaSf/6JiLYLEYnW/+kXg1WRVJL/9EmQ1YZIsv/6Qzwy5qk7/+tEU0nkls3/zIUMPKNX/6yZLf+kFgAfgGyLFAUwY//uQZAUABcd5UiNPVXAAAApAAAAAE0VZQKw9ISAAACgAAAAAVQIygIElVrFkBS+Jhi+EAuu+lKAkYUEIsmEAEoMeDmCETMvfSHTGkF5RWH7kz/ESHWPAq/kcCRhqBtMdokPdM7vil7RG98A2sc7zO6ZvTdM7pmOUAZTnJW+NXxqmd41dqJ6mLTXxrPpnV8avaIf5SvL7pndPvPpndJR9Kuu8fePvuiuhorgWjp7Mf/PRjxcFCPDkW31srioCExivv9lcwKEaHsf/7ow2Fl1T/9RkXgEhYElAoCLFtMArxwivDJJ+bR1HTKJdlEoTELCIqgEwVGSQ+hIm0NbK8WXcTEI0UPoa2NbG4y2K00JEWbZavJXkYaqo9CRHS55FcZTjKEk3NKoCYUnSQ0rWxrZbFKbKIhOKPZe1cJKzZSaQrIyULHDZmV5K4xySsDRKWOruanGtjLJXFEmwaIbDLX0hIPBUQPVFVkQkDoUNfSoDgQGKPekoxeGzA4DUvnn4bxzcZrtJyipKfPNy5w+9lnXwgqsiyHNeSVpemw4bWb9psYeq//uQZBoABQt4yMVxYAIAAAkQoAAAHvYpL5m6AAgAACXDAAAAD59jblTirQe9upFsmZbpMudy7Lz1X1DYsxOOSWpfPqNX2WqktK0DMvuGwlbNj44TleLPQ+Gsfb+GOWOKJoIrWb3cIMeeON6lz2umTqMXV8Mj30yWPpjoSa9ujK8SyeJP5y5mOW1D6hvLepeveEAEDo0mgCRClOEgANv3B9a6fikgUSu/DmAMATrGx7nng5p5iimPNZsfQLYB2sDLIkzRKZOHGAaUyDcpFBSLG9MCQALgAIgQs2YunOszLSAyQYPVC2YdGGeHD2dTdJk1pAHGAWDjnkcLKFymS3RQZTInzySoBwMG0QueC3gMsCEYxUqlrcxK6k1LQQcsmyYeQPdC2YfuGPASCBkcVMQQqpVJshui1tkXQJQV0OXGAZMXSOEEBRirXbVRQW7ugq7IM7rPWSZyDlM3IuNEkxzCOJ0ny2ThNkyRai1b6ev//3dzNGzNb//4uAvHT5sURcZCFcuKLhOFs8mLAAEAt4UWAAIABAAAAAB4qbHo0tIjVkUU//uQZAwABfSFz3ZqQAAAAAngwAAAE1HjMp2qAAAAACZDgAAAD5UkTE1UgZEUExqYynN1qZvqIOREEFmBcJQkwdxiFtw0qEOkGYfRDifBui9MQg4QAHAqWtAWHoCxu1Yf4VfWLPIM2mHDFsbQEVGwyqQoQcwnfHeIkNt9YnkiaS1oizycqJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
        snd.play();
    }
    function SetStopTimer() {
        if (StopTimer > -1)
            clearTimeout(StopTimer);
        StopTimer = setTimeout(function () {
            if ($('#playPic').hasClass('pausePic')) {
                TogglePlayShow();
                try {
                    ShowSliderStop();
                } catch (e) {
                    loadScript("/JavaScript/SliderStop.js", function () {
                        ShowSliderStop();
                    });
                }
            }
        }, 15 * 1000 * 60);
    }



    function ip(vImage) {
        var a = new Image();
        a.src = vImage;
        return a;
    }

    function checkPendingImages() {
        $("#ssb img").each(function (index, element) {
            if (!element.complete)
                return true;
        });
        return false;
    }
    this.SetFlatMode = function (mode) {
        _FlatMode = mode;
    }
    this.GetFlat = function () {
        return _FlatMode;
    }
    this.SetBackgroundColor = function (col) {
        BackgroundColor = col;
    }


    this.SetSearchArg = function (arg, argAny, argExact) {
        _SearchFor = arg;

        if (argAny != undefined && argAny != false)
            _SearchForAny = argAny;
        else
            _SearchForAny = '';

        if (argExact != undefined && argExact != false)
            _SearchForExact = argExact;
        else
            _SearchForExact = '';
    }
    this.SetSearchOption = function (option) {
        _SearchOption = option;
    }
    this.SetFolderType = function (type) {
        _FolderType = type;
    }
    this.SetImageType = function (type) {
        if (type.length >= 4)
            ImageSearchType = type.substr(0, 2) + '0' + type.substr(3);
    }

    this.EnableIncViews = function (inc) {
        IncrementViews = inc;
    }


    var $spinner = null;

    this.ShowSpinner = function (appender, spWidth) {
        if ($('#commSpinner').length == 0) {
            if (!appender)
                appender = 'body';
            $('<div id="commSpinner"><div id="commSpinnerCell"><div id="spinnIt"></div></div></div>').appendTo(appender);

            var StepWidth = 12;
            var KnockOutRatio = 0.6;
            if (spWidth) {
                $('#spinnIt').css({ width: spWidth + 'px', height: spWidth + 'px', left: "calc(50% - " + (spWidth / 2) + "px)" })
                StepWidth = 2;
                KnockOutRatio = 0.5;
            }


            var $spinnerDiv = $("#spinnIt");
            try {
                $spinner = $spinnerDiv.progressSpin({ fillColor: "rgba(227,0,15,1)", activeColor: "#f0f0f0", stepWidth: StepWidth, cornerRadius: 0, tailCount: 0, knockOutRatio: KnockOutRatio, cycleTime: 3000 });
                $spinner.start();
            } catch (e) {
                try {
                    loadScript('JavaScript/raphael.js', function () {
                        loadScript('JavaScript/progressSpin.js', function () {
                            $spinner = $spinnerDiv.progressSpin({ fillColor: "rgba(227,0,15,1)", activeColor: "#f0f0f0", stepWidth: StepWidth, cornerRadius: 0, tailCount: 0, knockOutRatio: KnockOutRatio, cycleTime: 3000 });
                            $spinner.start();

                        });

                    });
                } catch (e) {

                }
            }
        }
    }

    this.CenterSpinner = function () {
        if ($('#commSpinner').length > 0) {
            var height = $('#commSpinner').height();
            if (height === 0) {
                height = $(window).height();
                $('#commSpinner').height(height);
            }
            $('#spinnIt').css({ left: ($('#commSpinner').width() - $('#spinnIt').width()) / 2 + 'px', top: ((height - $('#spinnIt').height()) / 2) + 'px' })
        }
    }

    this.HideSpinner = function () {
        if ($('#commSpinner').length > 0) {
            if ($spinner != null && $spinner.length > 0) {
                $spinner.stop();
                $spinner = null;
            }
            $('#commSpinner').remove();
        }
    }

    this.GetCurrentIndex = function () {
        return CurrentIndex;
    }
    this.GetCurrentImgID = function () {
        return LastIDInView;
    }

    this.SetShowCloseButton = function (show) {
        ShowCloseButton = show;
    }
    this.DoNotOpenNewWnd = function () {
        OpenNewWnd = false;
    }
    this.ShowInfoPane = function () {
        if (ShowInfoRightParam == "auto")
            ShowInfoRight = "on";
    }
    this.DisplayInfoPane = function (param) {
        if (param == "no") {
            ShowInfoRightParam = "no";
            ShowInfoRight = "off";
            ShowInfoTopLeft = true;
        }
        else if (param == "yes") {
            ShowInfoRightParam = "yes";
            ShowInfoRight = "on";
            ShowInfoTopLeft = false;
        }
        else {
            ShowInfoRightParam = "auto";
        }
    }

    function makeUnselectable(node) {
        if (node) {
            if (node.nodeType == 1) {
                node.unselectable = true;
            }
            var child = node.firstChild;
            while (child) {
                makeUnselectable(child);
                child = child.nextSibling;
            }
        }
    }
    // Diese Funktion korrigiert den Datums-Bug von
    // Netscape/Mac und liefert den korrekten GMTString:
    function fixedGMTString(datum) {
        var damals = new Date(1970, 0, 1, 12);
        if (damals.toGMTString().indexOf("02") > 0) {
            datum.setTime(datum.getTime() - 1000 * 60 * 60 * 24);
        }
        return datum.toGMTString();
    }
    function schreibCookie(name, wert, verfall, pfad, dom, secure) {
        neuerKeks = name + "=" + escape(wert);
        if (verfall)
            neuerKeks += "; expires=" + fixedGMTString(verfall);
        if (pfad) neuerKeks += "; path=" + path;
        if (dom) neuerKeks += "; domain=" + dom;
        if (secure) neuerKeks += "; secure";
        document.cookie = neuerKeks;
    }
    function GetCookieVal(name) {
        try {
            var keks = document.cookie;

            // Anfangsposition des Name=Wert-Paars suchen
            var posName = keks.indexOf("; " + name + "=");
            if (posName == -1) {
                // vielleicht war's der erste Name in der Liste?
                if (keks.indexOf(name + "=") == 0) posName = 0;
                // nein? dann abbrechen mit Rückgabewert null
                else return null;
            }

            // Anfangs- und Endposition des Krümelwerts suchen
            var wertAnfang = keks.indexOf("=", posName) + 1;
            var wertEnde = keks.indexOf(";", posName + 1);
            if (wertEnde == -1) wertEnde = keks.length;

            // Krümelwert auslesen und zurückgeben
            var wert = keks.substring(wertAnfang, wertEnde);
            return unescape(wert);
        } catch (e) {

        } return null;
    }
    function UpdateInfoPanel(index, theImage) {
        var dIndex = Math.max(0, index - (LoadOffset));
        $('#infPreview').children().remove();
        var img = $('#SliI_' + dIndex).clone();
        $('#infPreview').append(img);
        var scale = Math.min(GetImageScaleFactor(parseInt(theImage.getAttribute('cx')), parseInt(theImage.getAttribute('cy')), $('#infPreview').width(), $('#infPreview').height() - 0), 1.0);
        var w = parseInt(theImage.getAttribute('cx') * scale + .5);
        var h = parseInt(theImage.getAttribute('cy') * scale + .5);
        img.css({
            'position': 'absolute',
            'top': parseInt(($('#infPreview').height() - h) / 2) + 'px',
            'left': parseInt(($('#infPreview').width() - w) / 2) + 'px',
            'width': w,
            'height': h
        });



        try {
            dIndex = Math.min(CurrentImages.length - 1, dIndex);

            $.getScript(window.location.protocol + '//' + window.location.host + '/Snippets/SlideShowInfo.js.axd?imgID=' + CurrentImages[dIndex].getAttribute('ID'), function (data, textStatus) {
                UpdateSlideShowInfoSnipped($("#infImgInf"));
                $('#infImgInfoCtainerTxt').text(_locSlideShowStrings.ImageInfo);
                $('#infGeoContainerTxt').text(_locSlideShowStrings.GeoData);
                makeUnselectable(document.getElementById("infScroll"));
                if (!imgInf) {
                    $('#infImgInfoCtainerli').hide();
                    $('#infImgInfoCtainer').removeClass('OpenList');
                }
                if (!imgGeo) {
                    $('#infGeoContainerli').hide();
                    $('#infGeoContainer').removeClass('OpenList');
                }
                indicateScroll();
            });
        } catch (e) {
        };

    }
    function log(str) {
//        $("#logWnd").text("<a>" + str + "</a><BR/>");
        console.log(str);
    }
    function InfoMode(onoff) {
        $("#ssbInfo").fadeTo(0, 1);
        if (onoff != "on") {
            ShowInfoRightWidth = 0;
            $('#ssbInfo').css({
                height: '16px',
                'z-index': 60000,
                overflow: 'hidden'
            });
            $("#infSlideRight").addClass("infSlideRightClosed");
            $("#SlideInfoText").addClass("SlideInfoTextClosed");
            $('#InfoTxtBtn').text(_locSlideShowStrings.info);
            $('#infoImagePic').removeClass('InfoSelected');
            $('#infoHeader').hide();
            $('#ssbInfo').removeClass('ssbInfoW');
            $('#ssbInfo').hide();
            ShowInfoRight = "off";
            InfoVisible = false;
        }
        else {
            ShowInfoRightWidth = 250;
            $('#ssbInfo').height($(window).height());
            $('#ssbInfo').addClass('ssbInfoW');
            //            $('#ssbInfo').width(ShowInfoRightWidth);
            ShowInfoRight = "on";
            $("#infSlideRight").removeClass("infSlideRightClosed");
            $("#SlideInfoText").removeClass("SlideInfoTextClosed");
            $('#InfoTxtBtn').text(_locSlideShowStrings.hide);
            $('#infoHeader').show();
            $('#infoImagePic').addClass('InfoSelected');
            InfoVisible = true;
        }
        $(window).resize();
        CalcMiddleIndex();
        AlignMiddle();

    }
    function indicateScroll() {
        if ($('#infImgInf').height() > $('#infScroll').height()) {
            var scLen = 100 * $('#infScroll').height() / $('#infImgInf').height();
            scLen = $('#infScroll').height() * scLen / 100;
            if ($('#infScrollBar').length == 0) {
                $('<div id="infScrollBar" style="position:absolute;top:0px;width:3px;right:1;height:10px"></div>').appendTo($('#infScrollContainer'));
                $('#infScrollBar').PadMouseDrag({
                    start: function (event, elem) {
                        elem.scOffset = $('#infScrollBar').offset().top - elem._startMoveY;
                        event.preventDefault();
                        //                    $(elem).css({ position: 'absolute' });
                    },
                    move: function (event, elem) {
                        //                    $(elem).scrollTop((elem._startMoveY - elem._curPosY));
                        //                        $('#infScroll').scrollTop($('#infScroll').scrollTop() + elem._curPosY - elem._startMoveY);
                        $('#infScrollBar').css('top', elem._curPosY + elem.scOffset);
                        var strecke = elem._curPosY - elem._startMoveY;
                        var p = $('#infScroll').height() * 100 / strecke;
                        var np = $('#infScrollBar').height() / p * 100;
                        $('#infScroll').scrollTop(np);
                        indicateScroll();

                        //                        indicateScroll();
                        event.preventDefault();
                    },
                    end: function (event, elem) {
                        indicateScroll();
                        event.preventDefault();
                    }
                });
            }
            var st = $('#infScroll').scrollTop();
            var oC = st * 100 / ($('#infImgInf').height() - $('#infScroll').height());
            var pos = oC * ($('#infScroll').height() - scLen) / 100;

            $('#infScrollBar').css({
                top: pos,
                //                left: $('#infScroll').offset().left + $('#infScroll').width() - 4,
                right: 1,
                'z-index': 64000,
                height: scLen
            });

        }
        else {
            $('#infScrollBar').remove();
        }
    }
    function CalcMiddleIndex() {
        MiddleIndex = Math.round(($('#ssb').width() / (nSize + 18) / 2));
    }
    function StopVideoPlaying() {
        if (theVideo !=  null) {
            theVideo.pause();
            InVideoPlaying = false;
        }
    }
    function getQueryParam(param) {
        param = param.toLowerCase();
        var result = window.location.search.toLowerCase().match(
            new RegExp("(\\?|&)" + param + "(\\[\\])?=([^&]*)")
        );
        return result ? decodeURIComponent(result[3]) : false;
    }
    var ThumbsHeight = 0;
    setColours = function () {
        if (getQueryParam("cmode")) {
            var mode = getQueryParam("cmode");
            $('.ControllerBack2').addClass(mode);
            $('#ImgOfImg').addClass(mode);
            $('.ThumbElement').addClass(mode + 'Thumbs');
            $('#nameDescriptorsBelow').addClass(mode);
        }

    };

    this.TVBuilDList = function (parent) {
        SLOpen = -1;
        CurrentIndex = -1;
        MiddleIndex = 0;
        //        nSize = 58;
        nSize = 100;
        ThumbContainer;
        PageNo = 0;
        Images = 0;
        ListItems = 60;
        LoadOffset = -1;
        Init;
        zoomeInThumbs = true;
        InLoad = false;
        GotoIndex = -1;
        ImagesInView = -1;
        mouser = null;
        LastFillRest = -1;
        FillRest = -1;
        dtLastLoad = null;
        //HeaderVisible = true;
        CurrentImages = null;
        ssbHeight = 300;



        if (getQueryParam("so"))
            SortOrder = getQueryParam("so");
        if (getQueryParam("StartBtn") == "1")
            ShowStartButton();

        if (SortOrder.toLowerCase() == "random")
            SLApp.UserAndInfoService.StartRandomAccess(GetCurrentDirID(), Carousel.GetFlat(), _SearchFor, _SearchForAny, _SearchForExact, ImageSearchType, function (ret) {
                SortOrder = ret;
                SortOrderOriginal = "default";
                _FolderTypeOriginal = _FolderType;
                _FolderType = 0;

            })
        $(window).on('unload', function () {
            if (SortOrder.substr(0, 6) == "random")
                SLApp.UserAndInfoService.FinishedRandomAccess(SortOrder);
        });
        if ($(window).width() / $(window).height() < 1.5)
            nSize = 56;

        if (GetCookieVal('Loop') != null) {
            LoopThrought = parseInt(GetCookieVal('Loop'));
            SecondsStay = parseInt(GetCookieVal('SlideTime'));
        }

        ThumbsHeight = nSize;
        BodyOverflow = $('body').css("overflow");
        $('body').css("overflow", "hidden");
        var back = $('#ssb');
        if (back.length === 0) {
            $('<div id="slideShow"></div>').appendTo('body');


            $('<div id="topline" ></div').appendTo($('#slideShow'));
            var container = $('#slideShow'); // $('<div id="SLS_ImageV" ></div>').appendTo($('#slideShow'));
            back = $('<div id="ssb" ></div>').appendTo(container);
            back.bind("contextmenu", function (e) {
                e.preventDefault();
            });
            back.css('background-color', BackgroundColor);
            $('<div id="nameDescPanel" class="TopPanel"><div id="nameDescCont"></div><div id="nameDescriptors"><div id="nameDescPanelHdr"></div><div id="nameDescPanelDescr"></div></div><div class="pinHolder"><div id="pin"></div></div><div id="CloseSLBtn"></div></div>').appendTo($('#ssb'));
            $('#nameDescPanelDescr').ellipsis({ lines: 3 });
            $('#nameDescPanelHdr').ellipsis({ lines: 3, responsive: true });

            if (_ShowCloseTop) {
                $('#CloseSLBtn').css('display', 'block');
                $('.pinHolder').addClass('pinLeft');
            } else {
                $('.pinHolder').addClass('pinRight');
                $('#CloseSLBtn').css('display', 'none');
            }


            ssbHeight = $('#ssb').height();
            if (getQueryParam('textp') === 'below') {
                $('#nameDescPanel').remove();
                //                $('#ssb').css('height', 'calc(100% - 60px)');
                $('<div class="nameDescriptorsBelow" id="nameDescriptorsBelow"><div id="LowerLinePlace"></div><div id="nameDescPanelHdr"></div><div id="nameDescPanelDescr"></div>').appendTo($('#ssb'));
                if (getQueryParam('textc')) {
                    $('#nameDescPanelHdr').css('color', '#' + getQueryParam('textc'));
                    $('#nameDescPanelDescr').css('color', '#' + getQueryParam('textc'));
                }

            } else {
                $('#nameDescPanel').addClass('nameDescriptorsUp');
            }

            if (getQueryParam('bcolor')) {
                var backCol = getQueryParam('bcolor');
                var isHex = /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i.test(backCol);
                if (isHex)
                    back.css('background-color', '#' + backCol);
                else
                    back.css('background-color', backCol);
            }
            if (getQueryParam('border')) {
                $('#nameDescriptorsBelow').css('border-width', getQueryParam('border'));
                $('#nameDescriptorsBelow').css('border-top-width', 0);
                $('#nameDescriptorsBelow').css('border-style', 'solid');
                back.css('border-width', getQueryParam('border'));
                back.css('border-bottom-width', 0);
                back.css('border-style', 'solid');
            }
            if (getQueryParam('bordercol')) {
                $('#nameDescriptorsBelow').css('border-color', getQueryParam('bordercol'));
                back.css('border-color', getQueryParam('bordercol'));
            }
            $('#CloseSLBtn').click(function () {
                $('#closePic').click();
            });



            $('#pin').attr("title", _locSlideShowStrings.SlideshowControlBlendTitle);
            if (!HeaderVisible)
                $('#pin').addClass('pinClosed');
            else
                $('#pin').addClass('pinBackground');

            $('<div id="ssbInfo" ></div>').appendTo(container);


            $('<div id="infoHeader"><div id="infoClose"></div></div>').appendTo('#ssbInfo');
            $('<div id="ssbInfoData"></div>').appendTo($('#ssbInfo'));
            $('<div id="infPreview"></div>').appendTo($('#ssbInfoData'));
            $('<div id="infScrollContainer" style="position:relative"></div>').appendTo($('#ssbInfoData'));
            $('<div id="infScroll"></div>').appendTo($('#infScrollContainer'));
            $('<ul id="infImgInf"</ul>').appendTo($('#infScroll'));
            if (!ShowInfoTopLeft)
                $('#nameDescPanel').hide();
            $('#infoClose').PadMouseDrag({
                click: function () {
                    InfoMode("off");
                }
            });
            $('#infImgInf').PadMouseDrag({
                start: function (event, elem) {
                    event.preventDefault();
                    //                    $(elem).css({ position: 'absolute' });
                },
                move: function (event, elem) {
                    //                    $(elem).scrollTop((elem._startMoveY - elem._curPosY));
                    $('#infScroll').scrollTop($('#infScroll').scrollTop() + elem._startMoveY - elem._curPosY);
                    indicateScroll();
                    event.preventDefault();
                },
                end: function (event, elem) {
                    indicateScroll();
                    event.preventDefault();
                },
                click: function (ev, ui) {
                    var id = ev.target.id;
                    if (id == 'infImgInfoCtainer') {
                        if (imgInf == false)
                            imgInf = true;
                        else
                            imgInf = false;
                        if (!imgInf) {
                            $('#' + id + 'li').hide();
                            $('#' + id).removeClass('OpenList');
                        }
                        else {
                            $('#' + id + 'li').show();
                            $('#' + id).addClass('OpenList');
                        }
                    }
                    if (id == 'infGeoContainer') {
                        if (imgGeo == false)
                            imgGeo = true;
                        else
                            imgGeo = false;
                        if (!imgGeo) {
                            $('#' + id + 'li').hide();
                            $('#' + id).removeClass('OpenList');
                        }
                        else {
                            $('#' + id + 'li').show();
                            $('#' + id).addClass('OpenList');
                        }
                    }
                }
            });

            InfoMode(ShowInfoRight);

            $('#infSlideRight').PadMouseDrag({
                click: function (e) {
                    if (ShowInfoRightParam == "auto")
                        InfoMode(ShowInfoRight == "on" ? "off" : "on");
                }
            });
            $('#SlideInfoText').PadMouseDrag({
                click: function (e) {
                    if (ShowInfoRightParam == "auto")
                        InfoMode(ShowInfoRight == "on" ? "off" : "on");
                }

            });

        }
        else {
            back.html('');
        }
        var ctrller = $('<div id="TmbController" class="Controller" style="Opacity:0.001"><div class="ControllerBack"></div><div class="ControllerBack2"></div>').appendTo(back);
        $('<div id="ctrlLeft"></div>').appendTo(ctrller);
        $('<div id="ctrlRight"></div>').appendTo(ctrller);
        var ctrlContent = $('<div id="ctrlContent"></div>').appendTo(ctrller);
        $(".ControllerBack").css({ opacity: .001, height: nSize + nSize / 8 });
        back.data("Controller", ctrller);
        var d = $('<div id="TmbContainer" class="ThumbContainder"></div>').appendTo(ctrller);
        //        d.css('height', nSize + 'px');
        d.css('width', 8000 + 'px');
        d.css('left', -50 + 'px');

        $('<div id="ThumbBreakerLeft"></div>').appendTo(d);
        $('<div id="ThumbBreakerRight"></div>').appendTo(d);
        $('<div id="sizer" style="width:10px;height:10px"></div>').appendTo(d);
        //        ctrller.css('height', nSize * nMulti + 4 + 'px');
        //        d.css('height', nSize * nMulti + 28 + 'px');
        d.css('z-index', 3059);

        /*
        // Good Idea, comes later
        $('#TmbContainer').draggable(
        {
        axis: 'x',
        refreshPositions: true,
        stop: function (event, ui) {
        var index = parseInt(CurrentIndex - (ui.position.left / nSize));
        Carousel.MoveTo(index);
        $(event.target).css('left', '0px');

        },
        snap: true,
        snapTolerance: nSize

        });

        */
        $("#TmbContainer").css('height', nSize * 2);
        $("#ctrlContent").css('height', nSize * 2);
        var bk = $('<div id="thumbsBk" style="position:absolute"></div>').appendTo(d);
        bk.css('width', "100%");
        bk.css("height", nSize);
        bk.css("bottom", "2px");
        var tmb = $('<div id="thumbsHolder"></div>').appendTo(d);
        var pList = $('<ul id="thumbs" style="position:absolute"></ul>').appendTo(tmb);
        $('#thumbs li').css('width', nSize);
        $('#thumbs li').css('height', nSize);

        CalcMiddleIndex();

        for (var cbI = 0; cbI < 60; cbI++) {
            //            var element = $('<li id="PliI_' + cbI + '" class="ThumbElement"><div class="ThumbElementContainer"><img class="ThumbImg" id="SliI_' + cbI + '" src="/images/DXViewer/empty.png" /></div></li>');
            var element = $('<li id="PliI_' + cbI + '" class="ThumbElement"><img class="ThumbImg" id="SliI_' + cbI + '" src="/images/DXViewer/empty.png" /></li>');
            element.appendTo(pList);


            if (cbI == MiddleIndex) {
                element.css('width', nSize * nMulti + 'px');
                element.css('height', nSize * nMulti + 'px');
            }

            element.css('overflow', 'hidden');
            $('#SliI_' + cbI)[0].Offset = cbI;
            $('#SliI_' + cbI).on('load', function (e) {
                $(this).fadeTo(1000, 1);
            });
            var lStartIndex = 0;
            var distance = 0;
            var forward = false;
            var index = 0;
            var margleft = 0;
            var moved = false;
            $('#SliI_' + cbI).PadMouseDrag({
                click: function (e) {
                    if (e.target.Index != -1) {
                        StopVideoPlaying();
                        GotoIndex = e.target.Index;
                        dtImageGotAt = null;
                        lastActionWasBack = true;
                    }
                },
                start: function (event, elem) {
                    event.preventDefault();
                    lStartIndex = index = GotoIndex;
                    //                    $(elem).css({ position: 'absolute' });
                    margleft = parseInt($("#thumbsHolder").css("margin-left"));
                    dtImageGotAt = null;
                },
                move: function (event, elem) {
                    //                    $(elem).scrollTop((elem._startMoveY - elem._curPosY));
                    dtImageGotAt = null;
                    moved = true;
                    if (elem._startMoveX < elem._curPosX) {
                        distance = elem._curPosX - elem._startMoveX;
                        //                        $("#thumbsHolder").css("margin-left", margleft + distance);
                        distance = parseInt(distance / nSize * 2);

                        index = lStartIndex - distance;
                    }
                    else {
                        distance = elem._startMoveX - elem._curPosX;
                        //                        $("#thumbsHolder").css("margin-left", margleft - distance);
                        distance = parseInt(distance / nSize * 2);
                        index = lStartIndex + distance;
                        forward = true;
                    }
                    index = Math.min(ImagesInView, Math.max(0, index));
                    SetThumbsPlace(index);

                    if (ImagesInView > 0)
                        $('#ImgOfImg').text((1 + index) + '/' + ImagesInView);
                    else
                        $('#ImgOfImg').text((1 + index) + '/');
                    //                    $('#MouseInfo').text("index:"+index+ "distance:"+distance)
                    event.preventDefault();
                },
                end: function (event, elem) {
                    if (moved)
                        GotoIndex = index;
                    else
                        if (event.target.Index != -1) {
                            StopVideoPlaying();
                            GotoIndex = event.target.Index;
                            dtImageGotAt = null;
                            lastActionWasBack = true;
                        }
                    moved = false;
                    /*                    for (var cbI = 1; cbI < distance; cbI++) {
                                            setTimeout(function () {
                                                if (forward)
                                                    GotoIndex++;
                                                else
                                                    GotoIndex--;
                                            }, cbI);
                                        }
                    */
                }
                //                if (!checkPendingImages())
                //                    Carousel.MoveTo(e.target.Offset);

            });
            $('#SliI_' + cbI).hover(function (e) {
                var pos = $(this).parent().offset();

                mouser = $(this);
                if (mouser[0].ImageID > 0) {
                    refreshToolTip(mouser);

                }
            },
                function (e) {
                    //                $('#ImgOfImg').css({ 'visibility': 'hidden', 'top': 500, 'left': 100 });
                    mouser = null;
                });
        }

        PageNo = -3;
        LoadOffset = -2000;
        setColours();
        $(window).resize();

    }

    function refreshElementsCount() {
        {
            InLoad = true;
            SLApp.UserAndInfoService.GetObjectCount(GetCurrentDirID(), Carousel.GetFlat(), ImageSearchType, _SearchFor, _SearchForAny, _SearchForExact, _SearchOption, function (recs) {
                ImagesInView = parseInt(recs);
                if (ImagesInView === 0)
                    Carousel.SetFlatMode(true);

                InLoad = false;
            }, function () { InLoad = false; });
        }

    }
    function refreshToolTip(element) {
        if (element)
            $('#ImgOfImg').text(GotoIndex + /* element[0].Offset*/ +1 + '/' + ImagesInView);
    }

    function DoSlideShowIntern(DirID, StartIndex, ShowCloseButton, OnCloseURL, OnFinish) {
        ThumbContainer = $("#Thumber");
        if (OnCloseURL != null)
            OpenUrlOnClose = OnCloseURL;
        PerformOnEnd = OnFinish;
        SetCurrentDirID(DirID);
        //SetFlatMode(true);

        try {
            if (Carousel.GetFlat() == -1)
                this.SetFlatMode(GetFlatMode());
        } catch (e) {

        }

        Carousel.SetShowCloseButton(ShowCloseButton);
        Carousel.TVBuilDList(ThumbContainer);

        Carousel.MoveTo(StartIndex); // First Image
        Carousel.ShowSpinner($('#ssb'));

        window.setInterval(function () {
            if (GotoIndex != -1) {
                GotoIndex = Math.min(GotoIndex, ImagesInView - 1);
                GotoIndex = Math.max(0, GotoIndex);
                if (!checkPendingImages()) {
                    0
                    if (CurrentIndex != GotoIndex && !InLoad && !InVideoPlaying) {
                        fillImgs(GotoIndex);
                        refreshToolTip(mouser);
                    }
                }
            }

        }, 100);

        window.setInterval(function () {
            if (FillRest != LastFillRest) {
                var now = new Date();
                if (!checkPendingImages() && !InLoad) {
                    if (dtLastLoad == null || now.getSeconds() * 1000 + now.getMilliseconds() > (dtLastLoad.getSeconds() + 1) * 1000 + now.getMilliseconds()) {
                        DoFillRest(FillRest);
                        LastFillRest = FillRest;
                    }
                }
            }
        }, 100);

    };
    this.ShowCloseOnTop = function () {
        _ShowCloseTop = true;
    }


    this.SetAfterImageFunc = function (func) {
        AfterImage = func;
    };
    this.SetOnCloseFunc = function (func) {
        _OnCloseFunc = func;
    }
    this.Close = function () {
        $('#closePic').click();
    }

    this.SetSortOrder = function (NewOrder) {
        SortOrder = NewOrder;
    }
    this.DoSlideShow = function (DirID, StartImageID, ShowCloseButton, OnCloseURL, OnFinish) {
        SetCurrentDirID(DirID);
        try {
            if (Carousel.GetFlat() == -1)
                this.SetFlatMode(GetFlatMode());
        } catch (e) {

        }
        SLApp.UserAndInfoService.GetObjectCount(GetCurrentDirID(), Carousel.GetFlat(), ImageSearchType, _SearchFor, _SearchForAny, _SearchForExact, _SearchOption, function (recs) {
            ImagesInView = parseInt(recs);
            if (ImagesInView === 0) {
                Carousel.SetFlatMode(true);
            }
            if (StartImageID < 0) {
                //            $('body').css('background-color', '#000000');
                StartImageID *= -1;
                SLApp.UserAndInfoService.GetImageIndex(StartImageID, GetCurrentDirID(), Carousel.GetFlat(), SortOrder, _FolderType, _SearchFor, _SearchForAny, _SearchForExact, ImageSearchType, _SearchOption,
                    function (startIndex) {
                        DoSlideShowIntern(DirID, Math.max(0, startIndex), ShowCloseButton, OnCloseURL, OnFinish);
                    });
            }
            else {
                DoSlideShowIntern(DirID, StartImageID, ShowCloseButton, OnCloseURL, OnFinish);
            }
        });
    }

    $(document).ready(function () {
        if (document.getElementById('topline')) {
            window.onload = window.onresize = function (evt) {
                var width = window.innerWidth || (window.document.documentElement.clientWidth || window.document.body.clientWidth);
                var height = window.innerHeight || (window.document.documentElement.clientHeight || window.document.body.clientHeight);
                document.getElementById('topline').innerHTML = '<p>' + width + '</p>'
            }
        }
        $('.scroll-wrapper').css({ 'bottom': '0px', 'right': '0px' });


    });


    $(window).resize(function () {
        if ($('#slideShow').length == 0)
            return;

        //        $('#PliI_' + MiddleIndex).removeClass('ThumbElementHilite');
        $('#playPic').hide();
        var Aspect = $(window).width() / $(window).height();

        var mP = $(window).width() * $(window).height();

        var nsMP = 1280 * 1024; // small screen small thumbs
        var fact = mP / nsMP;
        var nSizeBefore = nSize;
        CalcMiddleIndex();
        if ($('#infScroll').length)
            $('#infScroll').height($(window).height() - $('#infScroll').offset().top - 4);
        indicateScroll();
        $('#ssb').css("top", $('#topline').height());
        if (getQueryParam('border')) {
            if (ShowInfoRight !== "off") {
                $('#ssb').outerWidth($(window).width() - $('#ssbInfo').width());
            }
            else
                $('#ssb').outerWidth($(window).width());
        } else {
            if (ShowInfoRight !== "off") {
                $('#ssb').width($(window).width() - $('#ssbInfo').width());
            }
            else
                $('#ssb').width($(window).outerWidth());

        }
 

        //        console.debug("client width:" + $(window).width() + 'px');
        //        $('#ssbInfo').width(165);

        /*       if (getQueryVariable("dsh") != -1)
               {
                   $('#ssb').height(parseInt(getQueryVariable("dsh")));
               }
       */
        nSize = 50 * fact * Aspect;
        nSize = Math.min(100, nSize);
        nSize = Math.max(56, nSize);
        if (nSizeBefore != nSize) {
            FillThumbs(LoadOffset);
        }
        console.log("resizing window");


        CalcMiddleIndex();
        //        if (SLOpen != -1) 
        {
            if (!$('#ssb').length)
                return;
            /*
  
            $(".ThumbElement").css({ "height": nSize+"px", "width": nSize+"px" });
            //            $(".ThumbContainer").css({ "height": "52px" });
            */
            if (previousOrientation != window.orientation) {
                initialSizeX = $(window).width();
                initialSizeY = $(window).height();
                previousOrientation = window.orientation;
            }
            if ($(window).width() < WinMinWidth) {
                $("#TmbController").addClass("ControllerSmall");
                $('#TmbContainer').css("display", "none");
                if (ShowPlayBtnOnStart)
                    $('#player').show();
                $('#playPic').addClass('playPicS');
            }
            else {
                $("#TmbController").removeClass("ControllerSmall");
                $('#TmbContainer').css("display", "block");
                if (!ShowPlayBtnOnStart)
                    $('#player').hide();
                $('#playPic').removeClass('playPicS');
            }
            var NewSize = nSize;
            CalcMiddleIndex();
            $('#player').css('top', parseInt(($(window).height() - $('#player').height()) / 2) + "px");
            $('#player').css('left', parseInt(($(window).width() - $('#player').width()) / 2) + "px");
            /*            
            $('#TmbController').height(57);
            $('#TmbContainer').height(NewSize + 27 + 20);
            $('#thumbs li').css('width', NewSize);
            $('#thumbs li').css('height', NewSize);
            $('#ThumbBreakerLeft').hide();
            $('#ThumbBreakerRight').hide();
            */

            for (var cbI = 0; cbI < 60; cbI++) {
                $('#PliI_' + cbI).removeClass('ThumbElementHilite');
                var element = $('#PliI_' + cbI);
                if (element.length) {
                    element[0].ImageID = -1;
                    element[0].ImageID = -1;
                    element[0].src = "/images/DXViewer/empty.png";

                    element.css('width', nSize + 'px');
                    element.css('height', nSize + 'px');
                    element.css('top', 1 + (NewSize * nMulti) - NewSize + 'px');
                }
            }


        }
        if (CurrentIndex > -1) {
            try {
                var hld = $('#SSI' + currentIDInView);
                var theImage = CurrentImages[CurrentIndex];
                if (!theImage) {
                    for (var cbI = 0; !theImage && cbI < CurrentImages.length; cbI++) {
                        if (parseInt(CurrentImages[cbI].getAttribute('ID')) === parseInt(currentIDInView)) {
                            theImage = CurrentImages[cbI];
                        }
                    }

                }
                if (theImage) {
                    ScaleImage(theImage);
                }

            } catch (e) {

            }

            //            DisplayCurrentImage(CurrentIndex);
            DoFillRest(CurrentIndex);

            $('#SSIP').width($('#ssb').width());
            $('#SSIP').height($('#ssb').height());
            if ($('#ssb').offset())
                $('#SSIP').css('top', $('#ssb').offset().top + 'px');
            else
                $('#SSIP').css('top', '0px');
            $('#SSIP').css('left', ($('#ssb').width()) * -1 + 'px');

            $('#SSIA').width($('#ssb').width());
            $('#SSIA').height($('#ssb').height());
            if ($('#ssb').offset())
                $('#SSIA').css('top', $('#ssb').offset().top + 'px');
            else
                $('#SSIA').css('top', '0px');
            $('#SSIA').css('left', $('#ssb').width() + 'px');

            imagePos = $('#SSI' + currentIDInView).position();
            var l = 30; //Math.max(imagePos?imagePos.left:0, 30);
            if ($('#CloseSLBtn').css("display") === "block") {
                l = 70;
            }
            if (getMobileOperatingSystem() == 'iOS' && screenfull.isEnabled && screenfull.isFullscreen) {
                l += 90;
                $('.pinLeft').css('left', '100px');
            }
            $('#nameDescriptors').css('left', l + 'px');
        }
        AlignMiddle();
        /*
        var displaySize = $('#displaySize');
        if (displaySize.length == 0)
            displaySize = $('<div id="displaySize" style="position:absolute;top:0;left:0;padding:5px;background:#fff;color:#000;z-index:90000"></div>').appendTo('body');
        displaySize.text($(window).width());
        */
    });

    function ScaleImage(theImage) {
        var hld = $('#SSI' + currentIDInView);
        var he = $('#ssb').height();
        var hi = 0;
        if (getQueryParam('textp') === 'below') {
            hi = $('#nameDescriptorsBelow').height() + 2;
            he -= hi;
        }

        var scale = Math.min(GetImageScaleFactor(parseInt(theImage.getAttribute('CX')), parseInt(theImage.getAttribute('CY')), $('#ssb').width() - 0, he), 1.0);
        if ($('#theVideo_' + currentIDInView).length) {
            scale = GetImageScaleFactor(parseInt(theImage.getAttribute('CX')), parseInt(theImage.getAttribute('CY')), $('#ssb').width() - 0, $('#ssb').height() - 0);
        }
        var w = parseInt(theImage.getAttribute('CX') * scale + .5);
        var h = parseInt(theImage.getAttribute('CY') * scale + .5);

        if ($('#theVideo_' + currentIDInView).length > 0) {
            $("#theVideo_" + currentIDInView).width(parseInt(w));
            $("#theVideo_" + currentIDInView).height(parseInt(h));
            $("#theVideo_" + currentIDInView).find('video').width(parseInt(w));
            $("#theVideo_" + currentIDInView).find('video').height(parseInt(h));
        }

        $('#DetailImage').width(w);
        $('#DetailImage').height(h);

        console.log('#SSI' + currentIDInView + ' set to top: ' + parseInt((he - hi) / 2) + ' / left: ' + parseInt(($('#ssb').width() - w) / 2) + ' / width: ' + w + ' / height: ' + h);
        hld.css({
            'top': parseInt(he -h) / 2 + 'px',
            'left': parseInt(($('#ssb').width() - w) / 2) + 'px',
            'width': w,
            'height': h
        });
        if ($("#i_img_" + currentIDInView).length) {

            $("#i_img_" + currentIDInView)[0].src = "/MCIMG_" + currentIDInView + "_" + w + "_" + h + ".jpg?V=0";
            $("#i_img_" + currentIDInView).width(w);
            $("#i_img_" + currentIDInView).height(h);
            /*
            if (getQueryParam('textp') === 'below') {
                h = $('#nameDescriptorsBelow').height() + 2;
                //                                $('.nameDescriptorsBelow').css('bottom', h + 'px');
                //                                $('#ssb').css('height', 'calc(100% - ' + h + 'px)');
                $('#i_img_' + ImageId).removeAttr('width').removeAttr('height');
                $('#i_img_' + ImageId).css({ 'max-width': '100%', 'max-height': '100%' });

                var imgHolder = $('#SSI' + ImageId);
                var nAspect = $('#i_img_' + ImageId).data('ascpectRatio');
                if (imgHolder.height() > $('#ssb').height() - h) {
                    imgHolder.height($('#ssb').height() - h);
                    imgHolder.width(imgHolder.height() * nAspect);
                    imgHolder.css('left', ($('#ssb').width() - $('#SSI' + ImageId).width()) / 2);
                }
                if (imgHolder.width() > $('#ssb').width() - w) {
                    imgHolder.width($('#ssb').width() - w);
                    imgHolder.height(imgHolder.width() / nAspect);
                    imgHolder.css('left', ($('#ssb').width() - $('#SSI' + ImageId).width()) / 2);
                }
                $('#ImagesView').height($('#ssb').height() - h);



            }
            */
            var imgHolder = $('#SSI' + currentIDInView);
            imgHolder.css('top', ((he - h) - $('#SSI' + ImageId).height()) / 2);
            $('.Controller').css({ 'bottom': h + 'px' });
        }
        $('#ImagesView').css({ 'width': w + 'px', 'height': h + 'px' });
    }


    function AlignPlayPic(bSmallW) {
        if (!bSmallW) {
            //            $('#player').insert(
            var ptPlay = 350;
            var elemnts = $("#thumbs").find(".ThumbElementHilite");
            var position = elemnts.offset();
            if (position != null) {
                ptPlay = position.left;
                //                $('#playPic').css({ , 'bottom': parseInt(60 + ((nSize - 40) * nMulti) / 2) + 'px', 'visibility': 'visible' });
                var bottom = 15;
                if (getQueryParam('textp') !== 'below') {
                    if ($('.ControllerBack2').length > 0)
                        bottom += parseInt($('.ControllerBack2').height());
                }
                $('#playPic').css({ 'left': (ptPlay + ((nSize * nMulti) - $('#playPic').width()) / 2), 'bottom': '50%', 'visibility': 'visible' });
                $("#playPic").appendTo($('#TmbController'));
                $('#playPic').show();
            }
            $('#LeftSettings').removeClass('leftSmallSettings');
            $('#LeftShare').removeClass('LeftSmallShare');
            $('#ImgOfImg').removeClass('SmallImgOfImg');
            if (getQueryParam('textp') === 'below') {
                $('#ImgOfImg').appendTo($('#LeftBtns'));
                $('#ImgOfImg').addClass('SmallImgOfImgUnder');
                $('#playPic').css('bottom', bottom +'px');
            }
        } else {
            if (getQueryParam('textp') === 'below') {
                $('#playPic').css({ 'left': '0px', 'bottom': '12px', 'visibility': 'visible', 'display': 'block' });
                $('#playPic').appendTo($('#LeftBtns'));
                $('#ImgOfImg').appendTo($('#LeftBtns'));
                $('#ImgOfImg').removeClass('SmallImgOfImg');
                $('#ImgOfImg').removeClass('SmallImgOfImgUnder');
                $('#ImgOfImg').css({ 'left': '20px', 'bottom': '12px', 'visibility': 'visible', 'display': 'block' });
                $('.ControllerBack2').css('background-color', 'transparent');
                $('#ctrlContent').hide();
                $('#leftArrow').appendTo($('#ImagesView'));
                $('#rightArrow').appendTo($('#ImagesView'));

            } else {
                $('#playPic').css({ 'left': 10 + 'px', 'bottom': '15px', 'visibility': 'visible', 'display': 'block' });
            }
            $('#LeftSettings').addClass('leftSmallSettings');
            $('#LeftShare').addClass('LeftSmallShare');
            
            $('#playPic').show();
            if (getQueryParam('textp') !== 'below')
                $('#ImgOfImg').addClass('SmallImgOfImg');
        }

    }
    function AnimateThumbs(IndexBefore, NewIndex) {
        CalcMiddleIndex();
        OnePageSize = MiddleIndex * 2 - 1;
        thumbsLeft = $("#thumbs").css("left");

        var direction = "-=" + (NewIndex - IndexBefore) * nSize + "px";
        if (NewIndex < IndexBefore)
            direction = "+=" + (IndexBefore - NewIndex) * nSize + "px";

//        $("#thumbsBk").css("z-index", IndexBefore);
//        $("#thumbs").css("z-index", IndexBefore);
        LoadingImageInProg = true;
        var pausePicV = $('#playPic').css('visibility');
        $('#playPic').fadeOut();
        $("#thumbsHolder").animate({
            "margin-left": direction
        },
        {
            duration: 2000,
            progress: function (animation, progrss, remaining) {
                if (InLoad == false)
                    animation.duration = 0;
            },
            step: function (now, fx) {
                if (LoadingImageInProg == false) {
                    fx.options.duration = 100;
                    dtImageGotAt = null;
                    lastActionWasBack = true;
                    //                    $("#thumbsHolder").css('left','0px')
                    $('#playPic').fadeIn(1000);
                    AlignMiddle();

                }
                //                SetThumbsPlace(now);
            },
            complete: function () {
                AlignMiddle();
                $('#playPic').fadeIn(1000);
            }
        }, 'easeInCirc')
    }

    function AlignMiddle() {
     
        CalcMiddleIndex();

        OnePageSize = MiddleIndex * 2 - 1;
        var posL = ($('#ssb').width() - nSize) / 2;
        var pos = $('#PliI_' + MiddleIndex).position();
        var bSmallW = false;
        if ($('#ssb').width() < WinMinWidth) {
            bSmallW = true;
            OnePageSize = 1;
            $('#nextPic').attr('title', _locSlideShowStrings.SlideshowControlNext);
            $('#prevPic').attr('title', _locSlideShowStrings.SlideshowControlPrev);
        }
        else {
            $('#nextPic').attr('title', _locSlideShowStrings.SlideshowControlNextPage);
            $('#prevPic').attr('title', _locSlideShowStrings.SlideshowControlPrevPage);

        }
        if (($(window).height() < 220)) {
            if (ShowInfoTopLeftSave == null)
                ShowInfoTopLeftSave = ShowInfoTopLeft;
            ShowInfoTopLeft = true;
        }
        else {
            if (ShowInfoTopLeftSave != null)
                ShowInfoTopLeft = ShowInfoTopLeftSave;
            ShowInfoTopLeftSave = null;
        }

        if (ShowInfoTopLeft == true) {
            $('#nameDescPanel').show();
            //            $('#ssbInfo').hide();
        }
        else {
            $('#nameDescPanel').hide();
            $('#ssbInfo').show();
        }

        var bottom = 0;
        if ($('.ControllerBack2').length > 0)
            bottom = parseInt($('.ControllerBack2').height());

        $('#TmbContainer').height((nSize * nMulti) + 40);
        $('.Controller').height((nSize * nMulti) + 40);
        $('.ControllerBack').height(parseInt(nSize + nSize / 8) + 'px');
        $('#rightArrow').show();
        if (!bSmallW) {
            if ($('#playPic').hasClass('playPicS')) {
                $('#playPic').removeClass('playPicS')
                $('#playPic').addClass('playPic')
            }
            if ($('#playPic').hasClass('pausePicS')) {
                $('#playPic').removeClass('pausePicS')
                $('#playPic').addClass('pausePic')
            }
            $('#imgProg').css('bottom', '4px');
            $('#ThumbBreakerLeft').css({ 'left': posL + 8 + 'px', 'bottom': '2px', 'height': nSize * nMulti, 'visibility': 'hidden' });
            $('#thumbsBk').height(nSize);

            if (CurrentIndex > 0) {

                //                $('#prevPic').css({ 'left': posL - 38 - 16 + 'px', 'visibility': 'visible', 'display': 'block' });
                $('#prevPic').css({ 'left': 0 + 'px', 'height': nSize + 'px', 'bottom': bottom + 'px', 'visibility': 'visible', 'display': 'block' });
                $('#firstPic').css({ 'left': posL - 58 - 16 - 24 + 'px', 'visibility': 'visible', 'display': 'block' });
                $('#prevPic').show();
                $('#firstPic').show();
                $('#leftArrow').show();
            }
            else {
                $('#prevPic').css({ 'visibility': 'hidden' });
                $('#firstPic').css({ 'visibility': 'hidden' });
                $('#prevPic').hide();
                $('#firstPic').hide();
                $('#leftArrow').hide();
            }
            $('#ImgOfImg').css({ 'visibility': 'visible', 'left': posL - 31, 'width': nSize * nMulti + 'px', 'z-index': 0, 'background-color': 'Transparent' });


            //            $('#playPic').css({ 'left': posL - 20 + 'px', 'bottom': parseInt(40 + ((nSize - 40) * nMulti) / 2) + 'px', 'visibility': 'visible' });


            posL += (nSize * nMulti);
            $('#ThumbBreakerRight').css({ 'left': posL + 30 + 'px', 'bottom': '2px', 'height': nSize * nMulti, 'visibility': 'hidden' });

            //            $('#nextPic').css({ 'left': posL + 36 + 14 - 80 + 'px', 'visibility': 'visible', 'display': 'block' });
            $('#nextPic').css({ 'left': $('#ssb').width() - 30 + 'px', 'height': nSize + 'px', 'bottom': bottom + 'px', 'visibility': 'visible', 'display': 'block' });
            $('#lastPic').css({ 'left': posL + 36 + 14 - 50 + 24 + 'px', 'visibility': 'visible', 'display': 'block' });
            $('#nameDescPanel').removeClass("HeaderMaxHeight");
            $('#nameDescPanelHdr').removeClass("HeaderDescr");
            $('#nextPic').addClass("nextPicBig");
            $('#prevPic').addClass("prevPicBig");
            $('#firstPic').hide();
            $('#lastPic').hide();

            $(".ControllerBack").show();
        }
        else {
            $('#nextPic').removeClass("nextPicBig");
            $('#prevPic').removeClass("prevPicBig");

            if (!$('#playPic').hasClass('playPicS')) {
                $('#playPic').addClass('playPicS');
                if ($('#playPic').hasClass('pausePic')) {
                    $('#playPic').removeClass('pausePic')
                    $('#playPic').addClass('pausePicS')
                }
            }

            if (CurrentIndex > 0) {

                $('#prevPic').css({ 'left': 6 + 'px', 'visibility': 'visible', 'display': 'block', height: '50px' });
                $('#firstPic').css({ 'left': posL - 58 - 16 - 24 + 'px', 'visibility': 'visible', 'display': 'none' });

            }
            else {
                $('#prevPic').css({ 'visibility': 'hidden' });
                $('#firstPic').css({ 'visibility': 'hidden' });
            }
            $('#prevPic').hide();
            $('#firstPic').hide();
            $('#thumbsBk').height(50);


            $('#ThumbBreakerLeft').css({ 'left': posL + 8 + 'px', 'bottom': '2px', 'height': nSize * nMulti, 'visibility': 'hidden' });


            $('#nextPic').css({ 'left': 69 + 'px', 'visibility': 'visible', 'display': 'block', height: '50px' });
            $('#lastPic').css({ 'left': posL + 36 + 14 - 50 + 24 + 'px', 'visibility': 'visible', 'display': 'none' });
            $('#ImgOfImg').css({ 'visibility': 'visible', 'left': 92, 'width': '60px', 'z-index': 0,  'background-color': 'Transparent' });
            $('#nameDescPanel').addClass("HeaderMaxHeight");
            $('#nameDescPanelHdr').addClass("HeaderDescr");
            $(".ControllerBack").hide();
            $('#imgProg').css('bottom', '44px');
            $('#nextPic').hide();
            $('#lastPic').hide();
        }
        AlignPlayPic(bSmallW);
        $('#thumbs').height(nMulti * nSize + 4);
        $('#thumbsHolder').height(nMulti * nSize + 4);
        $('#thumbsHolder').width($(window).width() * 3);
        $('#thumbsHolder').css({
            'margin-left': $(window).width(),
            'left': -$(window).width()
        })
        if (CurrentIndex == ImagesInView - 1) {
            $('#nextPic').css({ 'visibility': 'hidden' });
            $('#lastPic').css({ 'visibility': 'hidden' });
            $('#rightArrow').hide();
        }
        if (getQueryParam('controls') === 'under') {
            $('.ThumbContainder').css('bottom', '0px');
            $('#nextPic').css('bottom', '2px');
            $('#prevPic').css('bottom', '2px');
        }

        var emptyText = $('#EmptySlideShow');
        if (emptyText.length > 0) {
            emptyText.css({
                top: parseInt(Math.max(($(window).height() - emptyText.height()) / 2, 0)) + 'px',
                left: parseInt(Math.max(($(window).width() - emptyText.width()) / 2, 0)) + 'px'
            });
        }
    }

    var _lastFillRestIndex = null;
    function AlignTmb(Element, cbI, nFact) {
        var maxS = nFact * nSize;
        Element.css('left', '0px');
        Element.css('top', '0px');
        if (nFact > 1)
            $('#PliI_' + cbI).addClass('ThumbElementHilite');
        else
            $('#PliI_' + cbI).removeClass('ThumbElementHilite');
        var element = $('#PliI_' + cbI);
        if (nFact > 1) {
            element.css('width', nSize * nFact + 'px');
            element.css('height', nSize * nFact + 'px');
            element.css('bottom', '0px');
        }
        else {
            element.css('width', nSize + 'px');
            element.css('height', nSize + 'px');
            element.css('bottom', '0px');
        }
        try {
            len = CurrentImages.length;

        }
        catch (e) {
            len = 0;
        }

        if (cbI < len) {
            var fact = parseFloat(CurrentImages[cbI].getAttribute('CX')) / parseFloat(CurrentImages[cbI].getAttribute('CY'));
            var topDone = false;
            if (fact > 1) {
                if (!zoomeInThumbs) {
                    Element.width(maxS);
                    Element.height(maxS / fact);
                    try {
                        if (CheckHotSpot == true) {
                            var HotY = CurrentImages[cbI].getAttribute('HotSpotY');
                            if (HotY > 0) {
                                var offs = Element.height() * HotY / 100;
                                Element.css('top', parseInt((maxS - maxS / fact) / 2) + 'px');
                                topDone = true;
                            }
                        }
                        if(!topDone)
                            Element.css('top', parseInt((maxS - maxS / fact) / 2) + 'px');

                    } catch (err) {
                        Element.css('top', parseInt((maxS - maxS / fact) / 2) + 'px');
                    }

                }
                else {
                    Element.height(maxS + 'px');
                    Element.width(maxS * fact);
                    if (CheckHotSpot == true) {
                        try {
                            var HotX = CurrentImages[cbI].getAttribute('HotSpotX');
                            if (HotX > 0) {
                                var offs = Element.width() * HotX / 100;
                                var Steps = Element.width() / 3;

                                if (offs < Steps) {
                                    //                                    Element.css('border', '2px solid red');
                                    Element.css('left', 0 + 'px');
                                }
                                else
                                    if (offs < Steps * 2) {
                                        //                                        Element.css('border', '2px solid green');
                                        Element.css('left', ((maxS / fact) - maxS) / 2 + 'px');
                                    }
                                    else
                                        if (offs < Steps * 3) {
                                            //                                            Element.css('border', '2px solid blue');
                                            Element.css('left', ((maxS / fact) - maxS) + 'px');
                                        }

                            }
                            else
                                Element.css('left', parseInt((maxS - maxS * fact) / 2) + 'px');
                        } catch (err) {
                            Element.css('left', parseInt((maxS - maxS * fact) / 2) + 'px');
                        }
                    }
                    else
                        Element.css('left', parseInt((maxS - maxS * fact) / 2) + 'px');

                }

            }
            else {
                if (!zoomeInThumbs) {
                    Element.height(maxS);
                    Element.css('top', '0px');
                    Element.width(maxS * fact);
                }
                else {
                    Element.height(maxS / fact);
                    Element.width(maxS);
                    try {
                        if (CheckHotSpot == true) {
                            var HotY = CurrentImages[cbI].getAttribute('HotSpotY');
                            if (HotY > 0) {
                                var offs = Element.height() * HotY / 100;
                                var Steps = Element.height() / 3;

                                if (offs < Steps) {
//                                    Element.css('border', '2px solid red');
                                    Element.css('top', 0 + 'px');
                                }
                                else
                                    if (offs < Steps * 2) {
//                                        Element.css('border', '2px solid green');
                                        Element.css('top', ((maxS / fact) - maxS) / 2 * -1 + 'px');
                                    }
                                    else
                                        if (offs < Steps * 3) {
//                                            Element.css('border', '2px solid blue');
                                            Element.css('top', ((maxS / fact) - maxS) * -1 + 'px');
                                        }

                            }
                            else
                                Element.css('top', ((maxS / fact) - maxS) * -1 + 'px');
                        }
                        else {
                            Element.css('top', ((maxS / fact) - maxS) * -1 + 'px');
                        }
                    } catch (err) {
                        Element.css('top', parseInt((maxS - maxS / fact) / 2) + 'px');
                    }

                    //                    Element.css('margin-top', '-' + ((maxS - maxS / fact) / 2) + 'px');

                }

            }
        }
    }
    var OnDoneFill = null;
    var inShowing = 0;
    function ClearThumbs() {

        for (var cbI = 0; cbI < 60; cbI++) {
            var Element = $('#SliI_' + cbI);
            if (Element.length) {
                Element[0].Index = -1;
                Element[0].src = "/images/DXViewer/empty.png";
                Element.parent().addClass("ThumbElementEmpty");
            }
        }
    }

    function FillThumbs(loadoffs) {
        if (CurrentImages) {
            try {
                for (var cbI = 0; cbI < CurrentImages.length; cbI++) {
                    var Element = $('#SliI_' + cbI);
                    if (Element.length > 0) {
                        Element[0].ImageID = parseInt(CurrentImages[cbI].getAttribute('ID'));
                        //                Element.fadeTo(10, 0.2);
                        Element[0].src = "/SLOAIMGTMB_" + Element[0].ImageID + ".jpg";
                        Element[0].Index = loadoffs + cbI;
                        Element.parent().removeClass("ThumbElementEmpty");
                        AlignTmb(Element, cbI, 1);
                    }

                }
            } catch (e) {
                // Current Images empty!??
                ;
            }
        }

    }
    function SetThumbsPlace(index) {
        index = Math.min(index, ImagesInView - 1);
        index = Math.max(0, index);
        AlignMiddle();
        var dIndex = Math.max(0, index - (LoadOffset));

        if (_lastFillRestIndex != null) {
            var Element = $('#SliI_' + _lastFillRestIndex);
            AlignTmb(Element, _lastFillRestIndex, 1);
        }
        Element = $('#SliI_' + dIndex);
        AlignTmb(Element, dIndex, nMulti);
        if (Element.length) {

            var left = Element.offset().left - $("#thumbs").offset().left;
            _lastFillRestIndex = dIndex;

            var OffsL = $('#PliI_' + dIndex).offset().left - (($("#ThumbBreakerLeft").offset().left + 56));
            //            OffsL = $('#ssb').width()/2;
            $("#thumbs").css("left", $("#thumbs").offset().left - OffsL);
        }
        //        $("#thumbs").css('bottom', '-8px');
    }
    function DoFillRest(index) {
        index = Math.min(index, ImagesInView - 1);
        index = Math.max(0, index);

        var dIndex = Math.max(0, index - (LoadOffset));
        var offs = MiddleIndex;
        var nOffs = index;

        var nSizeY = nSize * 2 / 3;
        var OnDone = null;
        var LoadOffsetBefore = LoadOffset;

        SetThumbsPlace(index);
        /*
        if (index < MiddleIndex && LoadOffset < 1)
        for (var cbI = 0; cbI < MiddleIndex; cbI++) {
        var elem = $('#SliI_' + cbI);
        if (elem.length == 0)
        continue;
        elem[0].ImageID = -1;
        elem[0].src = "/images/DXViewer/empty.png";
        elem.parent().addClass("ThumbElementEmpty");
        }
        if (index + MiddleIndex > ImagesInView)
        for (var cbI = MiddleIndex; cbI < 60; cbI++) {
        var elem = $('#SliI_' + cbI);
        if (elem.length == 0)
        continue;
        elem[0].ImageID = -1;
        elem[0].src = "/images/DXViewer/empty.png";
        elem.parent().addClass("ThumbElementEmpty");
        }
        */
        nOffs = 0;
        var nOffset = 0;
        if (_lastFillRestIndex)
            nOffset = index - _lastFillRestIndex;
        /*
        for (var cbI = dIndex; CurrentImages != null && cbI < CurrentImages.length && offs < 60; cbI++) {
        var ElementBefore = $('#SliI_' + offs + nOffs);
        var Element = $('#SliI_' + offs++);

        if (!Element.length)
        return;
        if (Element.offset().left < $(window).width() && Element.offset().left > -56) {
        if (Element[0].ImageID != parseInt(CurrentImages[cbI].getAttribute('ID'))) {
        Element[0].ImageID = parseInt(CurrentImages[cbI].getAttribute('ID'));
        //                Element.fadeTo(10, 0.2);
        Element[0].src = "/SLOAIMGTMB_" + Element[0].ImageID + ".jpg";
        Element.parent().removeClass("ThumbElementEmpty");
        }
        var nFact = 1;
        if (cbI == dIndex) {
        nFact = nMulti;
        }
        AlignTmb(Element, cbI, nFact);
        }
        Element[0].Offset = nOffs++;
        }
        */
        if (ImagesInView > 60 && dIndex > 45 || dIndex < 15) {
            /*            while (offs < 60 && LoadOffset < 1) {
            var Element = $('#SliI_' + offs++);
            Element.get(0).src = "/images/DXViewer/empty.png";
            Element.parent().addClass("ThumbElementEmpty");
            }
            */
            //            Carousel.MoveTo(index);

            if (dIndex < MiddleIndex && LoadOffset > 0) {
                // PageBack
                LoadOffset = Math.max(0, (index - (ListItems)));
            }
            else {
                // Pageforw
                if (ImagesInView > ListItems)
                    LoadOffset = Math.max(0, (index - (ListItems / 2)));
                if (ImagesInView > ListItems && ImagesInView - ListItems < LoadOffset) {
                    LoadOffset = ImagesInView - ListItems;
                }
                if (LoadOffset < 0)
                    LoadOffset = 0;
            }
            if (LoadOffset + ListItems <= ImagesInView)
                if (LoadOffset != LoadOffsetBefore) {
                    WaitForNext(function () { return InLoad; }, function () {
                        InLoad = true;
                        var NeedClear = true;
                        if (LoadOffsetBefore > LoadOffset && CurrentImages.length < ListItems)
                            NeedClear = false; // reload of last set
                        //                        if(NeedClear)

                        SLApp.UserAndInfoService.GetTinyImgInfo(GetCurrentDirID(), LoadOffset, ListItems, Carousel.GetFlat(), SortOrder, _FolderType, _SearchFor, _SearchForAny, _SearchForExact, ImageSearchType /*Images Only"*/, _SearchOption,
                    function (XML) {
                        ClearThumbs();
                        InLoad = false;
                        CurrentImages = XML.getElementsByTagName('Image');
                        if (CurrentImages.length == 0){
                            if(XML.getElementsByTagName('Error').length>0){

                                if (SortOrder.indexOf('random') != -1) {
                                    SLApp.UserAndInfoService.StartRandomAccess(GetCurrentDirID(), Carousel.GetFlat(), _SearchFor, _SearchForAny, _SearchForExact, ImageSearchType, function (ret) {
                                        SortOrder = ret;
                                        SortOrderOriginal = "default";

                                    })
                                }
                            }
                        }
                        // cache tumbnails
                        FillThumbs(LoadOffset);
                        /*
                        for (var cbI = 0; cbI < CurrentImages.length; cbI++) {
                        var img = new Image();
                        var id = parseInt(CurrentImages[cbI].getAttribute('ID'));
                        img.src = "/SLOAIMGTMB_" + Element[0].ImageID + ".jpg";
                        thumbs[id] = img;
                        }
                        */
                        DoFillRest(index);
                        refreshElementsCount();
                        return;
                    }, function (e) {
                        InLoad = false;
                    });
                    });
                    return;

                }
        }


        offs = MiddleIndex - 1;
        nOffs = -1;
        /*
        for (var cbI = dIndex - 1; cbI > -1 && offs > -1 && cbI < 60; cbI--) {
        var Element = $('#SliI_' + offs--);

        if (CurrentImages.length > cbI && Element[0].ImageID != parseInt(CurrentImages[cbI].getAttribute('ID'))) {

        //                Element.fadeTo(10, 0.2);
        //                Element[0].ImageID = parseInt(CurrentImages[cbI].getAttribute('ID'));
        //                Element[0].src = "/SLOAIMGTMB_" + Element[0].ImageID + ".jpg";
        //                Element.parent().removeClass("ThumbElementEmpty");
        }
        //            Element[0].Offset = nOffs--;
        var nFact = 1;
        if (cbI == dIndex) {
        nFact = nMulti;
        }

        //            AlignTmb(Element, cbI, nFact);
        }
        */
    }

    function InZoom() {
        var scrOfX = 0, scrOfY = 0;

        if (typeof (window.pageYOffset) == 'number') {
            //Netscape compliant
            scrOfY = window.pageYOffset;
            scrOfX = window.pageXOffset;
        } else if (document.body && (document.body.scrollLeft || document.body.scrollTop)) {
            //DOM compliant
            scrOfY = document.body.scrollTop;
            scrOfX = document.body.scrollLeft;
        } else if (document.documentElement && (document.documentElement.scrollLeft || document.documentElement.scrollTop)) {
            //IE6 standards compliant mode
            scrOfY = document.documentElement.scrollTop;
            scrOfX = document.documentElement.scrollLeft;
        }
        wasZoomed = false;
        //        if (initialSizeX >= $(window).width() && initialSizeY >= $(window).height())
        //            return false;
        if (scrOfX > 0 || scrOfY > 0)
            wasZoomed = true;

        if (window.innerWidth >= $(window).width()-10 && window.innerHeight >= $(window).height()-10)
            wasZoomed = false;
        else
            wasZoomed = true;
        return wasZoomed;
    }

    
    DisplayCurrentImage = function (index) {
        WaitForNext(function () { return inShowing; }, function () {
            inShowing = true;
//            $('#ssb').height(ssbHeight);
            ShowSLImage(index - LoadOffset, CurrentImages,
                    function (theImage,ImageId) {
                        dtLastLoad = new Date();

                        if (theImage) {
                            var txtTitle = $("<div/>").html(theImage.getAttribute('Name')).text();
                            try {
                                $('#nameDescPanelHdr').html(linkify(txtTitle));
                            } catch (e) {
                                $('#nameDescPanelHdr').text(txtTitle);
                            }

                            var txtDescription = '';
                            if (theImage.getAttribute('Name') != theImage.getAttribute('Description'))
                                txtDescription = $("<div/>").html(theImage.getAttribute('Description')).text();
                            try {
                                $('#nameDescPanelDescr').html(linkify(txtDescription));
                            } catch (e){
                                $('#nameDescPanelDescr').text(txtDescription);
                            }
                            $('#nameDescPanelDescr').ellipsis({ lines: 3, responsive: true });
                            $('#nameDescPanelHdr').ellipsis({ lines: 3, responsive: true });

                            var h = 0;
                            var w = 0;
                            if (getQueryParam('textp') === 'below') {
                                h = $('#nameDescriptorsBelow').height() + 2;
//                                $('.nameDescriptorsBelow').css('bottom', h + 'px');
//                                $('#ssb').css('height', 'calc(100% - ' + h + 'px)');
                                $('#i_img_' + ImageId).removeAttr('width').removeAttr('height');
                                $('#i_img_' + ImageId).css({ 'max-width':'100%','max-height':'100%' });
                                $('#ImagesView').height($('#ssb').height() - h);
                                var imgHolder = $('#SSI' + ImageId);
                                var nAspect = $('#i_img_' + ImageId).data('ascpectRatio');
                                if (imgHolder.height() > $('#ssb').height() - h) {
                                    imgHolder.height($('#ssb').height() - h);
                                    imgHolder.width(imgHolder.height() * nAspect);
                                    imgHolder.css('left', ($('#ssb').width() - $('#SSI' + ImageId).width()) / 2);
                                }
                                if (imgHolder.width() > $('#ssb').width() - w) {
                                    imgHolder.width($('#ssb').width() - w);
                                    imgHolder.height(imgHolder.width() / nAspect);
                                    imgHolder.css('left', ($('#ssb').width() - $('#SSI' + ImageId).width()) / 2);
                                }

                                imgHolder.css('top', (($('#ssb').height() - h) - $('#SSI' + ImageId).height()) / 2);
                                $('.Controller').css({ 'bottom': h+'px'});

                            }
                            if (getQueryParam('resize') === 'true') {
                                if (!$('#i_img_' + ImageId).data('resizesend')) {

                                    $('#IV_SlideBack').hide();
                                    window.parent.postMessage({
                                        emitter: window.name,      // Security Check; must match the IFRAME name attribute.
                                        action: 'resize',
                                        y: h + Math.max($('#i_img_' + ImageId).height(), 260)
                                    },
                                        '*'
                                    );
                                    $('#i_img_' + ImageId).data('resizesend',true);
                                }
                                if ($('#SSI' + ImageId).height() < $('#ssb').height())
                                    $('#SSI' + ImageId).css('top', ($('#ssb').height() - $('#SSI' + ImageId).height())/2 + 'px');
                                else
                                    $('#SSI' + ImageId).css('top', '0px');
/*                                $('#ssb').height(Math.max($('#i_img_' + ImageId).height(), 260));
                                $(window).resize();
*/
                            }
                            if (ImagesInView > 0)
                                $('#ImgOfImg').text(    (1 + CurrentIndex) + '/' + ImagesInView);
                            else
                                $('#ImgOfImg').text((1 + CurrentIndex) + '/');

                            imagePos = $('#SSI' + ImageId).position();
                            var l = 30; // Math.max(imagePos.left, 30);
                            if ($('#CloseSLBtn').css("display") === "block") {
                                l = 70;
                                $('#nameDescriptors').css('width', 'calc(100% - 140px)');
                            }
                            if (getMobileOperatingSystem() == 'iOS' && screenfull.isEnabled && screenfull.isFullscreen) {
                                l += 90;
                                $('#nameDescriptors').css('width', 'calc(100% - ' + parseInt(l + 70) + 'px)');
                                $('.pinLeft').css('left', '100px');
                            }
                            $('#nameDescriptors').css('left', l + 'px');

                            SetThumbsPlace(index);
                            FillRest = index;
                            UpdateInfoPanel(index, theImage);
                            if(AfterImage)
                                AfterImage(ImageId);
                        }

                    },
                    function () {
                        dtLastLoad = null;
                        inShowing = false;
                    });
        });
    }
    fillImgs = function (index) {
        if (SLOpen == -1)
            SlideShow(index - LoadOffset, CurrentImages);

        SLOpen = 1;
        if (CurrentImages == undefined)
            CurrentImages = null;
        try {
            if (CurrentImages != null && index <= LoadOffset + ListItems && index >= LoadOffset && index - LoadOffset < CurrentImages.length) {
                if (CurrentIndex != index) {
                    CurrentIndex = index;
                    DisplayCurrentImage(index);
                };
            }
            else {
                Carousel.MoveTo(index, function () {
                    DisplayCurrentImage(index);
                });
            }
        } catch (e) {
            CurrentImages = null;
            Carousel.MoveTo(index, function () {
                if (CurrentIndex != index) {
                    CurrentIndex = index;
                    DisplayCurrentImage(index);
                };
            });
        }
    }

    var DoLoad = null;
    function WaitForNext(val, onDoAction) {
        if (val()) {
            if (DoLoad != null)
                window.clearTimeout(DoLoad);
            DoLoad = window.setTimeout(function () {
                onDoAction();
                window.clearTimeout(DoLoad);
                DoLoad = null;
            }, 300);
            return false;
        }
        else {
            onDoAction();
            return true;
        }
    }

    function GetThem(index, onDone) {

        if (SortOrder.substr(0, 6) == "random") {
            if (SortOrder.length == 6) {
                var InterVal = setInterval(function () {
                    if (SortOrder.length > 6) {
                        clearInterval(InterVal);
                        GetThemWithNowWait(index, onDone)
                    }
                }, 400);
            }
            else
                GetThemWithNowWait(index, onDone)
        }
        else
            GetThemWithNowWait(index, onDone)
    }

    function GetThemWithNowWait(index, onDone) {
        if (index > (LoadOffset) + ListItems || index < LoadOffset || LoadOffset < 0 || CurrentImages == null || !(index - LoadOffset < CurrentImages.length)) {
            LoadOffset = Math.max(0, (index - (ListItems / 2)));
            if (ImagesInView < ListItems)
                LoadOffset = 0;
            InLoad = true;



            SLApp.UserAndInfoService.GetTinyImgInfo(GetCurrentDirID(), LoadOffset, ListItems, Carousel.GetFlat(), SortOrder, _FolderType, _SearchFor, _SearchForAny, _SearchForExact, ImageSearchType, _SearchOption,
                function (XML) {
                    ClearThumbs();
                    InLoad = false;
                    if (XML) {
                        CurrentImages = XML.getElementsByTagName('Image');
                        // cache tumbnails
                        if (CurrentImages.length == 0)
                        {
                            if (XML.getElementsByTagName('Error').length > 0) {
                                if (SortOrder.indexOf('random') != -1) {
                                    SLApp.UserAndInfoService.StartRandomAccess(GetCurrentDirID(), Carousel.GetFlat(), _SearchFor, _SearchForAny, _SearchForExact, ImageSearchType, function (ret) {
                                        SortOrder = ret;
                                        SortOrderOriginal = "default";
                                    })
                                }
                                else
                                    Carousel.SetFlatMode(true);
                            }

                        }
                        if (GotoIndex > -1)
                            FillThumbs(LoadOffset);

                        GotoIndex = index;
                        SetThumbsPlace(index);
                        fillImgs(index);

                        refreshElementsCount();
                        if (onDone)
                            onDone();
                    }
                }, function (e) {
                    InLoad = false;
                });
        }
        else {
            GotoIndex = index;
            if (onDone)
                onDone();
        }
    }

    this.MoveTo = function (index, onDone) {
        if (InLoad == true)
            return;

        if (ImagesInView < 1) {
            InLoad = true;
            SLApp.UserAndInfoService.GetObjectCount(GetCurrentDirID(), Carousel.GetFlat(), ImageSearchType, _SearchFor, _SearchForAny, _SearchForExact, _SearchOption, function (recs) {
                ImagesInView = parseInt(recs);
                if (ImagesInView === 0) {
                    if (Carousel.GetFlat() > 0) {
                        // No images even in flat mode? -> Display hint
                        Carousel.HideSpinner();
                        $('<div id="EmptySlideShow">' + _locSlideShowStrings.EmptySlideShow + '</div>').appendTo($('#slideShow'));
                        if (getQueryParam('textc'))
                            $('#EmptySlideShow').css('color', '#' + getQueryParam('textc'));

                        AlignMiddle();
                        InLoad = false;
                        SlideShow(-1);
                        $('#nameDescriptorsBelow').hide();
                    }
                    else {
                        Carousel.SetFlatMode(true);
                        InLoad = false;
                        Carousel.MoveTo(index, onDone);
                    }
                    return;
                }
                InLoad = false;
                
                GetThem(index);
            }, function () {
                InLoad = false;
                //error?
            });
        }
        else
            GetThem(index, onDone);
    }

    var currentIDInView = null;
    var LastIDInView = null;
    var CurrentSLIndex = null;
    var SLImagesInQuery = -1;
    var SLImagesOnPage = 0;
    var SLPage = 0;
    function IsImgBehindReady() {
        if ($('#imgBehind').get(0).src.indexOf('Img.ashx') < 0)
            return false;
        return $('#imgBehind').get(0).complete;
    }
    function IsBevoreReady() {
        if ($('#imgBefore').get(0).src.indexOf('Img.ashx') < 0)
            return false;
        return true;
    }

    function ShowSLImage(Index, imgs, OnHaveInfo, OnDone) {
        var theImage = imgs[Index];
        var nextImage = null;
        try {
            nextImage = imgs[Index + 1];
        } catch (e) {

        }

        imgs[Index + 1];
        if (theImage == null)
            return false;

        CurrentSLIndex = Index;


        if (!$("#SSI" + currentIDInView).length)
            bAllowNewImage = true;
        if (!bAllowNewImage && currentIDInView != null)
            return false;
        LastViewnIndex = Index;
        currentIDInView = parseInt(theImage.getAttribute('ID'));

        var ImagesC = $('#ImagesView');
        if (ImagesC.length == 0) {
            ImagesC = $('<div id="ImagesView" class="ImagesStuff"><div>').appendTo("#ssb");
            $('<div id="SSIP" style="position:absolute;left:-1024px;top:0px"><img id="imgBefore"/> </div>').appendTo(ImagesC);
            $('<div id="SSIA" style="position:absolute;left:2048px;top:0px"><img id="imgBehind"/> </div>').appendTo(ImagesC);

            /*            ImagesC.draggable({ axis: 'x',
            stop: function (event, ui) {

            if (ui.position.left > 0) {
            $('#prevPic').click();
            $('#ImagesView').css('left', ($('#ssb').width() + 80) + 'px');
            }
            if (ui.position.left < 0) {
            $('#nextPic').click();
            $('#ImagesView').css('left', ($('#ssb').width() + 80) * -1 + 'px');
            }
            ImagesC.draggable("option", "disable", true);

            }

            });
            */
            ImagesC.css({
                'position': 'absolute',
                'width': '100%',
                height: $(window).height()
            });

            try {
                ImagesC[0].onmousedown = function (e) {
                    if (!$(e.target).hasClass('SSIHLD') && !$(e.target).hasClass('carusellV-theImage'))
                        return true;
                    ImagesC[0]._startMove = e.pageX;
                    ImagesC[0]._startMoveY = e.pageY;
                    ImagesC[0]._lastMoveY = e.pageY;

                    //                    ShowSliderStop();
                    if (ImagesC[0].setCapture)
                        ImagesC[0].setCapture();
                    ImagesC.on("mouseout", function () {
                        $(document).trigger("mouseup");
                    });

                    ImagesC[0].onmousemove = function (e) {
                        try {
                            var x = parseInt(e.pageX) - parseInt(ImagesC[0]._startMove);
                            var y = parseInt(e.pageY) - parseInt(ImagesC[0]._startMoveY);
                            var yOffs = parseInt(e.pageY) - parseInt(ImagesC[0]._lastMoveY);
                            ImagesC[0]._lastMoveY = e.pageY;
                            var sW = $("#sizer").width();
                            if (LastViewnIndex + LoadOffset == ImagesInView - 1) {
                                if (x < 0)
                                    x = 0;
                            }
                            if (LastViewnIndex + LoadOffset == 0) {
                                if (x > 0)
                                    x = 0;
                            }

                            if (x > 0)
                                x = Math.min(x * 3, $('#ssb').width());
                            else
                                if (x < 0)
                                    x = Math.max(x * 3, -$('#ssb').width());

                            ImagesC.css('left', x + 'px');
                        } catch (err) {
                            alert("error on moving" + e + ' ' + err.message);
                        }
                        if (x < 30 && x > -30 && y !== 0) {
                            console.log(yOffs);
                            window.parent.postMessage({
                                emitter: window.name,      // Security Check; must match the IFRAME name attribute.
                                action: 'scroll',
                                y: yOffs*-1 //window.innerHeight      // Positive/negative number of pixels (Will be limited to the IFRAME size.)
                            },
                                '*'
                            );

                        }
//                        e.preventDefault();
                    };
//                    e.preventDefault();
                    $(document).on('mouseup', function (e) {
                        if(document.releaseCapture)
                            document.releaseCapture();
                        if (ImagesC.offset().left > 5) {
                            $('#prevPicture').click();
                            //                            $('#ImagesView').css('left', ($('#ssb').width() + 80) + 'px');
                            $('#ImagesView').animate({
                                left: ($(('#ssb')).width() + 80)
                            }, 200, function () {
//                                    debugger;
                            });
                        }
                        else {
                            if (ImagesC.offset().left < -5) {
                                $('#NextPicture').click();
                                //                                $('#ImagesView').css('left', ($('#ssb').width() + 80) * -1 + 'px');
                                $('#ImagesView').animate({
                                    left: ($(('#ssb')).width() + 80) * -1
                                }, 200, function () {
//                                        debugger;
                                });
                            }
                            else {
                                var x = parseInt(e.pageX) - parseInt(ImagesC[0]._startMove);
                                if (Math.abs(x) < 5) // really a click
                                {
                                    if (e.clientX < $(('#ssb')).width() / 2) {
                                        if (LastViewnIndex + LoadOffset > 0) {
                                            ImagesC.css('left', '0px');
                                            var animT = 500;
                                            ImagesC.animate({
                                                left: '+=' + ($('#ssb').width() + 80)
                                            }, 500, function () {
                                                //complete
                                            });
                                            $('#prevPicture').click();
                                        }
                                    }
                                    else {
                                        ImagesC.css('left', '0px');
                                        var tDelay = 0;
                                        if (!IsImgBehindReady())
                                            tDelay = 300;
                                        if (LastViewnIndex + LoadOffset < ImagesInView - 1) {
                                            window.setTimeout(function () {
                                                ImagesC.animate({
                                                    left: '-=' + ($(('#ssb')).width() + 80)
                                                }, animT, function () { });
                                                //complete
                                                $('#NextPicture').click();
                                            }, tDelay);
                                        }
                                    }
                                }
                            }


                        }
                        $('#player').hide();
                        if (CurrentIndex >= ImagesInView - 1) {
                            $('#ImagesView').stop();
                            $('#ImagesView').css('left', '0px');

                        }
                        if (GotoIndex <= 0 && CurrentIndex == 0) {
                            $('#ImagesView').stop();
                            $('#ImagesView').css('left', '0px');
                        }
                        ImagesC[0].onmousemove = null;
                        $(document).unbind('mouseup');
                        ImagesC.unbind('losecapture');
                    });
                };
            } catch (e) {
                //                alert("error on adding handler" + e.message);
            };

            try {
                ImagesC.bind('touchstart', function (e) {
                    ImagesC[0]._startMove = e.originalEvent.targetTouches[0].clientX;
                    ImagesC[0]._lastMoveY = e.originalEvent.targetTouches[0].clientY;

                    //                    ImagesC[0].Touches = e.originalEvent.targetTouches;
                    if (!InZoom()) {
                        ImagesC.bind('touchmove', function (e) {
                            var yOffs = parseInt(e.originalEvent.targetTouches[0].clientY) - parseInt(ImagesC[0]._lastMoveY);
                            var x = parseInt(e.originalEvent.targetTouches[0].clientX) - parseInt(ImagesC[0]._startMove);

                            if (!InZoom()) {
                                if (x > 0)
                                    x = Math.min(x * 3, $('#ssb').width());
                                else
                                    if (x < 0)
                                        x = Math.max(x * 3, -$('#ssb').width());

                                ImagesC.css('left', x + 'px');
                                if (e.originalEvent.targetTouches.length == 1)
                                    e.preventDefault();

                                console.log(yOffs);
                                window.parent.postMessage({
                                    emitter: window.name,      // Security Check; must match the IFRAME name attribute.
                                    action: 'scroll',
                                    y: yOffs*-1 //window.innerHeight      // Positive/negative number of pixels (Will be limited to the IFRAME size.)
                                },
                                    '*'
                                );


                            }
                        });
                    }
                    $(document).bind('touchend', function (e) {
                        if (!InZoom()) {
                            if (ImagesC.offset().left > 5) {
                                if (GotoIndex > 0) {
                                    $('#prevPic').click();
                                    $('#ImagesView').animate({
                                        left: ($(('#ssb')).width() + 80)
                                    }, 200, function () { });
                                }else {
                                    $('#ImagesView').animate({
                                        left: 0
                                    }, 10, function () { });

                                }
                            }
                            else {
                                if (ImagesC.offset().left < -5) {
                                    if (GotoIndex < ImagesInView - 1) {
                                        $('#NextPicture').click();
                                        $('#ImagesView').animate({
                                            left: ($(('#ssb')).width() + 80) * -1
                                        }, 200, function () { });
                                    } else {
                                        $('#ImagesView').animate({
                                            left: 0
                                        }, 10, function () { });

                                    }

                                }
                                else {
                                    ImagesC.css('left', '0px');
                                    showHideControls(true);
//                                    $('#NextPicture').click();
                                }
                                $('#player').hide();
                            }

                        }

                        ImagesC.unbind('touchmove');
                        $(document).unbind('touchend');
//                        showHideControls(true);
                    });

                });

            } catch (e) {
                log("error: " + e.message);
            }

        }
        $('#SSIP').width($('#ssb').width());
        $('#SSIP').height($('#ssb').height());
        if ($('#ssb').offset())
            $('#SSIP').css('top', $('#ssb').offset().top + 'px');
        else
            $('#SSIP').css('top', '0px');
        $('#SSIP').css('left', ($('#ssb').width() + 80) * -1 + 'px');

        $('#SSIA').width($('#ssb').width());
        $('#SSIA').height($('#ssb').height());
        if ($('#ssb').offset())
            $('#SSIA').css('top', $('#ssb').offset().top + 'px');
        else
            $('#SSIA').css('top', '0px');
        $('#SSIA').css('left', $('#ssb').width() + 80 + 'px');

        if (getQueryParam('textp') === 'below') {
            h = $('#nameDescriptorsBelow').height() + 2;
            $('#SSIA').height($('#ssb').height() - h);
            $('#SSIP').height($('#ssb').height() - h);
/*          var imgHolder = $('#SSI' + ImageId);
            var nAspect = $('#i_img_' + ImageId).data('ascpectRatio');
            if (imgHolder.height() > $('#ssb').height() - h) {
                imgHolder.height($('#ssb').height() - h);
                imgHolder.width(imgHolder.height() * nAspect);
                imgHolder.css('left', ($('#ssb').width() - $('#SSI' + ImageId).width()) / 2);
            }
            if (imgHolder.width() > $('#ssb').width() - w) {
                imgHolder.width($('#ssb').width() - w);
                imgHolder.height(imgHolder.width() / nAspect);
                imgHolder.css('left', ($('#ssb').width() - $('#SSI' + ImageId).width()) / 2);
            }

            imgHolder.css('top', (($('#ssb').height() - h) - $('#SSI' + ImageId).height()) / 2);
            $('.Controller').css({ 'bottom': h + 'px' });
*/

        }

        var hld = $('#SSI' + currentIDInView);
        if (hld.length == 0) {
            hld = $('<div class="SSIHLD" id="SSI' + currentIDInView + '" style="display:none"></div>');
            hld.appendTo(ImagesC);
        }
        else {
            hld.html('');
            hld.hide();
        }

        if (!$("#Images_cache").length) {
            $('<div id="Images_cache" style="visibility:hidden;Display:none"></div>').appendTo($('#ImagesView'));
        }

        if (theVideo != null) {
            theVideo.unload()
                .then(() => {
                    theVideo.destroy();
                })
                .catch((error) => {
                    console.error("Source unload failed with error: ", error);
                });
        }
        theVideo = null;

        DisableController();
        $("#imageInfoPanel").hide();

        $(".SSIHLD img").each(function (index, element) {
            if (!element.complete) {
                $(this).parent().stop();
                $(this).parent().remove();
            }
        })
        $("#imgProg").each(function (index, element) {
            window.clearInterval(element.progInter);
            $(element).remove();
        })
        //        hld.append('<img id="DLTMPIMG_' + currentIDInView + '" width="' + w + '+px" height="' + h + 'px" src="/SLOAIMGTMB_' + currentIDInView + '.jpg" />');
        $('<div id="imgProg" class= "SSIHLD"><div id="imgProgBar"></div></div>').appendTo($("#ssb"));
        if ($('#imgProg')) {
            $('#imgProg')[0].i = 0;
            $('#imgProg')[0].progInter = window.setInterval(function () {
                if ($('#imgProg').length) {
                    if ($('#imgProg')[0].i == 100)
                        $('#imgProg')[0].i = 0;
                    if ($('#imgProg')[0].i > 2)
                        $('#imgProg').css('visibility', 'visible');
                    $('#imgProgBar').css('width', $('#imgProg')[0].i++ + '%');
                }
            }, 250);
        }
        makeUnselectable(document.getElementById("ImagesView"));
        makeUnselectable(document.getElementById("SSIA"));
        makeUnselectable(document.getElementById("SSIP"));

        if (!GetTheImage(theImage, hld, OnHaveInfo, OnDone, nextImage, imgs)) {
            //            beep();
            console.log("Don't get an image because sizes are zero!")
            var sizeInterval = window.setInterval(function () {
                if (GetTheImage(theImage, hld, OnHaveInfo, OnDone, nextImage, imgs))
                    window.clearInterval(sizeInterval);
            }, 500);
        }
        /*        hld.click(function () {
        $('#nextPic').click();
        });
        */
        return true;
    }
    function GetTheImage(theImage, hld, OnHaveInfo, OnDone, nextImage, imgs) {
        var scale = Math.min(GetImageScaleFactor(parseInt(theImage.getAttribute('CX')), parseInt(theImage.getAttribute('CY')), Math.max($('#ssb').width(), 200), Math.max($('#ssb').height() - 0)), 1.0);
        var w = parseInt(theImage.getAttribute('CX') * scale + .5);
        var h = parseInt(theImage.getAttribute('CY') * scale + .5);
//        console.log("Got image at " + w + "px," + h + "px, ssb sizex:" + $('#ssb').width() + "*" + $('#ssb').height());
        //console.log('Show img scaled from ' + theImage.getAttribute('CX') + 'x' + theImage.getAttribute('CY') + ' to ' + w + 'x' + h + ' (frame is ' + $('#ssb').width() + 'x' + $('#ssb').height() + ')');
        $('#theVideo_' + currentIDInView).remove();
        if (h === 0 || w === 0)
            return false;
        GetImageObject(currentIDInView, '', parseInt(theImage.getAttribute('CX')), parseInt(theImage.getAttribute('CY')), w, h, function (obj, xml) {
            switch (xml.getAttribute('Type')) {
                case "0":
                case "2":
                    hld.css({
                        'top': '0px',
                        'left': '0px',
                        'width': parseInt(($('#ssb').outerWidth())) + 'px',
                        'height': parseInt(($('#ssb').outerHeight())) + 'px'

                        /*
                                                'top': parseInt(($('#ssb').outerHeight() - h) / 2) + 'px',
                                                'left': parseInt(($('#ssb').outerWidth() - w) / 2) + 'px',
                                                'width': w,
                                                'height': h
                        */
                    });
                    $('#SSIP').css('visibility', 'visible');
                    $('#SSIA').css('visibility', 'visible');
                    obj[0].ScaleAspect = true;
                    obj.addClass("carusellV-theImage");
                    break;
                default:
                    hld.css({
                        'top': '0px',
                        'left': '0px',
                        'width': parseInt(($('#ssb').outerWidth())) + 'px',
                        'height': parseInt(($('#ssb').outerHeight())) + 'px'


                    });
                    $('#SSIP').css('visibility', 'hidden');
                    $('#SSIA').css('visibility', 'hidden');
                    break;

            }

            hld.append(obj);

            $('#ImagesView').css({
                height: hld.height()
            });


            $(obj).data('ascpectRatio', w / h);
            obj.css('visibility', 'hidden');
            if (!obj[0].ScaleAspect) {
                hld.css({
                    'top': 0,
                    'left': 0,
                    'width': $('#ssb').outerWidth(),
                    'height': $('#ssb').outerHeight() - 100
                });
                obj.width($('#ssb').outerWidth());
                obj.height($('#ssb').outerHeight() - 100);
            }
            obj[0].ImageID = currentIDInView;
            hld[0].ImageID = currentIDInView;
            hld[0].Done = false;
            hld[0].Index = CurrentSLIndex;
            obj[0].element = xml;
            hld[0].element = xml;
            try {
                var video = $('#theVideo_' + currentIDInView);
                if (video.length) {
                    video.css({ position: 'relative', width: obj.width(), height: obj.height() });

                    var playerConfig = {
                        key: "d0167b1c-9767-4287-9ddc-e0fa09d31e02",
                        appId: "MediaCenter.PLUS",
                        ui: true,
                        adaptation: {
                            desktop: {
                                limitToPlayerSize: true
                            },
                            mobile: {
                                limitToPlayerSize: true
                            }
                        },
                        playback: {
                            muted: false,
                            autoplay: InVideoPlaying ? true : false
                        },
                        events: {
                            [mkplayer.MKPlayerEvent.Paused]: (event) => {
                                if ($('#playPic').hasClass('pausePic')) {
                                    TogglePlayShow(false, false);
                                    InVideoPlaying = false;
                                    console.log("paused");
                                }
                            },
                            [mkplayer.MKPlayerEvent.Play]: (event) => {
                                if (!$('#playPic').hasClass('pausePic')) {
                                    TogglePlayShow(false, false);
                                    InVideoPlaying = true;
                                    console.log("play");
                                }
                            },
                            [mkplayer.MKPlayerEvent.PlaybackFinished]: (event) => {
                                //theVideo.IsPlaying = false;
                                console.log("end");
                                $('#NextPicture').click();
                            }
                        }
                    };
                    let theVideo = new mkplayer.MKPlayer(document.getElementById('theVideo_' + currentIDInView), playerConfig);

                    const sourceConfig = {
                        //title: "Title for your source",
                        //description: "Brief description of your source",
                        //poster: $('#tmb_' + imgID).attr('src'),
                        hls: video.data('hls'),
                        dash: video.data('dash')
                    };
                    theVideo.load(sourceConfig)
                        .then(() => {
                            $("#theVideo_" + currentIDInView).find('video').width($("#theVideo_" + currentIDInView).width());
                            $("#theVideo_" + currentIDInView).find('video').height($("#theVideo_" + currentIDInView).height());
                        })
                        .catch((error) => {
                            console.error("An error occurred while loading the source!");
                        });

                }
            } catch (e) {
                console.log(e);
            }


            $('#i_img_' + currentIDInView).data('LastID', LastIDInView);
            hld.data('LastID', LastIDInView);
            LastIDInView = currentIDInView;

            function ItemReady(comObj) {
                this.HideSpinner();
                if (IncrementViews)
                    SLApp.UserAndInfoService.incViews(currentIDInView);

                //            SLApp.Controls.ImageInfo.IncImgViews(currentIDInView,function () { 
                $("#ImageInfoPanel").hide();
                LoadingImageInProg = false;
                EnableController();
                $("#imgProg").each(function (index, element) {
                    window.clearInterval(element.progInter);
                    $(element).remove();
                });
                $('#DLTMPIMG_' + currentIDInView).remove();
                obj.css('visibility', 'visible');



                if (FirstStart === 1)
                    if (!AutoStartSet)
                        if (parseInt(getQueryParam("Start")) != 1)
                            showHideControls(true);
                OnDone();
                dtImageGotAt = new Date();

                if (AutoStart == true) {
                    dtImageGotAt = new Date();
                    //                    setTimeout('$("#playPic").click();', );
                    setTimeout(function () {
                        TogglePlayShow(false);
                    }, 30);
                }
                AutoStart = false;

                var timeFade = 250;
                $('#ImagesView').stop();
                if ($('#ImagesView').position().left != 0) {
                    timeFade = 0;
                    hld.stop();
                }

                hld.fadeTo(timeFade, 1, function () {
                    $(".SSIHLD").each(function (index, element) {
                        if (comObj == null || element.id != 'SSI' + comObj.ImageID) {
                            $(this).stop();
                            $(this).remove();
                        }
                    });
                });
                if (comObj != null) {
                    if ($('#SSI' + comObj.ImageID)[0] != undefined)
                        $('#SSI' + comObj.ImageID)[0].Done = true;
                }

                var Element = $('#SliI_' + 0);
                if (Element[0].ImageID == undefined)
                    FillThumbs(LoadOffset);

                if (comObj != null) {
                    if ($(comObj).parent() != undefined)
                        $(comObj).parent()[0].Done = true;
                    OnHaveInfo(comObj.element, comObj.ImageID);
                    if (timeFade) {
                        var lastID = $(comObj).data('LastID');
                        if (lastID != null && lastID != currentIDInView)
                            $('#SSI' + lastID).fadeOut(timeFade * 3, function () {
                                $(".SSIHLD").each(function (index, element) {
                                    //                                if (element.id != 'SSI' + comObj.ImageID)
                                    if (element.id != 'SSI' + comObj.ImageID)
                                        if ($(element).first()[0].complete == true || element.Done == true) {
                                            if (element.Index == CurrentSLIndex - 1) {
                                                try {
                                                    if ($("#i_img_" + element.ImageID).length > 0)
                                                        $('#imgBefore').get(0).src = $("#i_img_" + element.ImageID).get(0).src;
                                                } catch (e) { };
                                            }
                                            $(this).stop();
                                            $(this).remove();
                                        }
                                });
                            });
                    }
                }
                if (nextImage != null) {
                    window.setTimeout(function () {
                        if (nextImage.getAttribute('Type') == '0') {
                            var h1 = h;
                            if (!$('#nameDescriptorsBelow').length)
                                h1 -= $('#nameDescriptorsBelow').height();
                            GetImageObject(parseInt(nextImage.getAttribute('ID')), '', parseInt(nextImage.getAttribute('CX')), parseInt(nextImage.getAttribute('CY')), w, h1, function (obj, xml) {
                                obj[0].id += "_Cache";
                                obj.data('Id', obj[0].id);
                                obj.on('load', function () {
                                    if ($('#imgBehind').get(0))
                                        $('#imgBehind').get(0).src = obj[0].src;

                                    $('#Images_cache img').each(function (e, i) {
                                        if (this.id != obj[0].id)
                                            $(this).remove();
                                    });
                                });
                                $('#Images_cache').append(obj);
                                obj.css('visibility', 'hidden');
                                if (FirstImageDone-- == 0) {
                                    showHideControls(true, true);
                                }
                            });
                        }
                    }, 100);
                }
                /*              if (UpdateShares != undefined)
                UpdateShares(currentIDInView, GetCurrentDirID())
                if (ImageInfoUpdate != undefined)
                ImageInfoUpdate(currentIDInView, function () {
                if (InfoVisinble)
                $("#imageInfoPanel").show();

                var TheInfo = $('#ImageInfo');

                });
                */

                $('#ImagesView').css({ 'left': '0px', 'top': '0px' });
                //                $('#ImagesView').draggable("option", "disabled", false);

                if (LastViewnIndex > 0) {
                    var iBevore = imgs[LastViewnIndex - 1];
                    if (iBevore) {
                        var scale = Math.min(GetImageScaleFactor(parseInt(iBevore.getAttribute('CX')), parseInt(iBevore.getAttribute('CY')), Math.max(200, $('#ssb').width()), Math.max(200, $('#ssb').height())), 1.0);
                        var w = parseInt(iBevore.getAttribute('CX') * scale + .5);
                        var h = parseInt(iBevore.getAttribute('CY') * scale + .5);
                        $('#imgBefore').get(0).src = "/SLOAIMGTMB_" + iBevore.getAttribute('ID') + ".jpg";
                        $('#imgBefore').width(w);
                        $('#imgBefore').height(h);
                        //                        $('#imgBefore').css("margin-top", ($('#ImagesView').height() - h) / 2);
                        //                        $('#imgBefore').css("margin-left", ($('#ssb').width() - w) / 2 + "px");
                        if (lastActionWasBack) {
                            window.setTimeout(function () {
                                if (iBevore.getAttribute('Type') == '0') {
                                    GetImageObject(parseInt(iBevore.getAttribute('ID')), '', parseInt(iBevore.getAttribute('CX')), parseInt(iBevore.getAttribute('CY')), w, h, function (obj, xml) {
                                        obj[0].id += "_Cache";
                                        obj.on('load', function () {
                                            $('#imgBefore').get(0).src = this.src;
                                        });
                                        hld.append(obj);
                                        obj.css('visibility', 'hidden');
                                    });
                                }
                            }, 120);
                        }
                    }
                }
                if (LastViewnIndex < ImagesInView) {
                    var iBehind = imgs[LastViewnIndex + 1];
                    if (iBehind != null) {

                        $('#imgBehind').get(0).src = "/SLOAIMGTMB_" + iBehind.getAttribute('ID') + ".jpg";
                        var scale = Math.min(GetImageScaleFactor(parseInt(iBehind.getAttribute('CX')), parseInt(iBehind.getAttribute('CY')), Math.max(200, $('#ImagesView').width()), Math.max(200, $('#ImagesView').height())), 1.0);
                        var w = parseInt(iBehind.getAttribute('CX') * scale + .5);
                        var h = parseInt(iBehind.getAttribute('CY') * scale + .5);
                        $('#imgBehind').get(0).src = "/SLOAIMGTMB_" + iBehind.getAttribute('ID') + ".jpg";

                        $('#imgBehind').width(w);
                        $('#imgBehind').height(h);
                        //                        $('#imgBehind').css("margin-top", ($('#ImagesView').height() - h) / 2 + "px");
                        //                        $('#imgBehind').css("margin-left", ($('#ssb').width() - w) / 2 + "px");
                    }
                }
                if (!timeFade) {
                    $(".SSIHLD").each(function (index, element) {
                        if (element.id != 'SSI' + currentIDInView)
                            if (element.Done == true) {
                                if (element.Index == CurrentSLIndex - 1) {
                                    try {
                                        $('#imgBefore').get(0).src = $("#i_img_" + element.ImageID).get(0).src;
                                    } catch (e) { };
                                }
                                $(element).remove();
                            }
                    });

                }

            };
            $('#i_img_' + currentIDInView).on('load', function () {
                ItemReady(this);
                return false;
            });
            $('#i_img_' + currentIDInView).on('error', function () {
                ItemReady(this);
            });
            if (xml.getAttribute("ext").toLowerCase() != ".jpg") {
                ItemReady(hld[0]);
            }
            return true;

        });
        return true;
    }
    function ptIn(X, Y, obj) {
        var offs = obj.offset();
        if (X > offs.left && Y > offs.top
            && X < offs.left + obj.width()
            && Y < offs.top + obj.height())
            return true;
        return false;
    }

    function ShowFullScreenSlideShow() {
        images = GetXMLDoc(window.imagesXML).getElementsByTagName('Image')
        SlideShow(window.startIndex, images);
    }

    var bAllowNewImage = true;
    var LastViewnIndex = 0;
    function DisableController() {
        //        bAllowNewImage = false;
    }

    function EnableController() {
        bAllowNewImage = true;
        if (CurrentSLIndex != LastViewnIndex) {
            ShowSLImage(CurrentSLIndex, CurrentImages);
        }
    }

    var InfoVisible = false;
    function StartSideShowFromID(id) {
        for (cbI = 0; cbI < images.length; cbI++) {
            if (id == parseInt(images[cbI].getAttribute('ID'))) {
                SlideShow(cbI, CurrentImages);
                return;
            }
        }
    }

    AutoStartSlideShow = function () {
        AutoStart = true;
        AutoStartSet = true;
    }

    ShowStartButton = function () {
        ShowPlayBtnOnStart = true;
        $('#player').show();
    }

    HideHeader = function () {
        HeaderVisible = false;
        $('#nameDescPanel').fadeTo(1700, .01);
        if (!ShowInfoTopLeft)
            $('#nameDescPanel').hide();
    }
    showHideControls = function(startTimer, EnsureDelete) {
        var back = $('#ssb');

        //        EnsureDelete = false;
        //        startTimer = false;
        $('.Controller').height((nSize * nMulti) + 40);
        var bDontShow = false;
        if (!EnsureDelete && !InVideoPlaying) { // do not Show if we want 2 delete

            var opac = parseFloat(back.data("Controller").css('opacity'));
            if (opac < 0.02) {
                back.data("Controller").hide().fadeIn(0);
                back.data("Controller").hide().fadeTo(500, 1);
            }
            if (CurrentIndex > 0) {
                var opac = parseFloat($('#leftArrow').css('opacity'));
                if (opac < 0.02) {
                    $('#leftArrow').fadeIn(0);
                    $('#leftArrow').fadeTo(500, 1);
                }
            }
            if (CurrentIndex < ImagesInView-1) {
                var opac = parseFloat($('#rightArrow').css('opacity'));
                if (opac < 0.02) {
                    $('#rightArrow').fadeIn(0);
                    $('#rightArrow').fadeTo(500, 1);
                }
            }
            if (ShowInfoTopLeft) {
                //                $('#nameDescPanel').removeAttr("style").hide().fadeIn(0);
                //                $('#nameDescPanel').removeAttr("style").hide().fadeTo(0, 1);
                $('#nameDescPanel').removeAttr("style");
                $('#nameDescPanel').show();
                //                $('#ssbInfo').hide();
            }
            else {
                $('#nameDescPanel').hide();
                $("#ssbInfo").fadeTo(0, 1);
            }

            $('.Controller').height((nSize * nMulti) + 40);

            if (!$('#playPic').hasClass('pausePic') && !$('#playPic').hasClass('pausePicS') && ($(window).width() < WinMinWidth || ShowPlayBtnOnStart)) {
                if (ShowPlayBtnOnStart) {
                    $('#player').removeAttr("style").hide().fadeIn(0);
                    $('#player').css('top', parseInt(($(window).height() - $('#player').height()) / 2) + "px");
                    $('#player').css('left', parseInt(($(window).width() - $('#player').width()) / 2) + "px");
                }
            }
            else
                $('#player').hide();

            //            back.css('cursor', 'default');

            //        back.data("Controller").fadeTo(0, 1);
            //
            //            back.data("Controller").css('left', ($(window).width() - ctrller.width()) / 2 + "px");
            back.data("Controller").css('left', "0px");
        } else {
            back.data("Controller").hide();
            startTimer = false;
            return;
        }

        //        back.css("cursor", "default");
        var offs = back.data("Controller").offset();
        if (back.data("TMO") != 0)
            window.clearInterval(back.data("TMO"));
        var timeInterv = 2000;
        var now = new Date();

        if (FirstStart == 0) {
            if (now.getTime() - 8000 < startUp.getTime()) {
                startTimer = false;
            }
        }
        if (FirstStart == 1) {
            timeInterv = 8000;
            FirstStart = 0;
        }
        if (EnsureDelete) {
            timeInterv = 200;
            startTimer = true;
        }
        //        startTimer = false;
        if (startTimer) {
            var tmO = window.setInterval(function () {
                FirstStart = 3;
                var back = $("#ssb");
                if (back.data("Controller"))
                    back.data("Controller").fadeTo(1700, .001);
                if (!HeaderVisible)
                    $('#nameDescPanel').fadeTo(1700, .001);
                if (!ShowInfoTopLeft)
                    $('#nameDescPanel').hide();
                $('#player').hide();
//                $('#player').fadeTo(1700, 0);
                if (ShowInfoRight != "on")
                    $("#ssbInfo").fadeTo(1700, .001);
                $('#leftArrow').fadeTo(1700, .001);
                $('#rightArrow').fadeTo(1700, .001);

                back.css('cursor', 'none');
                window.clearInterval(tmO);

            }, timeInterv);
            back.data("TMO", tmO);
        }
        else {
            window.clearInterval(back.data("TMO"));
        }

    }
    var ShowInfoTopLeftSavePlay = null;
    var ShowInfoModeSave = null;
    function TogglePlayShow(withNextClick, doVideoCalls) {
        if (withNextClick == undefined)
            withNextClick = true;
        if (doVideoCalls == undefined)
            doVideoCalls = true;

        eStartClick = new Date();
        var back = $('#ssb')[0];
        if (back.tmO != null) {
            window.clearInterval(back.tmO);
            var video = $('#theVideo_' + currentIDInView);
            if (doVideoCalls && theVideo != null) {
                theVideo.pause();
            }
            //                $('#playPic').text(_locSlideShowStrings.SlideshowControlStart);
            $('#playPic').removeClass('pausePic');
            $('#playPic').removeClass('pausePicS');
            $('#playPic').attr("title", _locSlideShowStrings.SlideshowControlStart);

            back.tmO = null;


            if (ShowInfoTopLeftSavePlay != null && ShowInfoRightParam == "auto")
                ShowInfoTopLeft = ShowInfoTopLeftSavePlay;
            ShowInfoTopLeftSavePlay = null;
            AlignMiddle();
            if (video.length)
                return;

            if (ShowInfoRightParam == "auto")
                InfoMode(ShowInfoModeSave);

        }
        else {
            if ($('#playPic').hasClass('playPicS'))
                $('#playPic').addClass('pausePicS');
            else
                $('#playPic').addClass('pausePic');
            $('#playPic').attr("title", _locSlideShowStrings.SlideshowControlStop);

            //                $('#playPic').text(_locSlideShowStrings.SlideshowControlStop);
            $('#player').hide();
            var video = $('#theVideo_'+ currentIDInView);
            if (withNextClick == true) {
                if (doVideoCalls && theVideo != null) {
                    InVideoPlaying = true;
                    theVideo.play();
                }
                else
                    $('#NextPicture').click();
            }
            if (ShowInfoTopLeftSavePlay == null)
                ShowInfoTopLeftSavePlay = ShowInfoTopLeft;
            if (ShowInfoRightParam == "auto")
                ShowInfoTopLeft = true;
            AlignMiddle();
            ShowInfoModeSave = ShowInfoRight;
            if (!video.length) {
                if (ShowInfoRightParam == "auto")
                    InfoMode("off");
            }
            SetStopTimer();
            back.tmO = window.setInterval(function () {
                if (dtImageGotAt != null) {
                    if (InVideoPlaying == false) {
                        var msDone = new Date().valueOf() - dtImageGotAt.valueOf();
                        if (msDone > (SecondsStay * 1000) + 500) {
                            if (CurrentIndex == ImagesInView - 1) {
                                if (LoopThrought > 0) {
                                    GotoIndex = 0;
                                    dtImageGotAt = null;
                                }
                                else {
                                    if (InVideoPlaying == false)
                                        np3.click();
                                }
                            }
                            else
                                if (GotoIndex == CurrentIndex)
                                    $('#NextPicture').click();
                        }
                    }
                }
            }, 500);
        }
        return;

    }
    respondIFrameMsg = function () {
        var frames = parent.window.frames;
        for (var i = 0; i < frames.length; i++) {
            var elem = frames[i].frameElement;
            elem.setAttribute("allowfullscreen", "allowfullscreen");
            //            elem.setAttribute("mozallowfullscreen", "");
            //            elem.setAttribute("webkitallowfullscreen", "");

        }

    }

    function UpdateFullscreenButton() {
        if (screenfull.isFullscreen) {
            $('#FullScreenPic').attr('title', _locSlideShowStrings.SlideshowControlFullscreenExit);
            $('#FullScreenPic').addClass('FullScreenPic-FullScreen');
        }
        else {
            $('#FullScreenPic').attr('title', _locSlideShowStrings.SlideshowControlFullscreen);
            $('#FullScreenPic').removeClass('FullScreenPic-FullScreen');
        }
    }

    function SlideShow(startIndex) {
        if (screenfull.isEnabled)
            screenfull.on('change', UpdateFullscreenButton);

        $(document).on('keydown.caruselViewer', function (e) {
            switch (e.keyCode) {
                case 37:
                    e.preventDefault();
                    $('#leftArrow').click();
                    break;

                case 39:
                    e.preventDefault();
                    $('#rightArrow').click();
                    break;

                case 83:
                    if (e.metaKey || e.ctrlKey) {
                        try {
                            ShowSliderStop();
                        } catch (e) {
                            loadScript("/JavaScript/SliderStop.js", function () {
                                ShowSliderStop();
                            });
                        }
                        e.preventDefault();
                    }
                    break;
            }
        });
        var back = $('#ssb');
        back.tmO = null;
        $('#imageNameAndDescriptionPanel').css('visibility', 'visible');
        var ctrller2 = null;
        var ctrller = ctrller2 = $('#TmbController');
        var ctrller3 = $('#sbb');
        if (getQueryParam('controls') === 'under') {
            if (!$('#nameDescriptorsBelow').length)
                $('<div class="nameDescriptorsBelow" id="nameDescriptorsBelow"><div id="LowerLinePlace"></div><div id="nameDescPanelHdr"></div><div id="nameDescPanelDescr"></div></div>').appendTo($('#ssb'));
            ctrller3 = ctrller2 = $('#LowerLinePlace');
            $('.ThumbContainder').css('bottom', '0px');
            $('#nextPic').css('bottom', '0px');
            $('#prevPic').css('bottom', '0px');
        }                

        $('.ControllerBack2').css('backgrond-color', 'transparent');

        var ctrlContent = $('#ctrlContent');

        //    ctrller.fadeTo(2000, .1);
        /*        back.resize(function () {
        ctrller.css('left', ($(window).width() - ctrller.width()) / 2 + "px");
        });
        ctrller.css('left', ($(window).width() - ctrller.width()) / 2 + "px");
        */
        oldX = 0;
        oldY = 0;


        if (getQueryVariable("ref") == 'mc_folder')
            ShowRandomButton = true;
        if (getQueryVariable("ref") == 'mc_image')
            ShowRandomButton = true;

        if (getQueryVariable("RdmBtn") == '0')
            ShowRandomButton = false;

        if (getQueryVariable("RdmBtn") == '1')
            ShowRandomButton = true;

        if (startIndex >= 0) {
            back.mousemove(function (e) {
                if (e.pageX == oldX && e.pageY == oldY)
                    return;
                if (Math.abs(e.pageX - oldX) < 30 && Math.abs(e.pageY - oldY) < 30)
                    return;
                back.css('cursor', 'default');
                oldX = e.pageX;
                oldY = e.pageY;
                if (!ptIn(e.pageX, e.pageY, back.data("Controller")))
                    showHideControls(true);
                else
                    showHideControls(false);

            });
            $("#ssb").hover(function () { }, function () {
                showHideControls(true);
            });
            var left = $('<div id="leftArrow"></div>').appendTo(back);
            var right = $('<div id="rightArrow"></div>').appendTo(back);
            left.PadMouseDrag({
                click: function () {
                    $('#prevPicture').click();
                }
            });
            right.PadMouseDrag({
                click: function () {
                    $('#NextPicture').click();
                    lastActionWasBack = true;
                }
            });
        }
        /*
        back.keyup(function (event) {
        switch (event.keyCode) {
        case $.ui.keyCode.ESCAPE:
        if (ShowCloseButton == true)
        $('#closePic').click();
        break;
        case $.ui.keyCode.LEFT:
        $('#prevPic').click();
        break;
        case $.ui.keyCode.SPACE:
        case $.ui.keyCode.RIGHT:
        $('#nextPic').click();
        break;

        case $.ui.keyCode.END:
        GotoIndex = ImagesInView - 1;
        break;

        case $.ui.keyCode.HOME:
        GotoIndex = 0;
        break;

        case $.ui.keyCode.ENTER:
        $('#playPic').click();
        break;
        };

        });
        */
        /*        back.bind('touchend', function (e) {
        e.preventDefault();
        back.click();
        });
        */
        /*        var slide = $('<div id="slidP"></Div>)').appendTo(ctrller);
                slide.css({ 'left': 10, 'top': $('.Controller').height()-20, 'width': 200, 'z-index': 2000 });
                $('.Controller').height((nSize * nMulti) + 40);
                $("#slidP").slider({
                    slide: function (event, ui) {
                        GotoIndex = ui.value;
                        dtImageGotAt = null;
        
                    },
                    min: 1,
                    max: ImagesInView-1
                    
                });
        
        */
        var Prev = $('<div id="prevPicture"/>').appendTo(ctrller);
        Prev.PadMouseDrag({
            click: function () {
                if (GotoIndex > 0) {
                    StopVideoPlaying();
                    GotoIndex -= 1;
                    dtImageGotAt = null;
                    if (GotoIndex < 0)
                        GotoIndex = 0;
                }
                lastActionWasBack = true;
            }
        });

        var np0 = $('<div id="prevPic" title="' + _locSlideShowStrings.SlideshowControlPrev + '"></div>').appendTo(ctrller);
        np0.PadMouseDrag({
            click: function () {
                if (GotoIndex > 0) {
                    GotoIndex -= OnePageSize;
                    dtImageGotAt = null;
                    if (GotoIndex < 0)
                        GotoIndex = 0;
                }
                lastActionWasBack = true;
                AnimateThumbs(GotoIndex + OnePageSize, GotoIndex);

            }
        });
        np0.bind('touchend', function (e) {
            e.preventDefault();
            Prev.click();
        });

        var Next = $('<div id="NextPicture"/>').appendTo(ctrller);
        Next.PadMouseDrag({
            click: function () {
                if (bAllowNewImage) {
                    if (GotoIndex < ImagesInView - 1) {
                        var video = $('#theVideo_' + currentIDInView);
                        var cnt = 1;
                        if (video.length > 0) {
                            if (InVideoPlaying) {
                                theVideo.play();
                                cnt = 0;
                            }
                            else
                                StopVideoPlaying();
                        }
                        GotoIndex += cnt;
                        dtImageGotAt = null;
                        lastActionWasBack = false;
                    }
                }
            }
        });


        var np1 = $('<div id="nextPic" title="' + _locSlideShowStrings.SlideshowControlNext + '"></div>').appendTo(ctrller);
        np1.PadMouseDrag({
            click: function () {
                if (bAllowNewImage) {
                    if (GotoIndex < ImagesInView - 1) {
                        StopVideoPlaying();
                        GotoIndex += OnePageSize;
                        if (GotoIndex > ImagesInView - 1)
                            GotoIndex = ImagesInView - 1;

                        dtImageGotAt = null;
                        lastActionWasBack = false;
                        AnimateThumbs(GotoIndex - OnePageSize, GotoIndex);
                    }
                }
            }
        });
        var npFp = $('<div id="firstPic" title="' + _locSlideShowStrings.SlideshowControlFirst + '"></div>').appendTo(ctrller);
        npFp.PadMouseDrag({
            click: function () {
                StopVideoPlaying();
                GotoIndex = 0;
                lastActionWasBack = false;
            }
        });

        var npFp = $('<div id="lastPic" title="' + _locSlideShowStrings.SlideshowControlLast + '"></div>').appendTo(ctrller);
        npFp.PadMouseDrag({
            click: function () {
                StopVideoPlaying();
                GotoIndex = ImagesInView - 1;
                lastActionWasBack = true;
                if (back[0].tmO != null) {
                    TogglePlayShow();
                    SetStopTimer();
                }
            }
        });
        var LeftBtns = $('<div id="LeftBtns"></div>').appendTo(ctrller2);


        var RightBtns = $('<div id="RightBtns"></div>').appendTo(ctrller2);
        if (ShowRandomButton) {
            var np;
            np2 = $('<div id="rndm" class="RandomPic" title="' + _locSlideShowStrings.RandomizeOrder + '"></div>').appendTo(RightBtns);
            if (SortOrder.substr(0, 6) == "random") {
                $("#rndm").addClass("RandomActive");
            }
            np2.PadMouseDrag({
                click: function () {
                    var url = window.location.href;

                    if (!$("#rndm").hasClass("RandomActive")) {
                        $("#rndm").addClass("RandomActive");
                        SLApp.UserAndInfoService.StartRandomAccess(GetCurrentDirID(), Carousel.GetFlat(), _SearchFor, _SearchForAny, _SearchForExact, ImageSearchType, function (ret) {
                            SortOrderOriginal = SortOrder;
                            SortOrder = ret;
                            CurrentImages = null;
                            _FolderTypeOriginal = _FolderType;
                            _FolderType = 0;
                            GetThem(0);

                        });
                        $('#rndm').attr('title', _locSlideShowStrings.RandomizeOrderOff);
                    }
                    else {
                        $('#rndm').attr('title', _locSlideShowStrings.RandomizeOrder);
                        SLApp.UserAndInfoService.FinishedRandomAccess(SortOrder);
                        SortOrder = SortOrderOriginal;
                        _FolderType = _FolderTypeOriginal;
                        $("#rndm").removeClass("RandomActive");
                        CurrentImages = null;
                        GetThem(0);

                    }

                }
            });

        }
        var np2 = null;
        if (window.FullScreen == undefined || window.FullScreen == false) {
            np2 = $('<div id="FullScreenPic" title="' + _locSlideShowStrings.SlideshowControlFullscreen + '"></div>').appendTo(RightBtns);
            np2.PadMouseDrag({
                click: function () {
                    var url = window.location.href;
                    var i = url.indexOf('?');
                    if (i > 0)
                        url = url.substr(0, i);
                    var query = window.location.search.substring(1);
                    var args = query.split('&');
                    var separator = '?';

                    var addIdx = Math.max(0, CurrentIndex);
                    var addDir = GetCurrentDirID();
                    var addRef = Carousel.GetFlat() ? 'showflat' : 'show';

                    for (var i = 0; i < args.length; i++) {
                        var entry = args[i].split('=');
                        if (entry[0] == '')
                            continue;

                        // Change existing parameter to new value
                        switch (entry[0].toLowerCase()) {
                            case 'slsidx':
                                entry[1] = addIdx;
                                addIdx = -1;
                                break;
                            case 'slsdir':
                                entry[1] = addDir;
                                addDir = -1;
                                break;
                            case 'ref':
                                entry[1] = addRef;
                                addRef = '';
                                break;
                        }

                        url += separator + entry[0] + '=' + entry[1];
                        separator = '&';
                    }

                    // Add parameter to query string
                    if (addIdx >= 0) {
                        url += separator + 'SlSidx=' + addIdx;
                        separator = '&';
                    }
                    if (addDir >= 0) {
                        url += separator + 'SlSdir=' + addDir;
                        separator = '&';
                    }
                    if (addRef != '') {
                        url += separator + 'ref=' + addRef;
                        separator = '&';
                    }
                    var back = $('#ssb')[0];
                    if (back.tmO != null) {
                        TogglePlayShow(true);
                    }
                    document.fullscreenEnabled = true;
                    //                    window.addEventListener('message', respondIFrameMsg, false);
                    //                    parent.postMessage('SetAttributes', window.location);
                    try {
                        if (frameElement != null) {
                            frameElement.setAttribute("allowfullscreen", "allowfullscreen");
                            frameElement.setAttribute("mozallowfullscreen", "");
                            frameElement.setAttribute("webkitallowfullscreen", "");
                        }
                    } catch (e) {
                        // 
                    }
                    if (screenfull.isEnabled) {
                        if (!screenfull.isFullscreen)
                            screenfull.request($('#slideShow')[0]);
                        else
                            screenfull.exit();
                    }
                    else {
                        var theWindow = window.open(url + '&mode=fullscreen', "SlideShow",
                        //                "channelmode=yes,fullscreen=yes,titlebar=no,location=no,scrollbars=no,resizable=no,toolbar=no,status=no,width=" + screen.availWidth - 16 + ",Height=" + screen.availHeight - 16 + "top=0,left=0", "replace");
                        "CHANNELMODE=yes,FULLSCREEN=no,LOCATIONBAR=no,LOCATION=no,scrollbars=no,toolbar=no,status=no,width=" + screen.availWidth + ",Height=" + screen.availHeight + "top=0,left=0", "replace");
                        theWindow.focus();
                    }
                }
            });
        }
        else {
            np2 = $('<div id="FullScreenPic" title="' + _locSlideShowStrings.SlideshowControlFullscreen + '"></div>').appendTo(RightBtns);
            np2.PadMouseDrag({
                click: function () {
                    window.close();
                }
            });
            /*            np2 = $('<div id="NormScreenPic" title="' + _locSlideShowStrings.SlideshowControlFullscreenExit + '"></div>').appendTo(ctrller);
                        np2.PadMouseDrag({
                            click: function () {
                                window.close();
                            }
                        });
            */
        }
        UpdateFullscreenButton();

        $('#pin').PadMouseDrag({
            click: function () {

                if (HeaderVisible == true) {
                    $('#pin').addClass('pinClosed');
                    $('#pin').attr("title", _locSlideShowStrings.SlideshowControlDontBlendTitle);
                    $('#pin').removeClass('pinBackground');

                    HeaderVisible = false;
                    var back = $("#ssb");
                    if (back.data("Controller"))
                        back.data("Controller").fadeTo(1700, .01);
                    if (!HeaderVisible)
                        $('#nameDescPanel').fadeTo(1700, .01);
                    if (!ShowInfoTopLeft)
                        $('#nameDescPanel').hide();

                } else {
                    $('#pin').removeClass('pinClosed');
                    $('#pin').addClass('pinBackground');
                    HeaderVisible = true;
                    $('#pin').attr("title", _locSlideShowStrings.SlideshowControlBlendTitle);
                }
            }
        });

        var picClass = '';
        var size = Math.min(parseInt($(window).width()), parseInt($(window).height()));
        if (size < 248)
            picClass = ' playPicC-L';
        if (size < 186)
            picClass = ' playPicC-M';
        if (size < 140)
            picClass = ' playPicC-S';
        if (size < 104)
            picClass = ' playPicC-XS';

        var np4 = $('<div id="player" class="playPicC' + picClass + '" >' /*+ _locSlideShowStrings.SlideshowControlStart*/ + '</div>').appendTo(ctrller3);
        np4.css('top', parseInt(($(window).height() - np4.height()) / 2) + "px");
        np4.css('left', parseInt(($(window).width() - np4.width()) / 2) + "px");
        np4.PadMouseDrag({
            click: function () {
                $('#playPic').click();
            }
        });
        var np3 = $('<div id="playPic" style="position:absolute;bottom:15px">' /*+ _locSlideShowStrings.SlideshowControlStart*/ + '</div>').appendTo(ctrller);

        $('#playPic').attr("title", _locSlideShowStrings.SlideshowControlStart);
        np3.PadMouseDrag({
            click: function (e) {
                e.preventDefault();
                TogglePlayShow();
            }
        });


        var np4 = $('<div id="ImgOfImg">1/1</div>').appendTo(ctrller2);
        setColours();
        if (startIndex >= 0)
            $('#ImgOfImg').text(startIndex + ' / ?');
        np4 = $('<div id="infoImagePic" title="' + _locSlideShowStrings.SlideshowControlInfo + '"></div>').appendTo(RightBtns);
        np4.PadMouseDrag({
            click: function () {
                var options = {};
                if (!InfoVisible) {

                    InfoVisible = true;
                    InfoMode("on");
                } else {
                    InfoVisible = false;
                    InfoMode("off");
                }
            }
        });
        np4.hover(function () {
            np4.addClass("infoImagePic_hover");
        }, function () {
            np4.removeClass("infoImagePic_hover");
        });



        var oL = $('<div id="OptionList" title="' + _locSlideShowStrings.Menue + '"></div>').appendTo(ctrller);
        oL.PadMouseDrag({
            click: function () {
                if ($('#RightBtns').css('visibility') != 'visible')
                    $('#RightBtns').css('visibility', 'visible');
                else
                    $('#RightBtns').css('visibility', 'collapse');

                $('#RightBtns').hover(function () { }, function () {
//                    $('#RightBtns').css('visibility', 'collapse');
                });

            }
        });
        var PositionDiv = RightBtns;



        var np5 = $('<div class="SettingsBtn" id="RightSettings" title="' + _locSlideShowStrings.SLSettings + '"></div>').appendTo(RightBtns);

        np5.PadMouseDrag({
            click: function (e) {
                if ($(e.target).hasClass("SettingsBtn"))
                    Settings();
            }
        });

        np5 = $('<div class="SettingsBtn" id="LeftSettings" title="' + _locSlideShowStrings.SLSettings + '"></div>').appendTo(LeftBtns);
        np5.PadMouseDrag({
            click: function (e) {
                if ($(e.target).hasClass("SettingsBtn"))
                    Settings();
            }
        });
        if (getQueryParam('settings') === 'no') {
            $('.SettingsBtn').remove();
        }
        var np7 = $('<div class="SharePic" id="RightShare" title="' + _locSlideShowStrings.SlideshowControlShareLink + '"></div>').appendTo(RightBtns);
        sharePicAction(np7);
        np7 = $('<div class="SharePic" id="LeftShare" title="' + _locSlideShowStrings.SlideshowControlShareLink + '"></div>').appendTo(LeftBtns);
        sharePicAction(np7);

        if (ShowRandomButton) {
            $('#RightShare').css({ 'display': 'none' });
            $('#RightSettings').css({ 'display': 'none' });
        }
        else {
            $('#LeftShare').css({ 'display': 'none' });
            $('#LeftSettings').css({ 'display': 'none' });
        }
        if (getQueryParam('share') === 'no') {
            $('.SharePic').remove();
        }

        if ((window.FullScreen == undefined || window.FullScreen == false) && ShowCloseButton == true) {
            var np6 = $('<div id="closePic" title="' + _locSlideShowStrings.SlideshowControlViewAlbum + '"></div>').appendTo(RightBtns);
            np6.PadMouseDrag({
                click: function () {
                    $(document).off('keydown.caruselViewer');
                    if (window.FullScreen == true)
                        window.close();
                    if (screenfull) {
                        if (screenfull.isEnabled && screenfull.isFullscreen)
                            screenfull.exit();
                    }

                    try {
                        if (OpenUrlOnClose != null && OpenUrlOnClose.indexOf('_CurrentImgID_') > -1)
                            OpenUrlOnClose = OpenUrlOnClose.replace(/_CurrentImgID_/g, LastIDInView);
                    }
                    catch (err) { }
                    var bOtherWnd = true;
                    if (_OnCloseFunc != null) {
                        try {
                            var CurrentImage = $('.SSIHLD').first()[0].id;
                            _OnCloseFunc(CurrentImage.substr(3));
//                            bOtherWnd = false;
                            KillAllSLObjects();
                            if (PerformOnEnd instanceof Function)
                                PerformOnEnd();
                            return;
                        } catch (e) { };
                    }
                    try {


                        var ft = getQueryParam("SLClose");
                        if ( ft !== "stay" && bOtherWnd) {

                            var n = window.location.href.indexOf("embed");
                            var s = window.location.href.indexOf("OpenNew=0");
                            if (!OpenNewWnd)
                                n = 0;
                            bEmbed = false;
                            if (n < 1) {
                                n = window.location.href.indexOf("nt=");
                            }
                            if (n > 0)
                                bEmbed = true;
                            if (s > 0)
                                bEmbed = false;

                            if (bEmbed || ft === 'new') {
                                if (PerformOnEnd instanceof Function)
                                    PerformOnEnd();

                                OpenUrlOnClose = OpenUrlOnClose.replace("&so=random", "");
                                window.open(OpenUrlOnClose, '_blank');
                                return;
                            }

                            if (s > 0 ) {
                                window.location.href = OpenUrlOnClose;
                                return;
                            }
                            try {
                                if (PerformOnEnd instanceof Function)
                                    PerformOnEnd();

                                if (OpenUrlOnClose != null && OpenUrlOnClose.indexOf("http") === 0) {
                                    parent.window.location.href = OpenUrlOnClose;
                                    return;
                                }
                            } catch (e) { }
                        }
                        if(typeof sAction !== "undefined")
                            sAction += OpenUrlOnClose;
                        KillAllSLObjects();
                    } catch (e) {
                    }
                }
            });
        } else {
            if (window.location != window.parent.location) {
                var np6 = $('<div id="closePic" title="' + _locSlideShowStrings.SlideshowControlViewAlbum + '"></div>').appendTo(RightBtns);
                np6.PadMouseDrag({
                    click: function () {
                        var back = $('#ssb')[0];
                        if (back.tmO != null) {
                            TogglePlayShow(true);
                        }
                        try {
                            if (OpenUrlOnClose != undefined && OpenUrlOnClose.indexOf('_CurrentImgID_') > -1)
                                OpenUrlOnClose = OpenUrlOnClose.replace(/_CurrentImgID_/g, LastIDInView);
                        }
                        catch (err) { }
                        try {
                            var theWindow = window.open(OpenUrlOnClose, "_blank");
                        } catch (e) {
                            infoStr = e.message;
                        }
                    }
                });

            }
        }

        $('<span id=MouseInfo><span>').appendTo(LeftBtns);

        //        ShowSLImage(startIndex, CurrentImages, function () { });
        var back = $("#ssb");

        //      Switch off all Controls
        if (back.data("Controller"))
            back.data("Controller").fadeTo(10, .01);
        if (!HeaderVisible)
            $('#nameDescPanel').fadeTo(10, .01);
        $("#rightArrow").fadeTo(10, .01);
        $("#leftArrow").fadeTo(10, .01);
        if (!ShowPlayBtnOnStart)
            $('#player').hide();

        //        back.focus();

        if (HeaderVisible && $(window).width() < WinMinWidth) {
            $('#pin').click();
        }

 
    }

    KillAllSLObjects = function () {
        var back = $("#ssb");
        currentIDInView = null;
        $('#imageInfoPanel').fadeOut();
        if (back.tmO != null)
            window.clearInterval(back.tmO);
        if (back.data("TMO") != null)
            window.clearInterval(back.tmO);
        back.unbind();
        back.remove();
        $('#ssbInfo').remove();
        $('#slideShow').remove();
        bAllowNewImage = true;
        $('body').css("overflow", BodyOverflow);

    };

    function sharePicAction(np7) {
        np7.PadMouseDrag({
            click: function () {
                var share = $('#sharePopup');
                if (share.length > 0)
                    share.remove();

                share = $('<div id="sharePopup"></div>').appendTo('#slideShow');

                var close = $('<img id="sharePopupClose" src="/images/Community/menupopup-close.png" />').appendTo(share);
                close.click(function () {
                    $('#sharePopup').remove();
                });

                $('<h6>Share Link to Slide Show</h6>').appendTo(share);
                var btns = $('<ul></ul>').appendTo(share);
                $('<p id="sharePopupInfo">&nbsp;</p>').appendTo(share);

                var mail = $('<li><img src="/images/Community/Views/share-mail-big.png" /></li>').appendTo(btns);
                mail.click(function () {
                    $('#sharePopup').remove();
                    ShareLinkWithMail(window.location.href);
                });
                mail.mouseenter(function () { $('#sharePopupInfo').html(_locSlideShowStrings.ShareMail); });
                mail.mouseleave(function () { $('#sharePopupInfo').html('&nbsp;'); });

                var facebook = $('<li><img src="/images/Community/Views/share-facebook-big.png" /></li>').appendTo(btns);
                facebook.click(function () {
                    var win = window.open('https://www.facebook.com/sharer.php?u=' + encodeURIComponent(window.location.href) + '&t=' + encodeURIComponent(_locSlideShowStrings.ShareTitle), 'sl_facebook', 'height=450,width=550');
                    if (win != null)
                        win.focus();
                    $('#sharePopup').remove();
                });
                facebook.mouseenter(function () { $('#sharePopupInfo').html(_locSlideShowStrings.ShareFacebook); });
                facebook.mouseleave(function () { $('#sharePopupInfo').html('&nbsp;'); });

                var twitter = $('<li><img src="/images/Community/Views/share-twitter-big.png" /></li>').appendTo(btns);
                twitter.click(function () {
                    var win = window.open('https://twitter.com/share?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(_locSlideShowStrings.ShareTitle), 'sl_twitter', 'height=450,width=550');
                    if (win != null)
                        win.focus();
                    $('#sharePopup').remove();
                });
                twitter.mouseenter(function () { $('#sharePopupInfo').html(_locSlideShowStrings.ShareTwitter); });
                twitter.mouseleave(function () { $('#sharePopupInfo').html('&nbsp;'); });
            }
        });

    }
    function MakeDivCornered(div) {

        if (div.data('cornered') == null) {
            div.children().css("z-index", 1);
            div.css('padding', '9px 9px 9px 9px');
            $('<div class="ctl"></div>').appendTo(div);
            $('<div class="ctc"></div>').appendTo(div);
            $('<div class="ctr"></div>').appendTo(div);
            $('<div class="ccl"></div>').appendTo(div);
            $('<div class="ccc"></div>').appendTo(div);
            $('<div class="ccr"></div>').appendTo(div);
            $('<div class="cbl"></div>').appendTo(div);
            $('<div class="cbc"></div>').appendTo(div);
            $('<div class="cbr"></div>').appendTo(div);
            div.data('cornered', true);
            div.children().css("z-index", 1);
        }
    }

    function Settings() {
        var back = $('#ssb');
        if ($("#SlideSettings").length > 0)
            return;
        var Dialog = $('<div id="SlideSettings"><div id="SLSETText">' + _locSlideShowStrings.SLSettings + '</div><div id="SLOk">' + _locSlideShowStrings.Ok + '</div><div id="SLCancel">' + _locSlideShowStrings.Cancel + '</div></div>').appendTo('#slideShow');
        $('<div id="f1"><table id="t1" style="width: 100%;"><tr><td>' + _locSlideShowStrings.SLSettingsTime + '<input id="SlTime" type="text" /> sec</td>' +
            '</tr><tr><td><input id="CheckLoop" type="checkbox" />' + _locSlideShowStrings.SLSettingsLoop + '</td></tr></table></div>').appendTo(Dialog);

        //        $('<form><input id="SlTime2" name="SlTimeA"  type="number" /></form>').appendTo(Dialog);
        $('#SlTime').val(SecondsStay);
        $('#CheckLoop')[0].checked = LoopThrought;
        //        $('#SlTime').focus();
        /*        $('#SlTime').keyup(function (e) {
        switch (e.keyCode) {
        case $.ui.keyCode.ESCAPE:
        done(0);
        break;
        case $.ui.keyCode.UP:
        $('#SlTime').val(parseInt($('#SlTime').val()) + 1);
        break;

        case $.ui.keyCode.DOWN:
        $('#SlTime').val(parseInt($('#SlTime').val()) - 1);
        break;

        case 13:
        done(1);
        e.stopImmediatePropagation();
        break;
        };

        });
        */
        $('#SLOk').PadMouseDrag({
            click: function ()
            { done(1); }
        });

        $('#SLCancel').PadMouseDrag({
            click: function ()
            { done(0); }
        });

        if ($(window).width() < WinMinWidth) {
            $("#SlideSettings").css({ "right": "0px", "bottom": "0px" });
        }
        $('#SLOk').css('right', $("#SlideSettings").width() - $('#SLCancel').position().left + 5 + "px");
        function done(ok) {
            if (ok) {
                LoopThrought = $('#CheckLoop')[0].checked;
                SecondsStay = parseInt($('#SlTime').val());

                try {
                    var jetzt = new Date();
                    schreibCookie("SlideTime", SecondsStay, new Date(jetzt.getTime() + 1000 * 60 * 60 * 24 * 100));
                    schreibCookie("Loop", (LoopThrought ? 1 : 0), new Date(jetzt.getTime() + 1000 * 60 * 60 * 24 * 100));
                } catch (e) {

                }
            }
            $('#SlideSettings').remove();
        }

        //        MakeDivCornered(Dialog);
    }

};

Carousel.Images = 100000;
