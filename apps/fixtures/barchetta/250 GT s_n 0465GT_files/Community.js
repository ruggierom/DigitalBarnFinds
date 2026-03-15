
var MenuUserOpenOnHover = '';
var MenuUserDropdownTimer = 0;
var LeftSliderCloseTimer = 0;
var LeftSliderOffsetTop = 44;

var urlUserHome = '';
var urlUserPages = '/user/';

var downloadWithCopyright = 'yes';

var countSelectItems = 0;
var countSelectDownload = 0;
var countSelectMap = 0;
var ShowImageType = null;
var mapCount = 0;
var MenuHide = false;
var NoSourceInImgs = true;
var control = false;
var DownloadComesFromSelected = false;
var HasGeoInView = false;
var hammerMC = null;
var currVidPlayer = null;
var opViewItems = null;

var GridPendingColors = [ '#dedede', '#ccd8dd', '#ddcccc', '#ceddcc', '#dddbcc' ];

const playerConfigThumb = {
    key: "d0167b1c-9767-4287-9ddc-e0fa09d31e02",
    appId: "MediaCenter.PLUS",
    ui: false,
    adaptation: {
        desktop: {
            limitToPlayerSize: true
        },
        mobile: {
            limitToPlayerSize: true
        }
    },
    playback: {
        muted: true,
        autoplay: true
    },
    // Subscribe to player events
    events: {
        [mkplayer.MKPlayerEvent.Destroy]: (event) => {
            if ($('#theVid').data('removeAfterDestroy') === true && $('#theVid').data('video') == null)
                $('#theVid').remove();
            else
                $('#theVid').hide();
        }
    }
};

function getMobileOperatingSystem() {
    var userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (userAgent.match(/iPad/i) || userAgent.match(/iPhone/i) || userAgent.match(/iPod/i))
        return 'iOS';

    if (userAgent.match(/Android/i))
        return 'Android';

    try {
        if (/Macintosh/.test(navigator.userAgent) && 'ontouchend' in document)
            return 'iOS';
    }
    catch (e) {
        console.log('Error detecting iPadOS');
    }

    return 'unknown';
}

function UseOwnScrollbar() {
    try {
        return getMobileOperatingSystem() === 'unknown' || window.self != window.top;
    } catch (e) {
        return true;
    }
}

function replaceInternals(strTxt) {
    if (typeof _localized == 'undefined')
        return strTxt;

    if (typeof strTxt != "undefined" && strTxt != null) {
        var txt = strTxt.replace("_MCInt_Public", _localized.public).replace("_MCInt_Protected", _localized.protected);
        return txt;
    }
    return "";
}


function setBanneHotSpot() {
    var xPerc = $('#BannerImg').data('hotx');
    var yPerc = $('#BannerImg').data('hoty');
    var imgSizeX = $('#BannerImg').data('sizex');
    var imgSizeY = $('#BannerImg').data('sizey');
    var sizeParentY = $('#Banner').height();
    var sizeParentX = $('#Banner').width();
    var scale = imgSizeY / imgSizeX;

    var calcSizeY = sizeParentX * scale;
    var calcSizeX = sizeParentX;

    if (sizeParentY > calcSizeY) {

        $('#BannerImg').height(sizeParentY);
        $('#BannerImg').width(sizeParentY / scale);

    }
    else {
        $('#BannerImg').width(sizeParentX);
        $('#BannerImg').height(sizeParentX * scale);

    }
    var imageW = $('#BannerImg').width();
    var imageH = $('#BannerImg').height();
    var offsetX = xPerc * imageW / 100;
    var offsetY = yPerc * imageH / 100;
    var focusX = (offsetX / imageW - .5) * 2;
    var focusY = (offsetY / imageH - .5) * -2;
GetViewTypes
    $('#Banner').data('focus-x', focusX);
    $('#Banner').data('focus-y', focusY);

    $('#Banner').data('image-w', imageW);
    $('#Banner').data('image-h', imageH);

    var fx = $('#Banner').data('focus-y');
    $('#Banner').adjustFocus();
}

function GetViewTypes() {
    return parseInt(MaVas.ViewTypes);
}
function GetViewTypesParam() {
    var vt = "";
    if (GetViewTypes() !== 11111) {
        vt = '&it=' + MaVas.ViewTypes;
    }
    return vt;
}
function AddToHistory(data, title, url) {
    var isInIframe = (window.location !== window.parent.location) ? true : false;
    if (!isInIframe) {
        var st = window.history.state;
        if (window.location.href !== url)
            window.history.pushState(data, title, url);
    }
}
function OnChangePage(info) {
    var user = -1;
    var dir = -1;
    var img = -1;
    HasGeoInView = false;
    NoSourceInImgs = true;

    if (CurrentView) {
        user = CurrentView.UserID;
        dir = CurrentView.DirId;
        img = CurrentView.CurrentImageID;
    }
    else {
        user = MaVas.UserID;
        dir = MaVas.DirId;
        img = MaVas.CurrentImageID;
    }
    if (isNaN(dir))
        dir = MaVas.RootDirId;

    if (!img)
        img = -1;
    SLApp.CommunityService.GetMetaTagInfo(info, user, dir, img, '', function (res) {
        var meta = JSON.parse(res);
        for (var key in meta) {
            if (!meta.hasOwnProperty(key))
                continue;

            switch (key) {
                case 'title':
                    document.title = meta[key];
                    break;

                case 'canonical':
                    if (meta[key] === '') {
                        $("link[rel='" + key + "']").remove();
                    }
                    else {
                        if ($("link[rel='" + key + "']").length > 0)
                            $("link[rel='" + key + "']").attr('href', meta[key]);
                        else
                            $('head').append('<link[rel="' + key + '" href="' + meta[key] + '">');
                    }
                    break;

                default:
                    {
                        var type = (key.substr(0, 3) === 'og:') ? 'property' : 'name';
                        if (meta[key] === '') {
                            $("meta[" + type + "='" + key + "']").remove();
                        }
                        else {
                            if ($("meta[" + type + "='" + key + "']").length > 0)
                                $("meta[" + type + "='" + key + "']").attr('content', meta[key]);
                            else
                                $('head').append('<meta ' + type + '="' + key + '" content="' + meta[key] + '">');
                        }
                    }
                    break;
            }
        }
    });
    if(info !== "DetailView")
        getPossibleDownloads(dir);
}
function getPossibleDownloads(dir) {
    $("#MenuDownloadAllTxt").text(_localized['DownloadAll'] + ' (...)');
    $('#MenuDownloadSelectedTxt').text(_localized['DownloadSelected']);
    if (CurrentView == null)
        CurrentView = jQuery.extend({}, MaVas);
    if (MaVas.SearchFor === '' && MaVas.SearchForExact === '' && MaVas.SearchForAny === '') {
        SLApp.CommunityService.GetDownloadCnt(function (elem) {
            if (elem == '') {
                countSelectItems = 0;
            }
            else {
                var sel = JSON.parse(elem);
                countSelectItems = sel.downloads;
            }
            SLApp.DownloadHandler.GetDirDownloadLoadCount(dir, MaVas.SearchFor, CurrentView.IsFlat, function (count) {
                if (count == '')
                    count = '0';

                if (CurrentView.Type === 't') {
                    $("#MenuDownloadAllTxt").text(_localized['DownloadAll']);
                    $('#MenuDownloadAllTxt').addClass('disabled');
                }
                else {
                    $("#MenuDownloadAllTxt").text(_localized['DownloadAll'] + ' (' + count + ')');
                    if (parseInt(count) > 0 && parseInt(count) < 10000)
                        $('#MenuDownloadAllTxt').removeClass('disabled');
                    else
                        $('#MenuDownloadAllTxt').addClass('disabled');
                }

                $('#MenuDownloadSelectedTxt').text(_localized['DownloadSelected'] + ' (' + countSelectItems + ')');
                if (countSelectItems > 0)
                    $('#MenuDownloadSelectedTxt').removeClass('disabled');
                else
                    $('#MenuDownloadSelectedTxt').addClass('disabled');

                if (CurrentView.Type !== 't' && parseInt(count) === 0 && countSelectItems === 0)
                    $('#MenuDownload').addClass('HiddenMenu');
                else
                    $('#MenuDownload').removeClass('HiddenMenu');
            });
        });
    } else {
        $('#MenuDownload').addClass('HiddenMenu');
    }
}



$(function () {
    $('#LeftSliderBtn').click(function () {
        ToggleLeftSlider();
    });
    $('#LeftSlider').mouseenter(function () {
        if (LeftSliderCloseTimer !== 0) {
            clearTimeout(LeftSliderCloseTimer);
            LeftSliderCloseTimer = 0;
        }
    });
    $('#LeftSlider').mouseleave(function () {
        if (LeftSliderCloseTimer !== 0)
            clearTimeout(LeftSliderCloseTimer);
        LeftSliderCloseTimer = setTimeout('HideLeftSlider();', 3000);
    });

    $(window).scroll(function () {
        var posAttrib = $('#LeftSlider').css('position');

        var theViewportHeight = $(window).height();
        if (posAttrib === 'fixed') {
            //                $('#LeftSlider').offset({ top: Math.max($('#PageTopLine').height() + 2 - $(window).scrollTop(), 0), left: 0 });

            $('#LeftSlider').css('margin-top', '-' + Math.min($(window).scrollTop(), $('#PageTopLine').height() + 2) + 'px');
            //               $('#LeftSlider').height(theViewportHeight);
            //                $('#LeftSlider').height(theViewportHeight - $('#LeftSlider').css('top'));
        } else {
            var sTop = $(window).scrollTop() - $('#PageTopLine').height() - 2;
            if ($(window).scrollTop() < $('#PageTopLine').height() - 2)
                sTop += $('#PageTopLine').height() - $(window).scrollTop();
            $('#LeftSlider').offset({ top: sTop, left: 0 });
            if ($('#PageFooter').css('display') !== 'none')
                $('#PageFooter').offset({ top: $(window).height() - $('#PageFooter').height() + $(window).scrollTop(), left: 0 });
            //                $('#LeftSlider').height(theViewportHeight);
            /*
                            $('#LeftSlider').css({
                                'top': $(window).scrollTop() + 'px',
                                'margin-top': '-' + $('#UserInfoHeader').height() + 'px'
                            });
            */
        }
        var pos = $('#PageFooter').position();
        if (pos) {
            pos.top += $('#PageTopLine').height();
            pos.top -= $(window).scrollTop();

            $('#LeftSlider').css('height', pos.top);
        }
    });
    function scrollSmoth(ele) {
        var speed = 125, scroll = 2, scrolling;
        var lastVal = -10;

        var lauftext = new Object();
        var cont = true;
        lauftext.interval = window.setInterval(function () {
            if (cont) {
                if (ele.scrollTop() + 0 === 0) {
                    cont = false;
                    lauftext.timeout = setTimeout(function () {
                        cont = true;
                        ele.scrollTop(ele.scrollTop() + scroll);
                    }, 2000);
                }
            }
            if (cont) {
                ele.scrollTop(ele.scrollTop() + scroll)
                var sc = ele.scrollTop() + 0;
                if (sc === lastVal) {
                    cont = false;
                    lauftext.timeout = setTimeout(function () {
                        cont = true;
                        ele.scrollTop(0);
                    }, 2000);
                }
                lastVal = sc;
            }
        }, speed);
        return lauftext;
    }
    function IsTouchDevice() {
        var isTouch;
        if ("ontouchstart" in window || navigator.msMaxTouchPoints) {
            isTouch = true;
        } else {
            isTouch = false;
        }
        return isTouch;
    }
    function CheckSvgImages() {
        jQuery('img.svg').each(function () {
            var $img = jQuery(this);
            var imgID = $img.attr('id');
            var imgClass = $img.attr('class');
            var imgURL = $img.attr('src');
            jQuery.get(imgURL, function (data) {
                // Get the SVG tag, ignore the rest
                var $svg = jQuery(data).find('svg');

                // Add replaced image's ID to the new SVG
                if (typeof imgID !== 'undefined') {
                    $svg = $svg.attr('id', imgID);
                }
                // Add replaced image's classes to the new SVG
                if (typeof imgClass !== 'undefined') {
                    $svg = $svg.attr('class', imgClass + ' replaced-svg');
                }

                // Remove any invalid XML tags as per http://validator.w3.org
                $svg = $svg.removeAttr('xmlns:a');

                // Replace image with new SVG
                $img.replaceWith($svg);
            }, 'xml');
        });
    }
    var htmlSvgCode = "";
    /*
    function showDownloadInfo(result,files)
    {
        $('#DownloadingInfo').show();

        $('<div class="FileDownload" id="fild_' + result + '"><span>' + _localized['DownloadProgress'] + '</span><div class="ProgFilesPrepare" id="' + result + '"><div><div>').appendTo($('#DownloadingInfo'));
        $('#' + result).progressbar({
            value: 0
        });
        var pV = $('#' + result).find(".ui-progressbar-value");
        pV.css({ 'background': '#404040' });
        var tm = window.setInterval(function () {
            SLApp.DownloadHandler.CheckDownload(result, function (howfar) {
                var obj = JSON.parse(howfar);
                if (obj  !==  null) {
                    $('#' + result).progressbar('option', 'value', parseInt(obj.percentComplete));
                    if (obj.finished === true) {
                        clearInterval(tm);
                        $('<iframe style="display:none" src="/GetDownload.ashx?idx=' + 0 + '&ID=' + result + '"></iframe>').appendTo('body');
                        $('#fild_' + result).remove();
                        if ($('#DownloadingInfo').children().length===0) {
                            $('#DownloadingInfo').hide();
                        }
                    }
                }
            });
        }, 200);
    }
*/
    getLoadWidth = function (DisplWidth) {
        var thWidth = 200;
        if (DisplWidth > 200)
            thWidth = 300;
        if (DisplWidth > 300)
            thWidth = 400;
        if (DisplWidth > 400)
            thWidth = 482;
        return thWidth;
    };

    openFolder = function (item, inNewTab) {
        var search = getQueryParam("ft");
        if (search && search.startsWith("search") === true) {
            var loc = getLocElementsExcept(['dir', 'rd', 'v', 'flat', 'ft', 'so', 'color']);
            if (loc.indexOf('?') < 0)
                loc += '?';
            else
                loc += '&';
            if (!inNewTab)
                window.location.href = loc + "v=a&dir=" + $(item).data("dir") + "&scrt=" + $(item).data("id") + '&rd=' + MaVas.RootDirId;
            else
                window.open(loc + "v=a&dir=" + $(item).data("dir") + "&scrt=" + $(item).data("id") + '&rd=' + MaVas.RootDirId, "_blank");
        }
        else {
            if (!inNewTab) {
                if ($(item).data("dir"))
                    OpenFolderAndScrollToItem($(item).data("id"), $(item).data("dir"));
                else
                    OpenFolderAndScrollToItem(-1, $(item).data("id"));

            }
            else {
                var loc = getLocElementsExcept(['dir', 'rd', 'v', 'flat', 'ft', 'so', 'color']);
                if (loc.indexOf('?') < 0)
                    loc += '?';
                else
                    loc += '&';
                window.open(loc + "v=a&dir=" + $(item).data("dir") + "&scrt=" + $(item).data("id") + '&rd=' + MaVas.RootDirId, "_blank");
            }
        }
    }

    openDetailView = function (item, inNewTab) {


        var itemsArray = [];
        $($('#id_' + $(item).data('id')).data("grid")).children().each(function (index, item) {
            itemsArray[index] = $(item).data();
        });
        if ($(item).data("itype") === "1") {
            if ($("#vid_" + $(item).data("id")).length > 0) {
                console.log('Pause called');
                $("#vid_" + $(item).data("id"))[0].pause();
            }
        }
        if (getQueryParam('op') === 'parent') {
            SendToParent($(item).data("id"), opViewItems);
            return;
        }
        if (!inNewTab) {
            ShowDetailView($(item).data("id"), itemsArray, $(item).data('view'), true, false, $(item).data('itemsinview'));
        }
        else {
            var loc = getLocElementsExcept(['dir', 'rd', 'v', 'flat', 'ft', 'so', 'color']);
            if (loc.indexOf('?') < 0)
                loc += '?';
            else
                loc += '&';
            window.open(loc + "i=" + $(item).data("id"), "_blank");
        }
    }

    var ShowDetail = false;

    function RemoveHooverVideo(removeTheVid) {
        try {
            let player = $('#theVid').data('video');
            if (player != null) {
                $('#theVid').data('removeAfterDestroy', removeTheVid);
                $('#theVid').data('video', null);
                $("#tmb_" + $('#theVid').data('id')).show();

                player.pause();
                player.unload()
                    .then(() => {
                        console.log('Removing thumb video of id ' + $('#theVid').data('id'));
                        player.destroy();
                    })
                    .catch((error) => {
                        console.error("Source unload failed with error: ", error);
                    });
            }
            else if (removeTheVid) {
                console.log('Removing thumb video container of id ' + $('#theVid').data('id'));
                $("#tmb_" + $('#theVid').data('id')).show();
                $('#theVid').remove();
            }
        }
        catch (e) { };
    }

    function ShowHoover(item) {
        var video = "";
        if ($(item).data('hov') === 2) {
            if (parseInt($(item).data("itype")) === 1) {
                var imgID = $(item).data("id");
                SLApp.CommunityService.VideoUrl(imgID, function (url) {
                    var vid = $("#theVid");

                    if (vid.length == 0) {
                        vid = $('<div id="theVid" style="position:relative"></div>').appendTo('#lnk_' + imgID);
                    }
                    else if (vid.data('id') != imgID) {
                        RemoveHooverVideo(true);
                        vid = $('<div id="theVid" style="position:relative"></div>').appendTo('#lnk_' + imgID);
                    }

                    var outer = $('#outer_' + imgID);
                    vid.css('width', outer.width());
                    vid.css('height', outer.height());
                    vid.show();

                    let player = $('#theVid').data('video');
                    if (player == null) {
                        player = new mkplayer.MKPlayer(vid[0], playerConfigThumb);
                        const sourceConfig = {
                            //title: "Title for your source",
                            //description: "Brief description of your source",
                            poster: $('#tmb_' + imgID).attr('src'),
                            hls: url.UrlHLS,
                            dash: url.UrlDash
                        };

                        $('#theVid').data('video', player);
                        $('#theVid').data('id', imgID);

                        player.load(sourceConfig)
                            .then(() => {
                                $("#tmb_" + $('#theVid').data('id')).hide();
                                $('#theVid').find('video').css('width', '100%');
                            })
                            .catch((error) => {
                                console.error("An error occurred while loading the source!");
                            });
                    }
                    else {
                        player.seek(0);
                        player.play();
                    }
                });
                //                video = 'data-video="' + $(item).data("id") + '" ';

            }

            var imgCont = $("#crop_" + $(item).data("id"));
            if (imgCont.length === 0)
                imgCont = $("#outer_" + $(item).data("id"));
            var itHov = $('<div id="hov_' + $(item).data("id") + '" class="hovItem transHovBack" data-id="' + $(item).data("id") + '" ' + video + '><div>').appendTo(imgCont);
            {
                $(hooverIcons).appendTo(itHov);

                var arr = ['i1st', 'i2nd', 'i3rd', 'i4th', 'i5th', 'i6th', 'i7th', 'i8th'];
                var idx = 0;

                if (parseInt($(item).data("geo")) > 0) {
                    $('#GeoBtn').data('id', $(item).data("id"));
                    $('#GeoBtn').attr('alt', _localized['ImgHov_Geo']);
                    $('#GeoBtn').attr('title', _localized['ImgHov_Geo']);
                    $('#GeoBtn').click(function (e) {
                        $('#hovTooltip').remove();
                        var bthis = this;
                        SLApp.CommunityService.CountSelectedItems(function (xml) {
                            var sel = xml.getElementsByTagName('Selection')[0];
                            var countSelectMap = Math.max(parseInt(sel.getAttribute('Geo')), 0);
                            if (countSelectMap === 0)
                                Show_MapsDlg('img=' + $(bthis).data("id"));
                            else
                                BuildDetailGeo($(bthis), countSelectMap, $(bthis).data("id"), 1, 0);
                        });
                        e.stopPropagation();
                    }).hover(function () {
                        if (moreSel) {
                            popup = BuildDetailGeo($(this), 0, $(this).data("id"), 1, 0);
                            //                       elemRet.popup = popup;
                            var itemId = "#id_" + $(this).data("id");
                            popup.hover(function () {
                                ShowHoover(itemId);
                            }, function () {
                                $('#hov_' + $(item).data("id")).remove();
                            });
                        }
                    }, function () {
                    });
                    $('#GeoBtn').addClass(arr[idx++]);
                }
                else {
                    $('#GeoBtn').remove();
                }


                if (getQueryParam("op") !== false && getQueryParam("op") !== "ds") {
                    ShowDetail = true;
                }

                if ($('#id_' + $(item).data("id")).data("type") === "img") {
                    if (ShowDetail) {
                        $('#DetailImg').addClass(arr[idx++]);
                        $('#DetailImg').data('id', $(item).data("id"));
                        $('#DetailImg').attr('alt', _localized['ImgHov_Detail']);
                        $('#DetailImg').attr('title', _localized['ImgHov_Detail']);

                        $('#DetailImg').click(function (e) {
                            $('#hovTooltip').remove();
                            openDetailView(item, control);
                            e.stopPropagation();
                        });
                        $('#SlideShowImg').remove();
                    } else {
                        $('#SlideShowImg').addClass(arr[idx++]);
                        $('#SlideShowImg').data('id', $(item).data("id"));
                        $('#SlideShowImg').attr('alt', _localized['ShowSlides']);
                        $('#SlideShowImg').attr('title', _localized['ShowSlides']);

                        $('#SlideShowImg').click(function (e) {
                            $('#hovTooltip').remove();
                            e.stopPropagation();
                            if (CurrentView.Type === 't') {
                                SLApp.UserAndInfoService.GetImageIndexInCurrentView($(item).data("id"), parseInt($("#DateTimeContainer").data('root')), true, CurrentView.SortField, function (index) {
                                    OpenSlideShow(Math.max(0, index - 1), true, true);
                                });
                            }
                            else {
                                OpenSlideShow(parseInt($(item).data("index")), true, true);
                            }
                        });
                        $('#DetailImg').remove();

                    }
                } else {
                    $('#DetailImg').remove();
                }

                if ((CurrentView.Type === 't' || CurrentView.IsFlat === 'True' || CurrentView.FileType.startsWith('search')) && $('#id_' + $(item).data("id")).data("type") === "img" && $('#Page').data('NoTopMenu') !== true) {
                    $('#OpenFold').addClass(arr[idx++]);
                    $('#OpenFold').data('id', $(item).data("id"));
                    $('#OpenFold').data('dir', $(item).data("dir"));

                    $('#OpenFold').attr('alt', _localized['ImgHov_OpenFolder']);
                    $('#OpenFold').attr('title', _localized['ImgHov_OpenFolder']);

                    $('#OpenFold').click(function (e) {
                        $('#hovTooltip').remove();
                        openFolder(item, control);
                        e.stopPropagation();
                    });
                } else {
                    $('#OpenFold').remove();
                }

                if (parseInt($(item).data("protected")) === 0) {
                    $('#ShareImg').data('id', $(item).data("id"));
                    $('#ShareImg').attr('alt', _localized['ImgHov_Share']);
                    $('#ShareImg').attr('title', _localized['ImgHov_Share']);

                    $('#ShareImg').click(function (e) {
                        $('#hovTooltip').remove();
                        ShowHoverShareMenu($(this).data('id'));
                        e.stopPropagation();
                    });
                    $('#ShareImg').addClass(arr[idx++]);
                }
                else {
                    $('#ShareImg').remove();
                }
                if ($('#VidIco_' + parseInt($(item).data("id"))).length > 0) {
                    $('#VidIco_' + parseInt($(item).data("id"))).hide();
                }


                if ($(item).data("ext") != undefined && $(item).data("ext") != '' && $(item).data("itype") !== 1 && $(item).data("itype") < 3 && parseInt($(item).data("print")) > 0) {
                    var popup = null;
                    $('#PrintBtn').data('id', $(item).data("id"));
                    $('#PrintBtn').data('ext', $(item).data("ext"));
                    $('#PrintBtn').data('sizex', $(item).data("sizex"));
                    $('#PrintBtn').data('sizey', $(item).data("sizey"));
                    $('#PrintBtn').data('version', $(item).data("version"));
                    $('#PrintBtn').attr('alt', _localized['ImgHov_Print']);
                    $('#PrintBtn').attr('title', _localized['ImgHov_Print']);
                    $('#PrintBtn').addClass(arr[idx++]);
                    $('#PrintBtn').click(function (e) {
                        $('#hovTooltip').remove();
                        if ($(this).data('ext').toLowerCase() === '.pdf') {
                            $('<iframe id="printPdf" name = "iframe_a" src = "\PDFDocP.ashx?id=' + $(this).data('id') + '"/>').appendTo('body');
                        } else {
                            ImgFields = {
                                ID: $(this).data('id'),
                                SizeX: $(this).data('sizex'),
                                SizeY: $(this).data('sizey'),
                                ext: $(this).data('ext'),
                                ver: $(this).data('version')
                            };
                            printIt.PrintWithPDF(ImgFields);
                        }
                        e.stopPropagation();
                    });
                } else {
                    $('#PrintBtn').remove();
                }


                if (parseInt($(item).data("downl")) > 0) {
                    var moreSel = false;
                    $(".item").each(function (index, elem) {
                        if ($(this).data("selected") === "1") {
                            moreSel = true;
                            return false;
                        }
                    });
                    var popup = null;
                    $('#DowloadBtn').data('id', $(item).data("id"));
                    $('#DowloadBtn').attr('alt', _localized['ImgHov_Download'])
                    $('#DowloadBtn').attr('title', _localized['ImgHov_Download'])
                    $('#DowloadBtn').addClass(arr[idx++]);
                    $('#DowloadBtn').click(function (e) {
                        $('#hovTooltip').remove();
                        var clickedElem = this;
                        SLApp.CommunityService.CountSelectedItems(function (xml) {
                            var sel = xml.getElementsByTagName('Selection')[0];
                            var countSelectDownload = Math.max(parseInt(sel.getAttribute('Download')), 0);
                            var ImageID = parseInt($(clickedElem).data("id"));
                            if (!countSelectDownload)
                                //                                 popup = Show_Download('&Type=zip&Variables=embed&sub=yes&imgID=' + $(clickedElem).data("id") + '&Copyright=' + downloadWithCopyright + '&l=' + _locStrings.LanguageCode);
                                SLApp.DownloadHandler.PrepareSingleFileDownload(ImageID, 'Type=zip&Variables=embed&sub=yes&imgID=' + $(clickedElem).data("id") + '&Copyright=' + downloadWithCopyright + '&l=' + _locStrings.LanguageCode,
                                    function (result) {
                                        showDownloadInfo(result);
                                    }, function (fail) { });
                            else {
                                popup = BuildDetailDownload($(this), countSelectDownload, $(this).data("id"), 1, 0);
                            }
                            //                    elemRet.popup = popup;
                            if (popup)
                                popup.hover(function () { }, function () { });
                        });
                        e.stopPropagation();
                    }).hover(function () {
                        if (moreSel) {
                            popup = BuildDetailDownload($(this), 0, $(this).data("id"), 1, 0);
                            //                       elemRet.popup = popup;
                            var itemId = "#id_" + $(this).data("id");
                            popup.hover(function () {
                                ShowHoover(itemId);
                            }, function () {
                                $('#hov_' + $(item).data("id")).remove();
                            });
                        }
                    }, function () {
                    });
                } else {
                    $('#DowloadBtn').remove();
                }

                if (MaVas.IsFriend === true) {
                    $('#EditBtn').addClass(arr[idx++]);
                    $('#EditBtn').data('id', $(item).data("id"));
                    $('#EditBtn').attr('alt', _localized['ImgHov_EditImg']);
                    $('#EditBtn').attr('title', _localized['ImgHov_EditImg']);
                    $('#EditBtn').data('maintainer', location.protocol + '//' + location.host + '/user/?img=' + $(item).data('id') + '&edit=true');

                    $('#EditBtn').click(function (e) {
                        $('#hovTooltip').remove();
                        if ($(this).data('maintainer') != undefined && $(this).data('maintainer') != '')
                            window.open($(this).data('maintainer'), '_blank');
                        e.stopPropagation();
                    });
                } else {
                    $('#EditBtn').remove();
                }


                var titleDiv = null;
                if (!$('#id_' + $(item).data('id')).data('islist')) {
                    if (!$('#ShowDescriptors').data('checked') || !$('#ShowDescriptors').data('showDescriptors')) {
                        if ($(item).data('hov') === 2) {
                            if ($(item).data('description') === $(item).data('title'))
                                titleDiv = $('<div id="hovtitle" class="HoverTitle"><span>' + HtmlEncodeText($(item).data('title')) + '</span></div>').appendTo(itHov);
                            else
                                titleDiv = $('<div id="hovtitle" class="HoverTitle"><span>' + HtmlEncodeText($(item).data('title')) + '</span></br><span>' + HtmlEncodeText($(item).data('description')) + '</span></div>').appendTo(itHov);

                            titleDiv.css('max-height', $('#outer_' + $(item).data("id")).height() - 40);
                            var ofs = "#crop_" + $(item).data("id");
                            if ($(ofs).length === 0)
                                ofs = "#outer_" + $(item).data("id");
                            if ($('#outer_' + $(item).data("id")).height() < $('#crop_' + $(item).data("id")).height())
                                ofs = "#outer_" + $(item).data("id");
                            titleDiv.position({
                                my: "left bottom",
                                at: "left bottom",
                                of: ofs,
                                within: '#ScrollableContent'
                            });
                        }
                    }
                }

                var mark = $('<div id="MarkForDownload"><div>').appendTo(itHov);
                if (parseInt($(item).data("downl")) > 0 || parseInt($(item).data("geo")) > 0) {
                        var minHeight = 3;
                    var parent = '#hovtitle';
                    var at = 'left top';
                    if (titleDiv != null) {
                        minHeight = titleDiv.height();
                    } else {
                        parent = '#outer_' + $(item).data("id");
                        at = 'left bottom';
                    }
                    if ($('#crop_' + $(item).data("id")).length > 0) {
                        //                        minHeight = Math.min(minHeight, $('#crop_' + $(item).data("id")).height());
                    }
                    if ($(parent).length) {
                        $('#MarkForDownload').position({
                            my: "left bottom",
                            at: at,
                            of: parent,
                            within: '#ScrollableContent'
                        });
                    }
                    //                    $('#MarkForDownload').width($('#hovtitle').width());
                    var c = $(item).data("selected") === '1' ? 'true' : 'false';
                    var text = _localized['ImgHov_MarkImg'];
                    if ($(item).data("selected") === '1')
                        text = _localized['ImgHov_MarkedImg'];

                    $('<a id="ImgChecked" data-checked="' + c + '" data-id="' + $(item).data("id") + '" class ="checker HovDownloadBtn">' + text + '</a>').appendTo(mark).click(function (e) {
                        var btn = $(this);
                        SLApp.CommunityService.SelectImage(
                            parseInt($(this).data("id")),
                            !$(this).hasClass('checkedon'),
                            function (sel) {
                                $('#id_' + btn.data("id")).data("selected", sel.toString());
                                ShowSelected($('#id_' + btn.data("id")));

                                var text = _localized['ImgHov_MarkImg'];
                                if (sel > 0)
                                    text = _localized['ImgHov_MarkedImg'];
                                btn.text(text);

                                CheckSelectionForMenue();
                                if (!CurrentView)
                                    CurrentView = jQuery.extend({}, MaVas);
                                getPossibleDownloads(CurrentView.DirId);
                                $('#ImgChecked').data('checked', sel === 1 ? true : false);
                                checkcheckers('#ImgChecked');
                            }, function (err) {
                            });

                        e.stopPropagation();
                    });
                    checkcheckers('#ImgChecked');
                    $('#MarkForDownload').addClass('TransparentBlack');
                    var theImgHol = $('#outer_' + $(item).data("id"));
                    if ($('#crop_' + $(item).data('id')).length > 0)
                        theImgHol = $('#crop_' + $(item).data("id"));
                    if (CurrentView.ListView === true) {
                        $('#MarkForDownload').css('width', theImgHol.innerWidth() - 5);
                        $('#MarkForDownload').css('left', '0px');
                        var id = $(item).data("id");
                        var minHeight = $('#outer_' + id).height();
                        if ($('#crop_' + id).length > 0)
                            minHeight = Math.min(minHeight, $('#crop_' + id).height());
                        var offs = 0;

                        if ($(item).data('scale') < 1)
                            offs = parseInt($('#outer_' + id).css('margin-top'));

                        $('#MarkForDownload').css('top', minHeight + offs - $('#MarkForDownload').height() + 'px');
                        $('#ImgChecked').addClass('HovDownloadBtnList');
                    }
                }

                $('.svgframe').hover(function () {
                    $(this).addClass('hoverSvg');

                    if (getMobileOperatingSystem() !== 'unknown') {
                        $('#hovTooltip').remove();
                        var tip = $(this).attr('title');
                        if (tip != '') {
                            var tooltip = $('<div id="hovTooltip">' + tip + '</div>').appendTo('body');
                            tooltip.css({ top: parseInt($(this).parent().offset().top - tooltip.outerHeight() + 4) + 'px', left: parseInt($(this).parent().offset().left + 7) + 'px' });
                        }
                    }
                }, function () {
                    $(this).removeClass('hoverSvg');
                    $('#hovTooltip').fadeOut(250, function () {
                        $(this).remove();
                    });
                });

                $('.hovItem').click(function (e) {
                    if ($('#id_' + $(item).data("id")).data("type") === "img") {
                        var itemsArray = [];
                        var cbI = 0;
                        $($('#id_' + $(item).data('id')).data("grid")).children().each(function (index, item) {
                            if($(item).data("type")   !==  "dir")
                                itemsArray[cbI++] = $(item).data();
                        });
                        if ($(item).data("itype") === "1") {
                            console.log('Pause called');
                            $("#vid_" + $(item).data("id"))[0].pause();
                        }

                        ShowImage($(this).data("id"), itemsArray, $(item).data('view'), true, $('#id_' + $(item).data("id")).data('itemsinview'));

                        //                                window.location.href = $('#id_' + $(item).data("id")).data("href");
                    }
                    else {
                        var VasDir = jQuery.extend({}, MaVas);
                        VasDir.ParentId = MaVas.DirId;
                        VasDir.DirId = $(item).data("id");
                        VasDir.UFOffset = 0;
                        ShowUserFolder(VasDir, 1, 1);
                    }
                    e.preventDefault();
                    e.stopPropagation();
                });

            }
            /*
            itHov.children('.svgframe').hover(function () {
                $('#hov_tooltip').remove();
                var tip = $(this).attr('title');
                if (tip != '') {
                    var tooltip = $('<div id="hov_tooltip" class="hovItem transHovBack">' + tip + '</div>').appendTo('body');
                    //tooltip.css({ top: parseInt($(this).parent().parent().offset().top - tooltip.outerHeight() + 4) + 'px', left: $(this).parent().parent().offset().left + 'px', width: $(this).parent().parent().outerWidth() + 'px' });
                }
            },
            function () {
                $('#hov_tooltip').fadeOut(250, function () {
                    $(this).remove();
                });
            });
            */
            return itHov;
        }

        if ($(item).data('hov') === 1) {
            if ($('#hov_' + $(item).data("id")).length===0) {
                elemRet = new Object();

                var itHov = $('<div id="hov_' + $(item).data("id") + '" class="hovItem transHovBack"><div>').appendTo($(item));
                elemRet.hover = itHov;
                var text = $(item).data("description");
                if (text.length===0)
                    text = $(item).data("title");
                var clicked = 0;
                var hovh1 = $('<div data-id="' + $(item).data("id") + '"><h1 id="hovDesc">' + text + '</h1><div>').appendTo(itHov)
                if ($('#id_' + $(item).data("id")).data("type")==="dir") {
                    hovh1.addClass("hovDir");
                }

                if (!IsTouchDevice()) {
                    setTimeout(function () {
                        hovh1.click(
                            function () {
                                if ($('#id_' + $(item).data("id")).data("type")==="img") {
                                    var itemsArray = [];
                                    $($('#id_' + $(item).data('id')).data("grid")).children().each(function (index, item) {
                                        itemsArray[index] = $(item).data();
                                    });
                                    ShowImage($(this).data("id"), itemsArray, "#DateTimeContainer", true, $('#id_' + $(item).data("id")).data('itemsinview'));

                                    //                                window.location.href = $('#id_' + $(item).data("id")).data("href");
                                }
                                else {
                                    var VasDir = jQuery.extend({}, MaVas);
                                    VasDir.ParentId = MaVas.DirId;
                                    VasDir.DirId = $(item).data("id");
                                    VasDir.UFOffset = 0;
                                    ShowUserFolder(VasDir, 1, 1);
                                }
                            }
                        )
                    }, 1000);
                } else {
                    hovh1.click(
                        function () {
                            if ($('#id_' + $(item).data("id")).data("type")==="img") {
                                var itemsArray = [];
                                $($('#id_' + $(item).data('id')).data("grid")).children().each(function (index, item) {
                                    itemsArray[index] = $(item).data();
                                });
                                ShowImage($(this).data("id"), itemsArray, "#DateTimeContainer", true, $('#id_' + $(item).data("id")).data('itemsinview'));

                                //                                window.location.href = $('#id_' + $(item).data("id")).data("href");
                            }
                            else {
                                var VasDir = jQuery.extend({}, MaVas);
                                VasDir.ParentId = MaVas.DirId;
                                VasDir.DirId = $(item).data("id");
                                VasDir.UFOffset = 0;
                                ShowUserFolder(VasDir, 1, 1);
                            }
                        }
                    )
                }
                lauftext = scrollSmoth($('#hovDesc'));
                if ($(item).data("type")==="img")
                    $('<div id="Datum"><span>' + $(item).data("datet") + '</span><div>').appendTo(itHov);

                var w = $(item).width();
                var h = $('#hov_' + $(item).data("id")).height();
                var tr = '';
                if (w < 200 && parseInt($(item).data("geo")) > 0)
                    tr = '&nbsp;|&nbsp;';
                var d = $('<div id="HovDowLine"></div>').appendTo(itHov);
                if (parseInt($(item).data("geo")) > 0) {
                    $('<a data-id="' + $(item).data("id") + '">' + _locStrings['ImgHov_Geo'] + tr + '</a>').appendTo(d).click(function (e) {
                        Show_MapsDlg('img=' + $(this).data("id"));
                        e.stopPropagation();
                    });
                }
                if (parseInt($(item).data("downl")) > 0) {
                    var moreSel = false;
                    $(".item").each(function (index, elem) {
                        if ($(this).data("selected")==="1") {
                            moreSel = true;
                            return false;
                        }
                    });
                    var popup = null;
                    $('<a data-id="' + $(item).data("id") + '"> ' + _locStrings['ImgHov_Download'] + tr + '</a>').appendTo(d).click(function (e) {
                        if (!moreSel)
                            popup = SLApp.DownloadHandler.PrepareFileDownload('&Type=zip&Variables=embed&sub=yes&imgID=' + $(this).data("id") + '&Copyright=' + downloadWithCopyright + '&l=' + _locStrings.LanguageCode, function () {
                                showDownloadInfo(result);
                            });
                        else
                            popup = BuildDetailDownload($(this), 0, $(this).data("id"), 1, 1);
                        elemRet.popup = popup;
                        popup.hover(function () { }, function () { });
                        e.stopPropagation();
                    }).hover(function () {
                        if (moreSel) {
                            popup = BuildDetailDownload($(this), 0, $(this).data("id"), 1, 1);
                            elemRet.popup = popup;
                            var itemId = "#id_" + $(this).data("id");
                            popup.hover(function () {
                                ShowHoover(itemId);
                            }, function () {
                            });
                        }
                    }, function () {
                    });
                }
                if (parseInt($(item).data("downl")) > 0 || parseInt($(item).data("geo")) > 0) {
                    var c = $(item).data("selected")==='1' ? 'true' : 'false';
                    var text = _locStrings['ImgHov_MarkImg'];
                    if ($(item).data("selected")==='1')
                        text = _locStrings['ImgHov_MarkedImg'];
                    $('<a id="ImgChecked" data-checked="' + c + '" data-id="' + $(item).data("id") + '" class ="checker HovDownloadBtn">' + text + '</a>').appendTo(d).click(function (e) {
                        var btn = $(this);
                        SLApp.CommunityService.SelectImage(
                            parseInt($(this).data("id")),
                            !$(this).hasClass('checkedon'),
                            function (sel) {
                                $('#id_' + btn.data("id")).data("selected", sel.toString());
                                ShowSelected($('#id_' + btn.data("id")));

                                var text = _localized['ImgHov_MarkImg'];
                                if (sel > 0)
                                    text = _localized['ImgHov_MarkedImg'];
                                btn.text(text);

                                CheckSelectionForMenue();
                                if (!CurrentView)
                                    CurrentView = jQuery.extend({}, MaVas);
                                getPossibleDownloads(CurrentView.DirId);
                            }, function (err) {
                            });

                        e.stopPropagation();
                    });
                    checkcheckers('#ImgChecked');
                }
                var pt = 8;
                var ptd = 6;
                var pad = 5;
                if (w > 100) {
                    pt++;
                    ptd++;
                }

                if (w > 170) {
                    pt++;
                    ptd++;
                }
                if (w > 250) {
                    pad = 10;
                    pt++;
                    ptd += 2;
                }
                if (w > 300) {
                    pt++;
                    ptd++;
                }
                $('.hovItem h1').css({ 'font-size': pt + 'pt' })
                //                $('.hovItem h1').height(pt * 3.5 + 'pt');
                $('.hovItem').css({ 'font-size': pt - 1 + 'pt', 'padding': pad + 'px' })
                $('#HovDowLine').css({ 'margin-left': pad + 'px', 'margin-right': pad + 'px' })
                $('#HovDowLine a').css({ 'font-size': ptd + 'pt' })
                var offset = 10;
                if ($('#HovDowLine').height() > 0)
                    offset += 5;
                $('#hovDesc').height(h - $('#Datum').height() - $('#HovDowLine').height() - offset);
                return elemRet;
            }
        }
        if (!$('#ShowDescriptors').data('checked') || !$('#ShowDescriptors').data('showDescriptors')) {
            if ($(item).data('hov') === 0) {
                $('<div class="HoverTitle" id="hovtitle"><a>' + HtmlEncodeText($(item).data('title')) + '</a></div>').appendTo(item);
                if (CurrentView.ListView === true) {
                    var theImgHol = $('#outer_' + $(item).data("id"));
                    if ($('#crop_' + $(item).data('id')).length > 0)
                        theImgHol = $('#crop_' + $(item).data("id"));

                    var minHeight = $('#outer_' + id).height();
                    if ($('#crop_' + id).length > 0)
                        minHeight = Math.min(minHeight, $('#crop_' + id).height());

                    var offs = 0;
                    if ($(item).data('scale') < 1)
                        offs = parseInt($('#outer_' + id).css('margin-top'));

                    $('#hovtitle').addClass('HoverTitleList');
                    $('#hovtitle').css('width', theImgHol.innerWidth());
                    $('#hovtitle').css('left', '0px');
                }
            }
        }
        return null;
    }

    function itemHS() {
        var ele = null;
        $('#ScrollableContent').on("mouseenter", '.item',
            function () {
                if ($('#hov_' + $(this).data('id')).length===0) {
                    var eleh = ShowHoover(this);
                    if (eleh)
                        ele = eleh;
                }
            });
        $('#ScrollableContent').on("mouseleave", '.item',
            function (e) {
                if ($('#theVid').length > 0) {
                    RemoveHooverVideo(true);
                    //$('#theVid').hide();
                    $("#tmb_" + $('#theVid').data('id')).show();
                }

                $(".hovItem").each(function (inex, el) {
                    $(this).remove();
                });
                $('.HoverTitle').remove();
                $('.VideoIcon').show();


                /*
                var toElem = e.relatedTarget || e.toElement;
                if (toElem && toElem.id  !==  "MainMenuPopupBottom") {
                    if (ele) {
                        ele.hover.remove();
                        if (ele.popup)
                            ele.popup.remove();
                        //
                        window.clearTimeout(lauftext.timeout);
                        window.clearInterval(lauftext.interval);
                    }
                }
                /*                if ($('#VidIco_' + parseInt($(item).data("id"))).length > 0) {
                                    $('#VidIco_' + parseInt($(item).data("id"))).hide();
                                }
                */
            });
        $('#ScrollableContent').on("click", '.outerImg',
            function (e) {
                $('#hov_' + $(this).parent().data("id")).click();
            });
        DirectoryClicked = function (element) {
            if ($('#id_' + element.data("id")).data("datatype")==="img") {
                var itemsArray = [];
                $(element.data("grid")).children().each(function (index, item) {
                    itemsArray[index] = $(item).data();
                });
                if (StopVids)
                    StopVids();
                ShowImage(element.data("id"), itemsArray, element.data("view"), true, $('#id_' + $(item).data("id")).data('itemsinview'));
                //                    window.location.href = $('#id_' + $(this).data("id")).data("href");
            }
            else {
                var VasDir = jQuery.extend({}, MaVas);
                if (CurrentView)
                    VasDir = jQuery.extend({}, CurrentView);
                VasDir.ParentId = MaVas.DirId;
                VasDir.DirId = element.data("id");

                VasDir.UFOffset = 0;
                ShowUserFolder(VasDir, 1, 1);
            }
        };
        $('#ScrollableContent').on('click', '.ThumbList', function () {
            DirectoryClicked($(this));
        });
        $('#ScrollableContent').on('click', '.ThumbListP', function () {
            DirectoryClicked($(this));
        });

        $('#ScrollableContent').on('click', '.cropper', function (e) {
            $(this).find('.Thumb').click();
        });
        $('#ScrollableContent').on('click', '.Thumb', function (e) {
            /*if ($(this).data('hov')===0)*/ {
                if (UseOwnScrollbar())
                    $('#ScrollableContentLayer').scrollTop(0);

                if ($('#id_' + $(this).data("id")).data("datatype") === "img") {
                    var itemsArray = [];
                    $($(this).data("grid")).children().each(function (index, item) {
                        itemsArray[index] = $(item).data();
                    });
                    if (StopVids)
                        StopVids();
                    ShowImage($(this).data("id"), itemsArray, $(this).data("view"), true, $('#id_' + $(item).data("id")).data('itemsinview'));
                    //                    window.location.href = $('#id_' + $(this).data("id")).data("href");
                }
                else {
                    var VasDir = jQuery.extend({}, MaVas);
                    if (CurrentView)
                        VasDir = jQuery.extend({}, CurrentView);
                    VasDir.ParentId = MaVas.DirId;
                    VasDir.DirId = $(this).data("id");
                    VasDir.UFOffset = 0;
                    ShowUserFolder(VasDir, 1, 1);
                }
                e.stopPropagation();
            }
        });
        /*        $('.item').live("mouseup", function () {
                    window.location.href = $('#id_'+$(this).data("id")).data("href");
                });
        */
    }

    window.onbeforeprint = function (event) {
        if (inIframe())
            $(window).resize();
    };

    var hooverIcons = "";
    var checkImagesTimer = 0;

    $(document).ready(function () {

        
        var isIe = (navigator.userAgent.toLowerCase().indexOf("msie")  !==  -1 || navigator.userAgent.toLowerCase().indexOf("trident")  !==  -1);
        var focusHiddenArea = function () {
            // In order to ensure that the browser will fire clipboard events, we always need to have something selected
            hiddenInput.val(' ');
            hiddenInput.focus().select();
        };
        if (!$('#ShowDescriptors').length)
            $('<div id="ShowDescriptors" data-checked="true"></div>').appendTo('body');
        $('#ShowDescriptors').click(function (e) {

            if ($(this).data('checked')) {
                $(this).data('checked', false);
                $(this).removeClass('checkedon');
                $('.FolderDescr').addClass('NoHeight');
                $('.DirDescr').addClass('DisplayInFrame');
                $('.FolderIcon').addClass('FolderIconDark');
                $('.dategrid').hmLayout('reloadItems');
                $('.dategrid').hmLayout('layout');
                setCookie('HideDescriptors' + MaVas.RootDirId, true);
            } else {
                $(this).data('checked', true);
                $(this).addClass('checkedon');
                $('.FolderDescr').removeClass('NoHeight');
                $('.DirDescr').removeClass('DisplayInFrame');
                $('.FolderIcon').removeClass('FolderIconDark');
                $('.dategrid').hmLayout('reloadItems');
                $('.dategrid').hmLayout('layout');
                setCookie('HideDescriptors' + MaVas.RootDirId, false);
            }
            checkcheckers();
            MenuDontHide("MenuItems_View");
        });

        if (getQueryVariable('desc') === 'off' || getCookie('HideDescriptors' + MaVas.RootDirId)==='true') {
            $('#ShowDescriptors').data('checked', false);
            $('#ShowDescriptors').removeClass('checkedon');
        }

        $('#NewBtn_View').hover(function () {
            if ($('#NewBtn_View').data("Timer")) {
                clearTimeout($('#NewBtn_View').data("Timer"));
                $('#NewBtn_View').data("Timer", 0);
            }
        }, function () {
                $('#NewBtn_View').data("Timer", setInterval(function () {
                    if ($('.daterangepicker').css('display') === 'none') {
                        $('#NewBtn_View').hide();
                        clearInterval($('#NewBtn_View').data("Timer"));
                        $('#NewBtn_View').data("Timer", 0);
                    }
                }, 2000));
        });

        buildItemsContextMenu = function () {
            return;
            if (getMobileOperatingSystem() === 'unknown') {
                $.contextMenu({
                    selector: '.item',

                    zIndex: 50000,
                    callback: function (key, options) {
                        switch (key) {
                            case 'open':
                                openFolder(options.$trigger, false);
                                break;
                            case 'opentab':
                                {
                                    var loc = getLocElementsExcept(['dir', 'rd', 'v', 'flat', 'ft', 'so', 'color']);
                                    if (loc.indexOf('?') < 0)
                                        loc += '?';
                                    else
                                        loc += '&';
                                    window.open(loc + "dir=" + options.$trigger.data('id'));
                                }
                                break;
                            case 'ImageViewer':
                                {
                                    openDetailView(options.$trigger, false);
                                }
                                break;
                            case 'ImageViewerNT':
                                {
                                    openDetailView(options.$trigger, true);
                                }
                                break;
                            case 'OpenFolder':
                                openFolder(options.$trigger, false);
                                break;
                            case 'OpenFolderNT':
                                openFolder(options.$trigger, true);
                                break;
                        }
                    },
                    build: function ($triggerElement, event) {
                        if (MaVas.NoMenu  !==  true) {
                            if ($triggerElement.data('type') === 'dir') {
                                return {
                                    items: {
                                        "open": { name: _localized['OpenFolder'] },
                                        "opentab": { name: _localized['OpenFolderNT'] },
                                    }
                                };
                            } else {
                                if ((CurrentView.Type === 't' || CurrentView.FileType.startsWith('search')) && $('#id_' + $($triggerElement).data("id")).data("type")==="img") {
                                    return {
                                        items: {
                                            "ImageViewer": { name: _localized['ShowDetailView'] },
                                            "ImageViewerNT": { name: _localized['ShowDetailViewNT'] },
                                            "sep1": "---------",
                                            "OpenFolder": { name: _localized['OpenImgInFolder'] },
                                            "OpenFolderNT": { name: _localized['OpenImgInFolderNT'] }
                                        }
                                    };
                                } else {
                                    return {
                                        items: {
                                            "ImageViewer": { name: _localized['ShowDetailView'] },
                                            "ImageViewerNT": { name: _localized['ShowDetailViewNT'] }
                                        }
                                    };
                                }
                            }
                        }
                    }
                });
            }
        };


        $('#SortDirChooser').hover(function () {
            $('#SortDirChooser').addClass('SortDirectionSelect');
            var classList = $('#SortDirChooser').attr('class').split(/\s+/);
            $(classList).each(function (index, elem) {
                if (elem.startsWith('SortDirection_S')) {
                    $('#SortDirChooser').addClass(elem + "_white");
                }
            });
        }, function () {
            $('#SortDirChooser').removeClass('SortDirectionSelect');
            var classList = $('#SortDirChooser').attr('class').split(/\s+/);
            $(classList).each(function (index, elem) {
                if (elem.startsWith('SortDirection_S')) {
                    $('#SortDirChooser').removeClass(elem + "_white");
                }
            });
        });
        $('#SortDirChooser').click(function () {
            var so = getQueryParam("so");
            if (!so) {
                so = "DispOrder-SortOrder";
            }
            var loc = getLocElementsExcept(["so"], null, null);
            if (so.indexOf("desc") > 0) {
                so.replace("+desc", "");
            } else {
                so = so + "+desc"
            }
            window.location.href = loc + "&so=" + so;
        });

        $(window).on('popstate', function (e) {
            var state = e.originalEvent.state;
            switch (state) {
                case "OpenFolder": {
                    var VasDir = jQuery.extend({}, MaVas);
                    VasDir.IsFlat = false;
                    var ft = getQueryParam("flat");
                    if (ft) {
                        if (ft === 'true') {
                            VasDir.IsFlat = true;
                        }
                    }
                    VasDir.DirId = getQueryParam("dir");
                    VasDir.UFOffset = 0;
                    ShowUserFolder(VasDir, 1, false);
                }
                    break;
                case 'DateView':
                    reloadTimeLineContent(false);
                    break;
                case 'UserInfo':
                    ShowUserInfoDlg(MaVas.UserID, CurrentView.DirId, false);
                    break;
                case 'DiaShow':
                    if ($(window).data('slprev')) {
                        Carousel.Close();
                        history.go($(window).data('slprev'));
                    }
            }
        });

        if (UseOwnScrollbar()) {
            $('#ScrollableContentLayer').scroll(function () {
                CheckFurtherFolder();
            });
            $('#ScrollableContentLayer').resize(function () {
                CheckFurtherFolder();
            });
        }
        else {
            $(window).scroll(function () {
                CheckFurtherFolder();
            });
            $(window).resize(function () {
                CheckFurtherFolder();
            });
        }

        $(window).mousemove(function (e) {
            MousePos = { left: e.pageX, top: e.pageY };  //remember $(e) - could be any html tag also..
        });
        try {
            if (SLApp != undefined) {
                SLApp.CommunityService.GetHTMLSnipp("SvgIcons", "", function (html) {
                    hooverIcons = html;
                });
            }
        } catch (e) { };
        $(".tmbVids").hover(function () {
            this.play();
        }, function () {
            this.pause();
            console.log('Pause called');

        });

        try {
            if (getCookie("Banner") !== "off" && getQueryParam("ba") != "small" && typeof bannerImages != 'undefined' && bannerImages.length > 0)
                BannerOn(false);
            else
                BannerOff(false);
        }
        catch (e) {
            BannerOff(false);
        }

        $('#BannerSmallLarge').click(function () {
            ToggleBannerOnOff();
        });
        DoContentResize();
        itemHS();

        //        $(document.body).append($('#MenuAnsicht_View').detach());
        $(window).resize(DoContentResize);
        DisplayCookieWarning();
        var mpLeft = -1;
        var mpTop = -1;
        var msTarget = null;
        var timr = -1;

        $('#ScrollToTopNav').click(function () {
            if (UseOwnScrollbar())
                $('#ScrollableContentLayer').scrollTop(0);
            else
                $(window).scrollTop(0);
        });

        $(document).on('keyup keydown', function (e) {
            control = e.ctrlKey;
        });
        $(window).mousemove(function (e) {
            mpLeft = e.pageX;        //retieving the left position of the div...
            mpTop = e.pageY;          //get the top position of the div...
            msTarget = $(e.target)
            //            console.log(e.target);
        });
 /*       timr = setInterval(function () {
            var el = document.elementFromPoint(mpLeft, mpTop);
            if (msTarget  !=  null)
                if (!msTarget.parents().hasClass('SubMenu'))
                    if (!msTarget.parents().hasClass('Menu'))
                        if (!msTarget.hasClass('MenuItem')) {
                            if (!msTarget.hasClass("isMenue"))
                                removeMenu();
                        }
        }, 700);
*/
        //      New Menues

        ClickHandler('#MenuAnsicht');
        ClickHandler('#MenuSelect');
        ClickHandler('#MenuShare');
        ClickHandler('#MenuDownload');
        ClickHandler('#MenuMenu');
        ClickHandler('#MenuLanguage');


        $('#BurgerMenue').click(function () {
            if ($('#MenuHome').hasClass('HomeMenuMobile')) {
                removeMenu();
            } else {
                $('#MenuHome').addClass('HomeMenuMobile');
                $('#MenuItems').css('display', 'block');
                $('#HeaderSearch2').css('display', 'none');
            }
        });
        $('#MenuHome').hover(function () { }, function () {
            /*
                        if($('#MenuHome').hasClass('HomeMenuMobile')){
                            $('#MenuItems').css('display', 'none');
                            $('#MenuHome').removeClass('HomeMenuMobile');
                        }
            */
        });

        $('.MainMenuButton').hover(function () {
            ShowMainMenuTooltip($(this));
        },
            function () {
                HideMainMenuTooltip();
            });

        $('#Menu_User').hover(function () {
            ShowMenuUserDropDown()
        },
            function () {
                MenuUserDropdownTimer = setTimeout('HideMenuUserDropDown();', 50);
            });

        var posAttrib = $('#LeftSlider').css('position');
        if ($('#LeftSlider').length===0)
            posAttrib = 'fixed';
        if (posAttrib  !==  'fixed') {
            $("#LeftSlider").css('position', "absolute");
            $("#LeftSlider").css('top', "-64px");

            $("#PageFooter").css('position', "absolute");
            $("#PageFooter").css('top', $(window).height() - $('#PageFooter').height());
        }
        else
            $("#LeftSlider").css('top', "0px");
        var pos = $('#PageFooter').position();

        $('.ViewType').mouseenter(function () {
            if (!$(this).hasClass('ViewTypeCurrent')) {
                var img = $(this).attr('src');
                if (img)
                    if (img.substring(img.length - 8)  !==  '-foc.png')
                        $(this).attr('src', img.substring(0, img.length - 4) + '-foc.png');
            }
        });
        $('.ViewType').mouseleave(function () {
            if (!$(this).hasClass('ViewTypeCurrent')) {
                var img = $(this).attr('src');
                if (img)
                    if (img.substring(img.length - 8)==='-foc.png')
                        $(this).attr('src', img.substring(0, img.length - 8) + '.png');
            }
        });

        $("#FlatViewToggle").click(function () {
            FlatViewModeClicked();
        });

        $("#ShowList").click(function () {
            $('#ShowDescriptors').addClass('DisabledMenu');
            $('#ImgViewDlgClose').click();
            MaVas.ListView = true;
            RefreshCurrentView(MaVas.IsFlat, MaVas.Type, MaVas.SortFor);
            ResetMenuItemsView("ShowList");
            removeMenu();
        });
        $("#ShowGallery").click(function () {
            $('#ImgViewDlgClose').click();
            MaVas.ListView = false;
            RefreshCurrentView(MaVas.IsFlat, MaVas.Type, MaVas.SortFor);
            ResetMenuItemsView("ShowGallery");
            $('#ShowDescriptors').removeClass('DisabledMenu');
            removeMenu();
        });
        $('#ShowSlideShow').click(function () {
            var id = 0;
            $('#ShowDescriptors').removeClass('DisabledMenu');
            if ($('#SlidesView').hasClass('SlidesDisabled'))
                return;
            $('#ImgViewDlgClose').click();
            $('#DateTimeContainer div').each(function (index, element) {
                if ($(element).visible()) {
                    try {
                        if ($('#' + element.id + " .item").first().length > 0) {
                            id = parseInt($('#' + element.id + " .item").first().data('id')) * -1;
                            return false;
                        }
                    } catch (e) {
                    }
                }
            });
            OpenSlideShow(id, true, true);
        });
        $('#ShowInMaps').click(function () {
            $('#ImgViewDlgClose').click();

            if (countSelectMap > 0) {
                // Display selected images with GPS data
                Show_MapsDlg('img=selection');
            }
            else if (MaVas != null && MaVas.CurrentImageID <= 0 && MaVas.AllowDirMap) {
                // Display all images with GPS data of current folder
                if (MaVas.IsFlat === 'True')
                    Show_MapsDlg('folder=' + MaVas.FlatDirId + '&flat=true');
                else
                    Show_MapsDlg('folder=' + MaVas.DirId);
            }
            else {
                // Display first image with GPS data
                $('.item').each(function () {
                    if ($(this).data('geo') === 1) {
                        //SelectImage($(this).data("id"), true);
                        Show_MapsDlg('img=' + $(this).data("id"));
                        return false;
                    }
                });
            }
        });
        $('#MenuSelectItems_UnselectAll').click(function () {
            UnselectAllItems();
            removeMenu();
        });

        $('#ShowInMaps').addClass('DisabledMenu');

        $('#MenuDownloadAll').click(function () {
            if ($('#MenuDownloadAllTxt').hasClass('disabled'))
                return;

            removeMenu();
            ShowSpinner();
            var subDirs = "&sub=no";

            if (MaVas.SearchFor === '' && MaVas.SearchForExact === '' && MaVas.SearchForAny === '') {
                if (CurrentView.IsFlat === "True")
                    subDirs="&sub=yes"

                SLApp.DownloadHandler.PrepareFileDownloadAll('&Type=zip&Variables=embed&Copyright=' + downloadWithCopyright + subDirs+ '&d=' + CurrentView.DirId + '&l=' + _locStrings.LanguageCode, function (result) {
                    var array = [result];
                    setCookie('downloads', JSON.stringify(array), 180);
                    showDownloadInfo(result);
                }, function (err) {
                    HideSpinner();
                    displayErrorMesssage(err.get_message(), _localized.Error);
               });
            } else {
                SLApp.DownloadHandler.PrepareFileDownloadSearch(MaVas.SearchFor, '&Type=zip&Variables=embed&Copyright=' + downloadWithCopyright + '&d=' + CurrentView.DirId + '&l=' + _locStrings.LanguageCode, function (result) {
                    var array = [result];
                    setCookie('downloads', JSON.stringify(array), 180);
                    showDownloadInfo(result);
                }, function (err) {
                    HideSpinner();
                    displayErrorMesssage(err.get_message(), _localized.Error);
                });
            }
        });
        $('#MenuDownloadSelected').click(function () {
            if (!$('#MenuDownloadSelected a').hasClass('disabled')) {
                ShowSpinner();
                SLApp.DownloadHandler.PrepareFileDownload('&Type=zip&Variables=embed&Copyright=' + downloadWithCopyright + '&l=' + _locStrings.LanguageCode, function (result) {
                    var array = [result];
                    setCookie('downloads', JSON.stringify(array), 180);
                    showDownloadInfo(result);
                }, function (err) {
                    HideSpinner();
                    displayErrorMesssage(err.get_message(), _localized.Error);
                });
            }
        });

        $(document).on("click", '.CloseDeleteDwonl', function () {
            ShowSpinner();
            SLApp.DownloadHandler.EraseDowload($(this).data('id'), function (result) {
                $('#d' + result).remove();
                if ($('#DownloadingInfo').children().length === 0) {
                    $('#DownloadingInfo').hide();
                }
                HideSpinner();
            }, function (err) {
                HideSpinner();
                displayErrorMesssage(err.get_message(), _localized.Error);
            });
        });

        $(document).on("click", '.CancelDownload', function () {
            ShowSpinner();
            SLApp.DownloadHandler.EraseDowload($(this).data('id'), function (result) {
                $('#d' + result).remove();
                if ($('#DownloadingInfo').children().length === 0) {
                    $('#DownloadingInfo').hide();
                }
                HideSpinner();
            }, function (err) {
                HideSpinner();
                displayErrorMesssage(err.get_message(), _localized.Error);
            });
        });

        try {
            if (SLApp != undefined && SLApp.DownloadHandler) {
                SLApp.DownloadHandler.GetDowloads(function (result) {
                    if (result.length === 0) {
                        result = "{}";
                    }

                    var resArr = JSON.parse(result);
                    if (resArr) {
                        for (var cbI = 0; cbI < resArr.length; cbI++) {
                            SLApp.DownloadHandler.ExistsDownload(MaVas.RootDirId, resArr[cbI], function (does) {
                                if (does  !==  'false')
                                    showDownloadInfo(does);
                                else {
                                    setCookie('dowloads', "", 180);
                                }
                            });
                        }
                    }
                    else {
                        var result = getCookie('downloads');
                        var resArr = JSON.parse(result);
                        if (resArr) {
                            for (var cbI = 0; cbI < resArr.length; cbI++) {
                                if (resArr[cbI]  !==  'Error') {
                                    var rootID = 0;
                                    try {
                                        if (MaVas)
                                            rootID = MaVas.RootDirId;
                                    } catch (e){
                                        rootID = MaVas.rootDirID;
                                    }
                                    SLApp.DownloadHandler.ExistsDownload(rootID,resArr[cbI], function (does) {
                                        if (does  !==  'false')
                                            showDownloadInfo(does);
                                        else {
                                            setCookie('dowloads', "", 180);
                                        }
                                    });
                                }
                            }
                        }
                    }
                });
            }
        } catch (err) {
        }
    });
});
function replaceVP(input, viewPart) {
    var arr = ('' + input).split("v=");
    if (arr.length===1) {
        input += "&v=a";
        arr = input.split("v=");
    }
    var newS = arr[0] + "v=" + arr[1].substr(0, 1);
    var index = 1;
    if (arr[1].charAt(1)  !==  '&') {
        index = 2;
        if (arr[1].charAt(1)  !==  viewPart)
            viewPart = arr[1].charAt(1) + viewPart;
    }
    newS += viewPart + arr[1].substr(index)
    return newS;
}

function removeVP(input, viewPart) {
    var arr = ('' + input).split("v=");
    var index = 2;
    if (arr.length > 1) {
        if (arr[1] && arr[1].charAt(1) !== viewPart) {
            index = 3;
        }
        var newS = arr[0] + "v=" + arr[1].substr(0, index - 1);
        newS += arr[1].substr(index)

        return newS;
    } else {
        return input;
    }
}
function BannerOff(cookie) {
    $('#Banner').addClass('smallDisplay');
    $('#UserIcon').addClass('noDisplay');
    $('#UserDisplay').addClass('UserTextSmall');
    $('#BannerImg').addClass('noDisplay');
    $('#BannerSmallLarge').addClass('closedBkn');
    $('#UserNameOnSmall').removeClass('noDisplay');
    if (cookie)
        setCookie("Banner", "off", 180)
}
function BannerOn(cookie) {
    if (MaVas != null)
        $('#UserIcon').attr('src', '/MCUSRICON_' + MaVas.ShownUID + '.png');
    $('#Banner').removeClass('smallDisplay');
    $('#UserIcon').removeClass('noDisplay');
    $('#UserDisplay').removeClass('UserTextSmall');
    $('#BannerImg').removeClass('noDisplay');
    $('#UserNameOnSmall').addClass('noDisplay');
    $('#BannerSmallLarge').removeClass('closedBkn');
    if (cookie)
        setCookie("Banner", "on", 180);
}
function ToggleBannerOnOff() {
    if ($('#Banner').hasClass('smallDisplay')) {
        BannerOn(true);
    } else {
        BannerOff(true);
    }
}
function NoBanner() {
    $('#Banner').css('display', 'none');
    MenuHide = true;
}

function OnShowImage(type) {
    ShowImageType = type;
}

function NoTopMenu() {
    $('#topPlace').css('display', 'none');
    $('.CommunityMenuContent').css('display', 'none');
    $('#About').css('display', 'none');
    $('#SearchResults').css('display', 'none');
    $('#SearchPlaceUnder').css('display', 'none');
    $('#Placer').height(0);
//    $('.navigator').css('display', 'none');
    $('#Page').data('NoTopMenu', true);
    MenuHide = true;
}
function ShowSmallMenu() {
    $('.CommunitySmallMenuContent').css('display', 'block');
    $('#Placer').height(36);
}
function inIframe() {
    try {
        return window.self   !==  window.top;
    } catch (e) {
        return true;
    }
}

function getBase64Image(img) {
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    var dataURL = canvas.toDataURL("image/png");
    return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
}

var SlideShowCalled = false;
function OpenSlideShow(Index, autoStart, displayCloseBtn) {
    var winLocBefore = window.location.href;

    if (SlideShowCalled === true)
        return;
    SlideShowCalled = true;

    if (inIframe()) {
        if (getQueryParam("v")  !==  "ad" && getQueryParam("v")  !==  "td") {
            var locBefore = getLocElementsExcept(["SLClose"]);
            AddToHistory("DiaShow", "Title", locBefore + "&SLClose=stay");
        }
    }
    var locNew = replaceVP(window.location, 'd');
    try {
        AddToHistory("DiaShow", "Title", locNew);
    } catch (e) { };
    OnChangePage('Diashow');

    if (Index<0)
        Index = 0;
    Carousel.SetFlatMode(true);
    if (getQueryParam("SLClose") != 'new' && getQueryParam("nt") != 'true') {
        Carousel.SetOnCloseFunc(function (id) {
            var locBefore = removeVP(getLocElementsExcept(["si"]), 'd');
            AddToHistory("DiaShow", "Title", locBefore);
            if (!CurrentView)
                CurrentView = jQuery.extend({}, MaVas);
            RefreshCurrentView(CurrentView.IsFlat, CurrentView.Type, CurrentView.SortFor);
            ShowItems();
            $(window).resize();
            if (CurrentView.Type !== 't')
                OpenFolderAndScrollToItem(id, CurrentView.DirId, true);
        });
    }
    Carousel.SetAfterImageFunc(function (id) {
        var loc = getLocElementsExcept(["si", "v"]);
        loc += loc.indexOf('?') < 0 ? '?' : '&';
        AddToHistory("DiaShow", "Title", loc + "v=ad&si=" + id);
    });

    var type = getQueryParam('it');
    Carousel.SetImageType(type ? type : '11100');

    Carousel.SetFolderType(0);
    if (CurrentView.FileType.startsWith("search")) {
        var ft = getQueryParam("ft");
        if (ft.startsWith('search')) {
            Carousel.SetSearchArg(ft.substring(7), getQueryParam("asa"), getQueryParam("ase"));
        }
        if (getQueryParam("so"))
            Carousel.SortOrder = 'so=' + getQueryParam("so");
        Carousel.SetFolderType(5);
    }
    var StartWithImage = Index;
    if (CurrentView.Type === 't') {
        var SortFor = SortField + " DESC, DispOrder, SortOrder ";
        Carousel.SetSortOrder(SortFor);
        if (CurrentView.CurrentImageID > 0)
            StartWithImage = CurrentView.CurrentImageID * -1;
        Carousel.SetFlatMode(true);
    }
    else {
        Carousel.SetSortOrder(CurrentView.SortFor);
        Carousel.SetFlatMode(CurrentView.IsFlat);
    }

    discardPendingImages();
    removeAboutMe();
    $('#AlbumsView').remove();
    $("#DateTimeContainer").remove();
    $(window).scrollTop(0);

    if (MaVas.StartSlideShow === true || autoStart === true)
        AutoStartSlideShow();

    if (displayCloseBtn === true)
        Carousel.ShowCloseOnTop();

    var search = CurrentView.SearchFor === "" ? "" : "&ft=search." + CurrentView.SearchFor.plusEncode();
    var so = CurrentView.SearchOptions === "" ? "" : "&" + CurrentView.SearchOptions;
    var flat = CurrentView.IsFlat === 'True' ? "&flat=true" : "";
    var pre = '';
    var userSD = '';
    if (getQueryParam('sd'))
        userSD = '&sd=' + getQueryParam('sd');
    if (MenuHide) {
        pre = window.location.protocol + '//' + window.location.host;
    }
    AbortAllPendingRequests();
    discardPendingImages();
    Carousel.DoSlideShow(CurrentView.DirId, StartWithImage, true, pre + '?v=a&Dir=' + CurrentView.DirId + search + so + flat + userSD, function () {
        SlideShowCalled = false;
    });
    if (CurrentView.SlideShowBackgroundCol !== "") {
        Carousel.SetBackgroundColor(CurrentView.SlideShowBackgroundCol);
    }
    $(window).data('slprev', winLocBefore);
}

function resizeThumbs() {
    var ContentWidth = $(window).width();
    var thumbSize = $('#ThumbsContainer').width() - 7;
    var thumbSizeH = 0;
    if (ContentWidth > 760) {
        thumbSize = 350;
        thumbSizeH = 260;
    }

    if (ContentWidth > 980) {
        thumbSize = 220;
        thumbSizeH = 165;
    }

    $('.ThumbItem').each(function (index) {
        var id = $(this).data('hoverId');
        var scale = parseInt($(this).data("hover-height")) / parseInt($(this).data("hover-width"));
        var tmbS = thumbSize;
        if (parseInt($(this).data("hover-height")) > parseInt($(this).data("hover-width"))) {
            if (thumbSizeH)
                tmbS = thumbSizeH / scale;
        }
        $(this).attr('width', tmbS + 'px');
        $(this).attr('height', tmbS * scale + 'px');
    });
    $('.ThumbFolder').each(function (index) {
        var id = $(this).data('hoverId');
        var scale = parseInt($(this).data("hover-height")) / parseInt($(this).data("hover-width"));
        var tmbS = thumbSize;
        if (parseInt($(this).data("hover-height")) > parseInt($(this).data("hover-width"))) {
            tmbS = thumbSizeH / scale;
        }
        $(this).attr('width', tmbS + 'px');
        $(this).attr('height', tmbS * scale + 'px');
    });
}

function DoContentResize() {
    var login = $('#Menu_Login');
    if (login.length > 0) {
        var menu = $('#HeaderSearch');
        //        var left = menu.offset().left + parseInt(menu.css('padding-left')) + parseInt(menu.css('padding-right')) + menu.width();

        var loginBtn = $('#Menu_LoginBtn');
        /*
                if (login.is(':visible')) {
                    if (left + 270 >= $('#Menu_LoginSubmit').offset().left) {
                        login.hide();
                        loginBtn.show();
                        $('#HeaderMenu').removeClass('HeaderMenuLeft');
                        $('#HeaderMenu').addClass('HeaderMenuRight');
                    }
                }
                else if (loginBtn.is(':visible')) {
                    if (left + 270 < loginBtn.offset().left) {
                        loginBtn.hide();
                        login.show();
                        $('#HeaderMenu').addClass('HeaderMenuLeft');
                        $('#HeaderMenu').removeClass('HeaderMenuRight');
                        CheckWatermark($('#Menu_LoginMail'));
                        CheckWatermark($('#Menu_LoginPwd'));
                    }
                }
        */
        $('#HeaderMenu').removeClass('HeaderMenuLeft');
        $('#HeaderMenu').addClass('HeaderMenuRight');
    }
    else {
        $('#HeaderMenu').removeClass('HeaderMenuLeft');
        $('#HeaderMenu').addClass('HeaderMenuRight');
    }
    try {
        var leftPt = $('#PageHeader').width() / 2 + $('#HeaderSearch').width() / 2;
        /*        $('#HeaderMenuCenter').css({
                    'left': leftPt,
                    'width': $('#Menu_LoginBtn').position().left - leftPt
                })
        */
        //        $('#LeftSlider').css('left', $('#PageHeader').offset().left);
    } catch (e) { };

    if ($('#SearchEdit1').length > 0) {
        var w = $('#SearchEdit1').parent().width() - (2 * $('#SearchEdit1').position().left) - ($('#SearchEdit1').outerWidth(true) - $('#SearchEdit1').width());
        $('#SearchEdit1').siblings().each(function (idx) {
            if ($(this).css('position') != 'absolute')
                w -= $(this).outerWidth(true);
        });
        $('#SearchEdit1').width(Math.floor(w));
    }
}

function DisableCookieWarning() {
    cookieAllowedName = '';
}
function DisplayCookieWarning() {
    if (cookieAllowedName==='' || getCookie(cookieAllowedName)  !==  '' || $('#cookie-warning').length > 0 || window.self   !==  window.top)
        return;
    if (!_locStrings)
        return;
    var hint = $('<div id="cookie-warning"><div id="cookie-warning-accept">' + _locStrings.CookieWarningAccept + '</div><p>' + _locStrings.CookieWarningText + '</p></div>').appendTo('body');
    var bottom = 0;
    if ($('#PageFooter').length > 0)
        bottom = $('#PageFooter').height();
    hint.css('bottom', bottom + 'px');

    $('#cookie-warning-info').click(function () {
        Show_PrivacyDlg('l=' + _locStrings.LanguageCode);
        $('#cookie-warning').fadeOut(200, function () {
            $(this).remove();
        });
    });

    $('#cookie-warning-accept').click(function () {
        setCookie(cookieAllowedName, 'YES', 365);
        $('#cookie-warning').fadeOut(200, function () {
            $(this).remove();
        });
    });
}

/********************* Left slider with folder tree *********************/
function ToggleLeftSlider() {
    if ($('#LeftSliderBox').width()===0)
        ShowLeftSlider();
    else
        HideLeftSlider();
}
var SliderLoc = '/images/Community/Views/';
var SliderBtnLoc = "/images/Community/SliderLeft/";

function HideLeftSlider() {
    LeftSliderCloseTimer = 0;

    //    $('#LeftSliderBorder').addClass('background-image', 'url("' + SliderLoc + 'slider-border.png")');
    $('#LeftSlider').animate({ width: 25 + 'px' }, 'fast');
    $('#LeftSliderBox').animate({ width: '0px' }, 'fast', function () {
        $('#LeftSliderBox').css('overflow', 'hidden');
        $('#LeftSliderBtn').removeClass("LeftSliderOpen");
        $('#LeftSliderBtn').addClass("LeftSliderClosed");
        $('#LeftSlider').css('width', '25px');
    });
}

function ShowLeftSlider(duration) {
    if (duration==undefined)
        duration = 'fast';
    if ($('#LeftSliderBox').width()===0) {
        var width = 240;
        $('#LeftSlider').animate({ width: parseInt(width + 25) + 'px' }, duration);
        $('#LeftSliderBox').animate({ width: width + 'px' }, duration, function () {
            $('#LeftSliderBox').css('overflow', 'auto');
            $('#LeftSliderBtn').addClass("LeftSliderOpen");
            $('#LeftSliderBtn').removeClass("LeftSliderClosed");
        });
    }
}

/********************* Search for a keyword *********************/
function DoSearch(tag) {
    var edit = $('#SearchEdit');
    if (edit.length > 0) {
        edit.val(tag);
        $('#Searcher').click();
    }
}

/********************* Subpage / dialog on current page *********************/
function AddStdBtns(dlgName, buttons) {
    var controls = $('<ul id="SubPageControl"></ul>').appendTo($("#footer_" + dlgName));
    if (buttons==undefined)
        buttons = 'print|close';
    buttons = '|' + buttons.toLowerCase() + '|';

    if (buttons.indexOf('|print|') >= 0) {
        var print = $('<li>&raquo; ' + _locStrings.Print + '</li>').appendTo(controls);
        print.click(function () {
            var frm = $('#DlgFrm_' + dlgName);
            frm[0].contentWindow.focus();
            frm[0].contentWindow.print();
        });
    }
    if (buttons.indexOf('|close|') >= 0) {
        controls.append('<li onclick="Close_' + dlgName + '();">&raquo; ' + _locStrings.Close + '</li>');
    }
}

/********************* Main Menu Items *********************/

String.prototype.visualLength = function () {
    $('<span id="ruler">' + this + '</span>').appendTo('body');

    var ret = $('#ruler').width();
    $('#ruler').remove();
    return ret;
}

var timerMainMenuTooltip = 0;
function ShowMainMenuTooltip(divMenuBtn, sText) {
    if (sText==undefined || sText==='') {
        sText = divMenuBtn.data('Tooltip');
        if (sText==undefined || sText==='')
            return;
    }

    clearTimeout(timerMainMenuTooltip);
    if ($('#MainMenuPopupBack').length > 0)
        return;

    if ($('#MenuMenuTooltip').length > 0)
        $('#MenuMenuTooltip').remove();

    var tt = $('<div id="MenuMenuTooltip"><div id="MenuToolTipLeft" class="menuToolTipFillerLeft"></div><img id="PointerTT" src="/images/Community/menu-tooltip.png" style="position:relative;width:13px;height:7px" /><div id="MenuToolTipRight" class="menuToolTipFillerRight"></div><div id="ttTxt" class="menuToolTipBorders" style="width:auto">' + sText + '</div></div>').appendTo('body');
    var px = sText.visualLength();
    tt.width(px + 40);
    var OffsetX = (parseInt(divMenuBtn.offset().left) + parseInt(divMenuBtn.css('padding-left')) + parseInt(divMenuBtn.width() / 2) - parseInt(tt.width() / 2));
    var OffsetAX = (tt.width() - 13) / 2;

    if (OffsetX + tt.width() > $(window).width() - 5) {
        var off = $(window).width() - tt.width() - 5;
        OffsetAX = Math.min(OffsetAX + (OffsetX - off), tt.width() - 13);
        OffsetX = off;
    }
    if (OffsetX < 0) {
        OffsetAX = Math.max(OffsetAX + OffsetX, 0);
        OffsetX = 0;
    }

    $('#MenuToolTipLeft').width(OffsetAX);
    $('#MenuToolTipRight').width(tt.width() - 13 - OffsetAX);
    $('#PointerTT').css('left', OffsetAX + 'px');
    tt.css('left', OffsetX + 'px');
    tt.css('top', (divMenuBtn.offset().top + divMenuBtn.height() + parseInt(divMenuBtn.css('padding-top')) + parseInt(divMenuBtn.css('padding-bottom')) + 2) + 'px');
    timerMainMenuTooltip = setTimeout('$(\'#MenuMenuTooltip\').show();', 250);
}

function HideMainMenuTooltip() {
    clearTimeout(timerMainMenuTooltip);
    timerMainMenuTooltip = 0;
    $('#MenuMenuTooltip').remove();
}

var toolMenuTimeout = -1;
function HideToolMenu() {
    toolMenuTimeout = setTimeout(function () {
        $('#MainMenuPopup').remove();
    }, 3000)
}

function ShowMainMenuPopup(divMenuBtn, sTitle, divContent, leftOffs, ShowOnButton) {
    if (ShowOnButton)
        return ShowBottomMainMenuPopup(divMenuBtn, sTitle, divContent, leftOffs)
    else
        return ShowTopMainMenuPopup(divMenuBtn, sTitle, divContent, leftOffs)
}
function ShowBottomMainMenuPopup(divMenuBtn, sTitle, divContent, leftOffs) {
    HideMainMenuTooltip();
    if (MenuUserOpenOnHover==='') {
        if ($('#MainMenuPopupBack').length > 0) {
            $('#MainMenuPopup').remove();
        }
        else {
            var back = $('<div id="MainMenuPopupBack">&nbsp;</div>').appendTo('body');
            back.click(function () {
                HideMainMenuPopup();
            });
        }
    }
    else {
        if ($('#MainMenuPopup').length > 0)
            $('#MainMenuPopup').remove();
    }

    var popup = $('<div id="MainMenuPopup"></div>').appendTo('body');
    var box = $('<div id="MainMenuPopupBox"></div>').appendTo(popup);
    var top = $('<div id="MainMenuPopupBottom"><div class="arrow-down margin-up margin-posleft"></div></div>').appendTo(popup);

    if (MenuUserOpenOnHover  !==  '') {
        popup.hover(function () {
            if (MenuUserDropdownTimer  !==  0) {
                clearTimeout(MenuUserDropdownTimer);
                clearTimeout(toolMenuTimeout);
                MenuUserDropdownTimer = 0;
            }
        },
            function () {
                HideMainMenuPopup();
            });
    }

    if (sTitle.length > 0) {
        var close = $('<img id="MainMenuPopupClose" src="/images/Community/menupopup-close.png" title="' + _locStrings.Close + '" />').appendTo(box);
        close.click(function () {
            HideMainMenuPopup();
        });
    }

    if (box.css('background-color')  !==  'rgb(255, 255, 255)') {
        top.html('<img src="/images/Community/menupopup-top.dark.png" style="width:18px;height:9px;" />');
        if (sTitle.length > 0) {
            close.attr('src', '/images/Community/menupopup-close.dark.png');
        }
    }

    if (sTitle.length > 0)
        box.append('<div id="MainMenuPopupTitle">' + sTitle + '</div>');
    box.append(divContent);

    var topOffset = parseInt((popup.width() / 7.5) - 13.25);
    if (topOffset < 20)
        topOffset = 20;
    if (topOffset > 40)
        topOffset = 40;
    var OffsetX = parseInt(divMenuBtn.offset().left) + parseInt(divMenuBtn.css('padding-left')) + parseInt(divMenuBtn.width() / 2) - topOffset - 8;
    if (leftOffs > 0) {
        OffsetX = parseInt(divMenuBtn.offset().left) + parseInt(divMenuBtn.css('padding-left')) - topOffset - 8;
    }

    if (!$(divMenuBtn).is(":visible")) {
        OffsetX = 20;
    }

    var OffsetNX = OffsetX;
    if (OffsetX + popup.width() > $(window).width() - 40)
        OffsetNX = $(window).width() - popup.width() - 40;

    $('#MainMenuPopupTop img').css('margin-left', topOffset - (OffsetNX - OffsetX) + 'px');
    if ($(divMenuBtn).is(":visible")) {
        popup.css('top', divMenuBtn.offset().top - popup.height() - 2 + 'px');
        popup.css('left', OffsetNX + 'px');
    }
    else {
        popup.css('right', $('#PageHeaderMenuItems').width() + 10 + 'px');
        popup.css('top', 60 + 'px');
        $('#MainMenuPopupTop').hide();
    }

    popup.fadeIn('fast');

    return popup;
}

function ShowTopMainMenuPopup(divMenuBtn, sTitle, divContent, leftOffs) {
    HideMainMenuTooltip();
    if (MenuUserOpenOnHover==='') {
        if ($('#MainMenuPopupBack').length > 0) {
            $('#MainMenuPopup').remove();
        }
        else {
            var back = $('<div id="MainMenuPopupBack">&nbsp;</div>').appendTo('body');
            back.click(function () {
                HideMainMenuPopup();
            });
        }
    }
    else {
        if ($('#MainMenuPopup').length > 0)
            $('#MainMenuPopup').remove();
    }

    var popup = $('<div id="MainMenuPopup"></div>').appendTo('body');
    var top = $('<div id="MainMenuPopupTop"><img src="/images/Community/menupopup-top.png" style="width:18px;height:9px;" /></div>').appendTo(popup);
    var box = $('<div id="MainMenuPopupBox"></div>').appendTo(popup);

    if (MenuUserOpenOnHover  !==  '') {
        popup.hover(function () {
            if (MenuUserDropdownTimer  !==  0) {
                clearTimeout(MenuUserDropdownTimer);
                clearTimeout(toolMenuTimeout);
                MenuUserDropdownTimer = 0;
            }
        },
            function () {
                HideMainMenuPopup();
            });
    }

    if (sTitle.length > 0) {
        var close = $('<img id="MainMenuPopupClose" src="/images/Community/menupopup-close.png" title="' + _locStrings.Close + '" />').appendTo(box);
        close.click(function () {
            HideMainMenuPopup();
        });
    }

    if (box.css('background-color')  !==  'rgb(255, 255, 255)') {
        top.html('<img src="/images/Community/menupopup-top.dark.png" style="width:18px;height:9px;" />');
        if (sTitle.length > 0) {
            close.attr('src', '/images/Community/menupopup-close.dark.png');
        }
    }

    if (sTitle.length > 0)
        box.append('<div id="MainMenuPopupTitle">' + sTitle + '</div>');
    box.append(divContent);

    var topOffset = parseInt((popup.width() / 7.5) - 13.25);
    if (topOffset < 20)
        topOffset = 20;
    if (topOffset > 40)
        topOffset = 40;
    var OffsetX = parseInt(divMenuBtn.offset().left) + parseInt(divMenuBtn.css('padding-left')) + parseInt(divMenuBtn.width() / 2) - topOffset - 8;
    if (leftOffs > 0) {
        OffsetX = parseInt(divMenuBtn.offset().left) + parseInt(divMenuBtn.css('padding-left')) - topOffset - 8;
    }

    if (!$(divMenuBtn).is(":visible")) {
        OffsetX = 20;
    }

    var OffsetNX = OffsetX;
    if (OffsetX + popup.width() > $(window).width() - 40)
        OffsetNX = $(window).width() - popup.width() - 40;

    $('#MainMenuPopupTop img').css('margin-left', topOffset - (OffsetNX - OffsetX) + 'px');
    if ($(divMenuBtn).is(":visible")) {
        popup.css('top', (parseInt(divMenuBtn.offset().top) + parseInt(divMenuBtn.height()) + parseInt(divMenuBtn.css('padding-top')) + parseInt(divMenuBtn.css('padding-bottom')) + 2) + 'px');
        popup.css('left', OffsetNX + 'px');
    }
    else {
        popup.css('right', $('#PageHeaderMenuItems').width() + 10 + 'px');
        popup.css('top', 60 + 'px');
        $('#MainMenuPopupTop').hide();
    }

    popup.fadeIn('fast');

    return popup;
}

function HideMainMenuPopup() {
    if (MenuUserOpenOnHover  !==  '') {
        if (MenuUserDropdownTimer===0) {
            MenuUserDropdownTimer = setTimeout('HideMainMenuPopup();', 100);
            return;
        }

        clearTimeout(MenuUserDropdownTimer);
        MenuUserDropdownTimer = 0;
        MenuUserOpenOnHover = '';
    }

    $('#MainMenuPopup').fadeOut('fast', function () {
        $('#MainMenuPopup').remove();
        $('#MainMenuPopupBack').remove();
    });
}

function MenuContactClicked(name, dirid, imgid, facebook, twitter, website) {
    var contact = $('<div></div>');
    var icons = $('<div id="ContactList"></div>').appendTo(contact);
    contact.append('<p id="ContactText"></p>');

    if (website.length > 0) {
        if (website.indexOf('://') < 0)
            website = 'http://' + website;
        var title = _locStrings.ContactUserWebsiteMe;
        if (name.length > 0)
            title = _locStrings.ContactUserWebsite.replace(/#NAME#/g, name);
        var web = $('<a href="' + website + '" target="_blank"><img src="/images/Community/Views/share-website-big.png" alt="' + title + '" /></a>').appendTo(icons);
        web.mouseenter(function () { $('#ContactText').html($("img", this).attr('alt')); });
        web.mouseleave(function () { $('#ContactText').html(''); });
        web.click(function () {
            HideMainMenuPopup();
        });
    }
    if (facebook.length > 0) {
        var title = _locStrings.ContactUserFacebookMe;
        if (name.length > 0)
            title = _locStrings.ContactUserFacebook.replace(/#NAME#/g, name);
        var fb = $('<a href="https://www.facebook.com/' + facebook + '" target="_blank"><img src="/images/Community/Views/share-facebook-big.png" alt="' + title + '" /></a>').appendTo(icons);
        fb.mouseenter(function () { $('#ContactText').html($("img", this).attr('alt')); });
        fb.mouseleave(function () { $('#ContactText').html(''); });
        fb.click(function () {
            HideMainMenuPopup();
        });
    }
    if (twitter.length > 0) {
        var title = _locStrings.ContactUserTwitterMe;
        if (name.length > 0)
            title = _locStrings.ContactUserTwitter.replace(/#NAME#/g, name);
        var twt = $('<a href="https://twitter.com/' + twitter + '" target="_blank"><img src="/images/Community/Views/share-twitter-big.png" alt="' + title + '" /></a>').appendTo(icons);
        twt.mouseenter(function () { $('#ContactText').html($("img", this).attr('alt')); });
        twt.mouseleave(function () { $('#ContactText').html(''); });
        twt.click(function () {
            HideMainMenuPopup();
        });
    }

    var title = _locStrings.ContactUserPMMe;
    if (name.length > 0)
        title = _locStrings.ContactUserPM.replace(/#NAME#/g, name);
    var mail = $('<img src="/images/Community/Views/share-mail-big.png" alt="' + title + '" />').appendTo(icons);
    mail.mouseenter(function () { $('#ContactText').html($(this).attr('alt')); });
    mail.mouseleave(function () { $('#ContactText').html(''); });
    mail.click(function () {
        Show_SendPM('l=' + _locStrings.LanguageCode + '&did=' + dirid + '&iid=' + imgid);
        HideMainMenuPopup();
    });

    ShowMainMenuPopup($('#Menu_ContactUser'), _locStrings.ContactUser, contact);
}

function GetEmbedCode(sURL, bSlideshow, bSearchResult) {
    var fullSreenString = "";
    if (sURL==undefined)
        return '';
    if (bSearchResult==undefined)
        bSearchResult = false;
    if (!bSlideshow) {
        var c = '?';
        if (sURL.indexOf('?') >= 0)
            c = '&';
        /*
        if (sURL.indexOf('?style') < 0 && sURL.indexOf('&style') < 0) {
            sURL += c + 'style=WhiteAlbum';
            c = '&';
        }
        */
        if (sURL.indexOf('?embed') < 0 && sURL.indexOf('&embed') < 0) {
            sURL += c + 'embed=compact';
            c = '&';
        }
    }
    else {
        fullSreenString = "class=&quot;MCIFrame&quot; allowfullscreen"
    }
    return '&lt;iframe width=&quot;440&quot; height=&quot;330&quot; ' + fullSreenString + ' src=&quot;' + sURL + '&quot; frameborder=&quot;0&quot;&gt;&lt;/iframe&gt;';
}

String.prototype.plusEncode = function () {
    return encodeURIComponent(this).replace(/\%20/gm, "+");
}




function MenuShareClicked(info, urlShare, urlSlideShow) {
    var share = $('<div id="Share"></div>');
    ShowMainMenuPopup($('#Menu_Share'), info, share);

    var hasSlideShow = false;
    if (urlSlideShow  !==  undefined && urlSlideShow.length > 0) {
        share.data('UrlSlideShow', urlSlideShow);
        hasSlideShow = true;
    }
    share.data('UrlShare', urlShare);
    share.data('UrlSlideShow', urlSlideShow);

    // Share via social networks
    share.append('<h3>' + _locStrings.ShareTitleUrl + '</h3>');
    var shareSocial = $('<div></div>').appendTo(share);

    var mail = $('<img class="ShareSocialImg" src="/images/Community/Views/share-mail-big.png" />').appendTo(shareSocial);
    mail.click(function () {
        HideMainMenuPopup();
        window.location.href = 'mailto:?Subject=' + encodeURIComponent(_locStrings.ShareTitle) + '&Body=' + encodeURIComponent(_locStrings.ShareMessage) + ' %0D%0A%0D%0A' + encodeURIComponent($('#Share').data('UrlShare'));
    });
    mail.mouseenter(function () { $('#ShareSocialText').html(_locStrings.ShareMail); });
    mail.mouseleave(function () { $('#ShareSocialText').html('&nbsp;'); });

    var facebook = $('<img class="ShareSocialImg" src="/images/Community/Views/share-facebook-big.png" />').appendTo(shareSocial);
    facebook.click(function () {
        var win = window.open('https://www.facebook.com/sharer.php?u=' + encodeURIComponent($('#Share').data('UrlShare')) + '&t=' + encodeURIComponent(_locStrings.ShareTitle), 'sl_facebook', 'height=450,width=550');
        if (win != null)
            win.focus();
        HideMainMenuPopup();
    });
    facebook.mouseenter(function () { $('#ShareSocialText').html(_locStrings.ShareFacebook); });
    facebook.mouseleave(function () { $('#ShareSocialText').html('&nbsp;'); });

    var twitter = $('<img class="ShareSocialImg" src="/images/Community/Views/share-twitter-big.png" />').appendTo(shareSocial);
    twitter.click(function () {
        var win = window.open('https://twitter.com/share?url=' + encodeURIComponent($('#Share').data('UrlShare')) + '&text=' + encodeURIComponent(_locStrings.ShareTitle), 'sl_twitter', 'height=450,width=550');
        if (win != null)
            win.focus();
        HideMainMenuPopup();
    });
    twitter.mouseenter(function () { $('#ShareSocialText').html(_locStrings.ShareTwitter); });
    twitter.mouseleave(function () { $('#ShareSocialText').html('&nbsp;'); });

    shareSocial.append('<p id="ShareSocialText">&nbsp;</p>');

    // Copy the link
    share.append('<h3>' + _locStrings.ShareTitleLink + '</h3>');
    var shareLink = $('<div></div>').appendTo(share);
    shareLink.append('<p>' + _locStrings.ShareUrlText + '</p>');
    shareLink.append('<p><input id="ShareUrl" type="text" value="' + share.data('UrlShare') + '" /></p>');

    var shareLinkShorten = $('<span class="CheckBox" id="ShareShortenUrl">' + _locStrings.ShareShortenUrl + '</span>').appendTo(shareLink);
    shareLinkShorten.click(function () {
        var url = $('#Share').data('UrlShare');
        if ($('#ShareUrlSlideShow').length > 0 && $('#ShareUrlSlideShow').hasClass('CheckBox-Checked'))
            url = $('#Share').data('UrlSlideShow');

        if ($(this).hasClass('CheckBox-Checked')) {
            $(this).removeClass('CheckBox-Checked');
            $('#ShareUrl').val(url);
        }
        else {
            SLApp.CommunityService.GetShortUrl(url,
                function (xml) {
                    $('#ShareShortenUrl').addClass('CheckBox-Checked');

                    var url = xml.getElementsByTagName('ShortURL')[0];
                    $('#ShareUrl').val(url.getAttribute('URL'));
                },
                function () {
                });
        }
    });

    if (hasSlideShow) {
        var shareLinkSlideShow = $('<span class="CheckBox" id="ShareUrlSlideShow">' + _locStrings.ShareToSlideShow + '</span>').appendTo(shareLink);
        shareLinkSlideShow.click(function () {
            if ($(this).hasClass('CheckBox-Checked')) {
                $(this).removeClass('CheckBox-Checked');
                if ($('#ShareShortenUrl').hasClass('CheckBox-Checked')) {
                    SLApp.CommunityService.GetShortUrl($('#Share').data('UrlShare'),
                        function (xml) {
                            var url = xml.getElementsByTagName('ShortURL')[0];
                            $('#ShareUrl').val(url.getAttribute('URL'));
                        },
                        function () {
                        });
                }
                else {
                    $('#ShareUrl').val($('#Share').data('UrlShare'));
                }
            }
            else {
                $(this).addClass('CheckBox-Checked');
                if ($('#ShareShortenUrl').hasClass('CheckBox-Checked')) {
                    SLApp.CommunityService.GetShortUrl($('#Share').data('UrlSlideShow'),
                        function (xml) {
                            var url = xml.getElementsByTagName('ShortURL')[0];
                            $('#ShareUrl').val(url.getAttribute('URL'));
                        },
                        function () {
                        });
                }
                else {
                    $('#ShareUrl').val($('#Share').data('UrlSlideShow'));
                }
            }
        });
    }

    shareLink.append('<div class="clf"></div>');

    // Get the embed code
    share.append('<h3>' + _locStrings.ShareTitleEmbed + '</h3>');
    var shareEmbed = $('<div></div>').appendTo(share);
    shareEmbed.append('<p><textarea id="ShareEmbedCode" rows="4"></textarea></p>');

    function setCode(code, extarParam, bSlideShow) {
        $('#ShareEmbedCode').html(GetEmbedCode(code + extarParam, bSlideShow));
    }

    var code = $('#Share').data('UrlShare');
    var searchres = "";
    var IsSearchResult = getQueryParam("so");
    setCode(code, "");
    if (IsSearchResult) {
        var SearchEmbedBtn = $('<span class="CheckBox" id="ShareEmbedSearchOrder" style="float:right">' + _locStrings.SearchOrder + '</span>').appendTo(shareEmbed);
        SearchEmbedBtn.click(function () {
            if ($(this).hasClass('CheckBox-Checked')) {
                $(this).removeClass('CheckBox-Checked');
                searchres = "";
                setCode(code, searchres);
            }
            else {
                $(this).addClass('CheckBox-Checked');
                searchres = "&so=" + IsSearchResult;
                setCode(code, searchres);
            }
        });
    }

    if (hasSlideShow) {
        var shareEmbedBtn = $('<span class="CheckBox" id="ShareEmbedSlideShow">' + _locStrings.ShareToSlideShow + '</span>').appendTo(shareEmbed);
        shareEmbedBtn.click(function () {
            if ($(this).hasClass('CheckBox-Checked')) {
                $(this).removeClass('CheckBox-Checked');
                setCode(code, searchres);
            }
            else {
                $(this).addClass('CheckBox-Checked');
                code = $('#Share').data('UrlSlideShow');
                setCode(code, searchres, true);
            }
        });
    }

    shareEmbed.append('<p id="ShareEmbedText">' + _locStrings.ShareEmbedText + '</p>');
    share.accordion({
        heightStyle: "content"
    });

    /*
    SLApp.CommunityService.GetShortUrl(urlShare + '\n' + urlSlideShow,
    function (xml) {
        var url = xml.getElementsByTagName('ShortURL')[0];

        $('#Share').data('UrlShare', url.getAttribute('URL'));
        $('#Share').data('UrlSlideShow', url.getAttribute('URL1'));

        $('#ShareUrl').val($('#Share').data('UrlShare'));
        $('#ShareEmbedCode').html(GetEmbedCode($('#Share').data('UrlShare')));
    },
    function () {
    });
    */
}

function MenuDownloadClicked() {
    if (countSelectDownload <= 0) {
        var query = self.location.search;
        var text = _locStrings.SelectionDownloadEmpty;
        if (query.indexOf("?i=") < 0 && query.indexOf("&i=") < 0 && query.indexOf("?pg=") < 0 && query.indexOf("&pg=") < 0)
            text += '<br/>' + _locStrings.SelectionDownloadEmpty2;

        var div = $('#Menu_Download');
        if (div.length===0)
            div = $('#BtnDownload');
        ShowMainMenuPopup(div, _locStrings.SelectionDownload, $('<div>' + text + '</div>'));
    }
    else {
        HideMainMenuTooltip();
        HideMainMenuPopup();

        SLApp.DownloadHandler.PrepareFileDownload('&Type=zip&Variables=embed&Copyright=' + downloadWithCopyright + '&l=' + _locStrings.LanguageCode, function (result) {
            DownloadComesFromSelected = true;
            showDownloadInfo(result);
        }, function (err) {
            HideSpinner();
            displayErrorMesssage(err.get_message(), _localized.Error);
        });
    }
}

function BuildMenuDownload(dirID, divName, left) {
    var div = $(divName);
    MenuUserOpenOnHover = divName;
    ShowMainMenuPopup(div, "", $('<ul class="MenuLine"><li id="DnlAll">Download all</li><li id="DnlSel">Download selected</li></ul>'), left);
    if (countSelectDownload <= 0) {
        $('#DnlSel').attr('disabled', 'disabled');
        $('#DnlSel').addClass('MenuLinedisabled');
    }
    else
        $('#DnlSel').removeAttr('disabled');
    $('#DnlAll').click(function () {
        PrepareFileDownload('&Type=zip&Variables=embed&sub=yes&d=' + dirID + '&Copyright=' + downloadWithCopyright + '&l=' + _locStrings.LanguageCode, function (result) {
            showDownloadInfo(result);
        });
    });
    $('#DnlSel').click(function () {
        MenuDownloadClicked();
    });
}

function BuildDetailDownload(div, dirID, id, countS, TopButton) {
    //    var div = $('#Menu_Download');
    MenuUserOpenOnHover = '#Menu_Download';
    if (countS > 0)
        countSelectDownload = countS;
    else
        countS = 0;
    var elem = ShowMainMenuPopup(div, "", $('<ul class="MenuLine"><li id="DnlAll">' + _localized['Download'] + '</li><li id="DnlSel">' + _localized['DownloadSelected'] + '</li></ul>'), TopButton);
    if (countSelectDownload <= 0) {
        $('#DnlSel').attr('disabled', 'disabled');
        $('#DnlSel').addClass('MenuLinedisabled');
    }
    else
        $('#DnlSel').removeAttr('disabled');
    $('#DnlAll').click(function () {
        ShowSpinner();
        SLApp.DownloadHandler.PrepareFileDownload('&Type=zip&Variables=embed&sub=yes&imgID=' + id + '&Copyright=' + downloadWithCopyright + '&l=' + _locStrings.LanguageCode, function (result) {
            showDownloadInfo(result);
        }, function (err) {
            HideSpinner();
            displayErrorMesssage(err.get_message(), _localized.Error);
        });
        //        Show_Download('&Type=zip&Variables=embed&sub=no&i=' + id + '&Copyright=' + downloadWithCopyright + '&l=' + _locStrings.LanguageCode);
    });
    $('#DnlSel').click(function () {
        MenuDownloadClicked();
    });
    return elem;
}

function BuildDetailGeo(div, dirID, id, countS, TopButton) {
    //    var div = $('#Menu_Download');
    MenuUserOpenOnHover = '#Menu_Download';
    if (countS > 0)
        countSelectDownload = countS;
    else
        countS = 0;
    var elem = ShowMainMenuPopup(div, "", $('<ul class="MenuLine"><li id="DnlAll">' + _localized['Geo'] + '</li><li id="DnlSel">' + _localized['GeoSelected'] + '</li></ul>'), TopButton);
    if (countSelectDownload <= 0) {
        $('#DnlSel').attr('disabled', 'disabled');
        $('#DnlSel').addClass('MenuLinedisabled');
    }
    else
        $('#DnlSel').removeAttr('disabled');
    $('#DnlAll').click(function () {
        Show_MapsDlg('img=' + id);
    });
    $('#DnlSel').click(function () {
        Show_MapsDlg('img=selection');
    });
    return elem;
}

function MenuMapClicked() {
    if (mapCount <= 0) {
        ShowMainMenuPopup($('#Menu_Map'), _locStrings.SelectionMap, $('<div>' + _locStrings.SelectionMapEmpty + '</div>'));
    }
    else {
        HideMainMenuTooltip();
        HideMainMenuPopup();
        Show_MapsDlg('l=' + _locStrings.LanguageCode)
    }
}

function ShowMenuUserDropDown() {
    var btn = $('#Menu_User');
    if (btn.length===0)
        return;

    if (urlUserPages==='')
        urlUserPages = '/user/';

    MenuUserDropdownTimer = 0;
    $('#Menu_User_Dropdown').remove();

    var menuDiv = $('<div id="Menu_User_Dropdown"></div>').appendTo('body');
    var menu = $('<ul></ul>').appendTo(menuDiv);

    if (urlUserHome  !==  '')
        menu.append('<li><a id="Menu_Home" href="' + urlUserHome + '">' + _locStrings.Menu_Homepage + '</a></li>');

    menu.append('<li><a id="Menu_ControlPanel" href="' + urlUserPages + '">' + _locStrings.Menu_ControlPanel + '</a></li>');
    menu.append('<li><a id="Menu_UserProfile" href="' + urlUserPages + '?tab=profile">' + _locStrings.Menu_Profile + '</a></li>');
    menu.append('<li><a id="Menu_UserSubscriptions" href="' + urlUserPages + '?tab=subscriptions">' + _locStrings.Menu_Subscriptions + '</a></li>');
    menu.append('<li><a id="Menu_UserLogout" href="' + urlUserPages + '?tab=logout">' + _locStrings.Menu_Logout + '</a></li>');

    $('#Menu_UserLogout').click(function (e) {
        checkUserInfoDeactivate();
    });

    menuDiv.hover(function () {
        if (MenuUserDropdownTimer  !==  0) {
            clearTimeout(MenuUserDropdownTimer);
            MenuUserDropdownTimer = 0;
        }
    },
        function () {
            MenuUserDropdownTimer = setTimeout('HideMenuUserDropDown();', 50);
        });

    if (btn.offset().left + menuDiv.outerWidth() + 5 < $(window).width())
        menuDiv.css('left', btn.offset().left + 'px');
    else
        menuDiv.css('left', (btn.offset().left + btn.outerWidth() - menuDiv.outerWidth()) + 'px');
    menuDiv.css('top', (btn.offset().top + btn.outerHeight()) + 'px');
    menuDiv.fadeIn('fast');
}

function HideMenuUserDropDown() {
    if (MenuUserDropdownTimer  !==  0) {
        clearTimeout(MenuUserDropdownTimer);
        MenuUserDropdownTimer = 0;
        $('#Menu_User_Dropdown').fadeOut('fast');
    }
}

/********************* Select types to be displayed *********************/
function UpdateViewTypes(images, videos, misc) {
    var types = $('.ViewTypes');
    if (types.length===0)
        return;

    var typeIDs = '11111';
    if (self.location.search.indexOf("=") > 0) {
        var parms = unescape(self.location.search).substring(1).split("&");
        for (var i = 0; i < parms.length; i++) {
            parms[i] = parms[i].split("=");
            if (parms[i][0]==='it' && parms[i][1].length >= 4)
                typeIDs = parms[i][1];
        }
    }

    types.html('');
    var items = Array();

    if (parseInt(images) > 0) {
        if (typeIDs[0]==='1')
            items.push($('<li><a href="' + GetViewTypeLink('0', typeIDs[1], typeIDs[2]) + '" class="ViewTypes-Checked">' + _locStrings.ViewImages + ' (' + images + ')</a></li>'));
        else
            items.push($('<li><a href="' + GetViewTypeLink('1', typeIDs[1], typeIDs[2]) + '">' + _locStrings.ViewImages + ' (' + images + ')</a></li>'));
    }
    if (parseInt(videos) > 0) {
        if (typeIDs[1]==='1')
            items.push($('<li><a href="' + GetViewTypeLink(typeIDs[0], '0', typeIDs[2]) + '" class="ViewTypes-Checked">' + _locStrings.ViewVideos + ' (' + videos + ')</a></li>'));
        else
            items.push($('<li><a href="' + GetViewTypeLink(typeIDs[0], '1', typeIDs[2]) + '">' + _locStrings.ViewVideos + ' (' + videos + ')</a></li>'));
    }
    if (parseInt(misc) > 0) {
        if (typeIDs[2]==='1')
            items.push($('<li><a href="' + GetViewTypeLink(typeIDs[0], typeIDs[1], '0') + '" class="ViewTypes-Checked">' + _locStrings.ViewMisc + ' (' + misc + ')</a></li>'));
        else
            items.push($('<li><a href="' + GetViewTypeLink(typeIDs[0], typeIDs[1], '1') + '">' + _locStrings.ViewMisc + ' (' + misc + ')</a></li>'));
    }

    if (items.length > 1) {
        for (var i = 0; i < items.length; i++) {
            types.append(items[i]);
        }
    }
}

function GetViewTypeLink(images, videos, misc) {
    var typeIDs = images + videos + misc + '0';
    var query = '';
    var s = '?';
    if (typeIDs  !==  '11111' && typeIDs  !==  '00000') {
        query += s + 'it=' + typeIDs;
        s = '&';
    }

    if (self.location.search.indexOf("=") > 0) {
        var parms = unescape(self.location.search).substring(1).split("&");
        for (var i = 0; i < parms.length; i++) {
            parms[i] = parms[i].split("=");
            if (parms[i][0]  !==  'it') {
                query += s + parms[i][0] + "=" + encodeURIComponent(parms[i][1]);
                s = '&';
            }
        }
    }

    return window.location.pathname + query;
}

/********************* Select / deselect images *********************/
function UpdateSelectionCount() {
    SLApp.CommunityService.CountSelectedItems(
        function (xml) {
            var sel = xml.getElementsByTagName('Selection')[0];

            countSelectItems = Math.max(parseInt(sel.getAttribute('All')), 0);
            countSelectDownload = Math.max(parseInt(sel.getAttribute('Download')), 0);
            countSelectMap = Math.max(parseInt(sel.getAttribute('Geo')), 0);

            //        $('.BtnDownloadSelected').css('display', countSelectDownload > 0 ? 'inline-block' : 'none');
        },
        function () {
            countSelectItems = 0;
            countSelectDownload = 0;
            countSelectMap = 0;

            //        $('.BtnDownloadSelected').css('display', 'none');
        });
}

function UpdateSelectAllBtn() {
    $('.BtnSelectAll').removeClass('BtnSelectAll-Working');

    var items = $('*[id*=\'SelImg_\']:visible');
    for (var i = 0; i < items.length; i++) {
        if (!$('#' + items[i].id).hasClass('ThumbBtnCheckboxChecked')) {
            $('.BtnSelectAll').removeClass('BtnSelectAll-Checked');
            $('.BtnSelectAll').html(_locStrings.SelectAll);
            return;
        }
    }
    var folders = $('*[id*=\'SelDir_\']:visible');
    for (var i = 0; i < folders.length; i++) {
        if (!$('#' + folders[i].id).hasClass('ThumbBtnCheckboxChecked')) {
            $('.BtnSelectAll').removeClass('BtnSelectAll-Checked');
            $('.BtnSelectAll').html(_locStrings.SelectAll);
            return;
        }
    }
    if ((items.length > 0 || folders.length > 0) && !$('.BtnSelectAll').hasClass('BtnSelectAll-Checked')) {
        $('.BtnSelectAll').addClass('BtnSelectAll-Checked');
        $('.BtnSelectAll').html(_locStrings.DeselectAll);
    }
}

function UpdateSelectFolderBtns(divCheckboxPrefix, flat, queryFT, fileTypes, searchOptions) {
    var items = $('*[id*=\'' + divCheckboxPrefix + '\']:visible');
    var ids = '';

    for (var i = 0; i < items.length; i++) {
        var p = items[i].id.indexOf(divCheckboxPrefix);
        if (p >= 0) {
            ids += items[i].id.substr(p + divCheckboxPrefix.length) + ',';
        }
    }

    if (ids.length > 0) {
        SLApp.CommunityService.GetUnselectedFolderItemCounts(ids, flat, queryFT, fileTypes, searchOptions,
            function (sel) {
                var folders = sel.getElementsByTagName('Folders');
                for (var i = 0; i < folders.length; i++) {
                    var item = '#' + divCheckboxPrefix + folders[i].getAttribute('ID');

                    $(item).removeClass('CheckBox-Working');
                    if (parseInt(folders[i].getAttribute('Unselected'))===0) {
                        if (!$(item).hasClass('ThumbBtnCheckboxChecked'))
                            $(item).addClass('ThumbBtnCheckboxChecked');
                    }
                    else {
                        $(item).removeClass('ThumbBtnCheckboxChecked');
                    }
                }
            },
            function () {
            });
    }
}

function SelectFolder(dirID, divCheckbox) {
    $('#' + divCheckbox).addClass('CheckBox-Working');
    SLApp.CommunityService.SelectFolder(dirID, !$('#' + divCheckbox).hasClass('ThumbBtnCheckboxChecked'),
        function (sel) {
            $('#' + divCheckbox).removeClass('CheckBox-Working');
            if ((parseInt(sel) > 0)  !==  $('#' + divCheckbox).hasClass('ThumbBtnCheckboxChecked'))
                $('#' + divCheckbox).toggleClass('ThumbBtnCheckboxChecked');
            UpdateSelectionCount();
            UpdateSelectAllBtn();
        },
        function () {
            $('#' + divCheckbox).removeClass('CheckBox-Working');
            UpdateSelectionCount();
            UpdateSelectAllBtn();
        });
}

function SelectImage(imgID, divCheckbox) {
    SLApp.CommunityService.SelectImage(imgID, !$('#' + divCheckbox).hasClass('ThumbBtnCheckboxChecked'),
        function (sel) {
            if ((parseInt(sel) > 0)  !==  $('#' + divCheckbox).hasClass('ThumbBtnCheckboxChecked'))
                $('#' + divCheckbox).toggleClass('ThumbBtnCheckboxChecked');
            UpdateSelectionCount();
            UpdateSelectAllBtn();
        },
        function () {
            UpdateSelectionCount();
            UpdateSelectAllBtn();
        });
}

function SelectAndDownloadImage(imgID, divCheckbox) {
    SLApp.CommunityService.SelectImage(imgID, true,
        function (sel) {
            if ((parseInt(sel) > 0)  !==  $('#' + divCheckbox).hasClass('ThumbBtnCheckboxChecked'))
                $('#' + divCheckbox).toggleClass('ThumbBtnCheckboxChecked');
            UpdateSelectionCount();
            UpdateSelectAllBtn();
            SLApp.DownloadHandler.PrepareFileDownload('&Type=zip&Variables=embed&Copyright=' + downloadWithCopyright + '&l=' + _locStrings.LanguageCode, function (result) {
                showDownloadInfo(result);
            }, function (err) {
                HideSpinner();
                displayErrorMesssage(err.get_message(), _localized.Error);
            });
        });
    }

function UnselectAll() {
    SLApp.CommunityService.UnselectAll();
}
function SelectImages(select, includeFolder, idDir, idFlat, typeDisplay, typeFilter, searchOptions) {
    if (idDir != undefined) {
        $('.BtnSelectAll').addClass('BtnSelectAll-Working');

        SLApp.CommunityService.SelectAllImages(select, idDir, idFlat, typeDisplay, typeFilter, searchOptions,
            function (sel) {
                var imgs = sel.getElementsByTagName('Image');
                for (var i = 0; i < imgs.length; i++) {
                    var item = '#SelImg_' + imgs[i].getAttribute('ID');
                    if (select  !==  $(item).hasClass('ThumbBtnCheckboxChecked'))
                        $(item).toggleClass('ThumbBtnCheckboxChecked');
                }
                UpdateSelectionCount();
                UpdateSelectAllBtn();
            },
            function () {
                UpdateSelectionCount();
                UpdateSelectAllBtn();
            });
    }
    else {
        var items = $('*[id*=\'SelImg_\']:visible');
        var idImages = '';

        for (var i = 0; i < items.length; i++) {
            var p = items[i].id.indexOf('SelImg_');
            if (p >= 0) {
                idImages += items[i].id.substr(p + 7) + ',';
            }
        }

        if (idImages.length > 0) {
            SLApp.CommunityService.SelectImages(idImages, select,
                function (sel) {
                    var imgs = sel.getElementsByTagName('Image');
                    for (var i = 0; i < imgs.length; i++) {
                        var item = '#SelImg_' + imgs[i].getAttribute('ID');
                        if (select  !==  $(item).hasClass('ThumbBtnCheckboxChecked'))
                            $(item).toggleClass('ThumbBtnCheckboxCheck ed');
                    }
                    UpdateSelectionCount();
                    UpdateSelectAllBtn();
                },
                function () {
                    UpdateSelectionCount();
                    UpdateSelectAllBtn();
                });
        }
    }

    if (includeFolder === true) {
        var items = $('*[id*=\'SelDir_\']:visible');
        for (var i = 0; i < items.length; i++) {
            var p = items[i].id.indexOf('SelDir_');
            if (p >= 0) {
                var id = parseInt(items[i].id.substr(p + 7));
                if (id > 0 && $('#SelDir_' + id).hasClass('ThumbBtnCheckboxChecked')  !==  select)
                    SelectFolder(id, 'SelDir_' + id);
            }
        }
    }
}
function IsMobileMenu() {
    return $('#MenuHome').hasClass('HomeMenuMobile');
}
function removeMenu() {

    if (IsMobileMenu()) {
        $('#HeaderSearch2').css('display', 'block');
    }
    $('#PlaceHolder').remove();
    $('.SubMenu').css('display', 'none');
    $('.MenuItem').each(function (index, elem) {
        $(elem).removeClass($(elem).data('activeclass'));
    })

    $('.SubItem').removeClass('MenuActive');

    $('#MenuHome').removeClass('HomeMenuMobile');
    $('#MenuItems').css('display', 'none');
}

function SetScrollBarsSize() {
    try {
        var scrollbar = $('#ScrollableContentLayer').data('scroller');
        if (scrollbar) {
            var tp = $('#StartLine').position().top;
            $('#ScrollableContentLayer').height($(window).height() - tp);
            scrollbar.update();
        }
    } catch (err) { };
}

function ClickHandler(ItemName, ActiveClass) {

    if (ItemName   !==  "#NewBtn")
        return;
    

    var inMenu = false;
    var moveTimer = -1;
    if (!ActiveClass)
        ActiveClass = 'MenuActive';
    $(ItemName).data('activeclass', ActiveClass);

    $(ItemName).on('mousemove', function () {
        if (!$(ItemName).data('noHover')) {
            if (moveTimer > -1)
                window.clearTimeout(moveTimer);
            moveTimer = window.setTimeout(function () {
                if (inMenu===true)
                    showMenu();
            }, 200);
        }
    });
/*
    $(ItemName).hover(function () {
        inMenu = true;
        if (!IsMobileMenu()) {
            removeMenu();
        }
    }, function (event) {
        inMenu = false;

        if (event.toElement != null) {
            if (ItemName + '_View'==='#' + event.toElement.id)
                return;
            if ($(ItemName + '_View:has(' + event.toElement.id + ')').length > 0)
                return;
            if (event.toElement.id==="")
                return;
        }
        removeMenu();
    })
*/
    function showMenu()
    {
        if (!IsMobileMenu())
            removeMenu();
        if ($(ItemName).data("close")===true) {
            removeMenu();
        }
        if ($(ItemName + '_View').css('display')==='block') {
            $(ItemName + '_View').css('display', 'none');
            $('#PlaceHolder').remove();
            $(this).removeClass(ActiveClass);
            return;
        }
        $(this).addClass(ActiveClass);
        $(ItemName + '_View').css('display', 'block');
        if (!IsMobileMenu()) {
            var offs = $(ItemName).offset();
            offs.top += $(ItemName).height();
            if (offs.left + $(ItemName + '_View').outerWidth() > $(window).width()) {
                var offset = 0;
                if ($('#ScrollableContent').hasClass('scroll-scrolly_visible'))
                    offset += 16;
                offs.left = $(window).width() - $(ItemName + '_View').outerWidth() - offset;
            }
            $(ItemName + '_View').offset({ left: offs.left, top: offs.top });
        }
        else {
            $('#PlaceHolder').remove();
            $('.SubMenu').css('display', 'none');
            $('.SubItem').removeClass(ActiveClass);
            $(ItemName + '_View').css('display', 'block');
            //                var offs = $('#PlaceHolder').offset();
            var offs = $(ItemName).offset();
            offs.top += $(ItemName).height();
            offs.top -= $(window).scrollTop();
            //                offs.top += $('#PlaceHolder').height();

            $(ItemName).append('<div id="PlaceHolder"></div>')
            $('#PlaceHolder').css({ 'height': $(ItemName + '_View').height(), 'width': '100%' });

            $(ItemName + '_View').offset({ left: offs.left , top: offs.top });
            $(ItemName + '_View').css('z-index', 100);
        }
    }

    $(ItemName).click(function () {
        showMenu();
    });
}

function checkcheckers(classItems) {
    $(classItems).each(function (index, element) {
        if ($(element).data('checked')===true)
            $(element).addClass('checkedon');
        else
            $(element).removeClass('checkedon');
    })
}
function ShowAllSelected(CheckMenu) {
    $('.item').each(function () {
        ShowSelected(this);
    });
    if (!CheckMenu)
        CheckSelectionForMenue();
}
function ShowSelected(item) {
    if ($(item).data("selected")==="1") {
        if ($("#sel_" + $(item).data("id")).length===0)
            $('<div class="SelectedIndicator" id="sel_' + $(item).data("id") + '"><div class="SelectedTriangle"></div><div class="hov-selector ui-icon ui-icon-check SelectedTriangleIcon"></div></div>').appendTo($('#outer_' + $(item).data("id")));

        var minHeight = $('#outer_' + $(item).data("id")).height();
        if ($('#crop_' + $(item).data("id")).length > 0)
            minHeight = Math.min(minHeight, $('#crop_' + $(item).data("id")).height());
        if ($(item).data("scale")< 1)
            $("#sel_" + $(item).data("id")).css('top', minHeight - 31 + 'px');
        else
            $("#sel_" + $(item).data("id")).css('top', minHeight - 31 + (parseInt($('#outer_' + $(item).data("id")).css('margin-top'))*-1) + 'px');
    }
    else
        $("#sel_" + $(item).data("id")).remove();
}
function UnselectAllItems() {
    SLApp.CommunityService.UnselectAll(function () {
        $('.item').each(function () {
            $(this).data('selected', "0");
            ShowSelected(this);
        });
        CheckSelectionForMenue();
    });
}
var grids = [];

var iildrInterval = null;
var InLoad = false;
function LoadImagesOld(gridHolder) {
    $(gridHolder.selector + ' .item').each(function () {
        var waypoints = $(this).waypoint({
            handler: function (direction) {
                var img = $('#tmb_' + $(this).data("id"));
                if (!img.attr("src")) {
                    img.attr("src", $(this).data("imgtmb"));
                }
            }
        })
    });

    return;
    grids.push(gridHolder);
    if (!iildrInterval) {
        iildrInterval = setInterval(function () {
            loadOneGrid(grids);
        }, 3000);
    }
}
var PendingImages = [];

function loadImage(theImg, src) {
    var xhr;
    if (!theImg.data("l_xhr")) {
        xhr = $.ajax(src, {
            success: function (data) {
                theImg.attr('src', src);
                theImg.data("l_xhr", "loadet");
                for (var cbI = 0; cbI < PendingImages.length; cbI++) {
                    if (PendingImages[cbI]===theImg) {
                        PendingImages.slice(cbI, 1);
                        return;
                    }
                }
            }
        });
        theImg.data("l_xhr", xhr);
        PendingImages.push(theImg);
    }
}

var discardinTimer = -1;

function discardPendingImages(AllImgs) {
    $('.dategrid').each(function (index, grid) {
        $('#' + grid.id + ' .item').each(function () {
            var img = $('#tmb_' + $(this).data("id"));
            if (img[0] && !img[0].complete)
                img.attr("src", '');
        })
    });

    return;

    for (var i = 0; i < PendingImages.length; i++) {
        var theImg = PendingImages[i];
        //        if (AllImgs || !inViewport(theImg)) {
        var xhr = theImg.data("l_xhr");
        if (xhr && xhr  !==  "loadet")
            xhr.abort();
        PendingImages.splice(i, 1);
        i--;
        //        }
    }

    if (discardinTimer  !==  -1) {
        clearTimeout(discardinTimer);
        discardinTimer = -1
    }

    discardinTimer = setTimeout(function () {
        for (var i = 0; i < PendingImages.length; i++) {
            var theImg = PendingImages[i];
            if (AllImgs || !inViewport(theImg)) {
                var xhr = theImg.data("l_xhr");
                if (xhr && xhr  !==  "loadet")
                    xhr.abort();
                PendingImages.splice(i, 1);
                i--;
            }
        }
        discardinTimer = -1;
    }, 500);
}

function LoadImages(gridHolder) {
    if (!gridHolder)
        return;
    if (!gridHolder.length)
        return;
    if (NoSourceInImgs===true)
        return;

    $('#' + gridHolder[0].id + ' .item').each(function () {
        var img = $('#tmb_' + $(this).data("id"));
        if (!img.attr("src")) {
            img.attr("src", $(this).data("imgtmb") + '&q=1');
        }
    });
}

function CheckImagesInvViewPort(gridHolder) {


    var Offset = gridHolder.data('checkOffset') || 0;
    var IncreaseOffset = true;

    var grid = gridHolder.children();
    for (var cbI = Offset; cbI < grid.length; cbI++) {
        var elem = grid.eq(cbI);
        if ($(elem).data("id")) {
            if (inViewport($(elem), 1) || cbI < 25 ) {
                var img = $('#tmb_' + $(elem).data("id"));
                if (!img.attr("src") || img.attr("src")  !==  $(elem).data("imgtmb")) {
                    img.one('load', function () {
                        $(this).removeClass('ThumbItemLoading');
                    });
                    img.addClass('ThumbItemLoading');
                    img.attr("src", $(elem).data("imgtmb"));
                }
                if (IncreaseOffset)
                    gridHolder.data('checkOffset', cbI + 1);
            }
            else {
                if (IsInView($(elem), 1) < 0)
                    break;

                IncreaseOffset = false;
            }
        }
    }
}

function binarySearch(ar, el, compare_fn) {
    var m = 0;
    var n = ar.length - 1;
    while (m <= n) {
        var k = (n + m) >> 1;
        var cmp = compare_fn(el, ar[k]);
        if (cmp > 0) {
            m = k + 1;
        } else if (cmp < 0) {
            n = k - 1;
        } else {
            return k;
        }
    }
    return -m - 1;
}

var ChckTimer = -1;
function CheckImgs() {
    if (ChckTimer  !==  -1)
        window.clearTimeout(ChckTimer);
    ChckTimer = window.setTimeout(function () {
        $('.dategrid').each(function (index, grid) {
            if ($(grid).children().length > 0 && inViewport($(grid)))
                var elems = $(grid).hmLayout('getItemElements');
            CheckImagesInvViewPort($(grid));
        });

        ChckTimer = -1;
        if (!MaVas.Bot) {
            if ($('#ScrollableContentLayer').data('scroller'))
                $('#ScrollableContentLayer').data('scroller').update();
        }
    }, 500);
}

function loadOneGrid(grids) {
    if (grids.length === 0)
        return;
    if (!InLoad) {
        InLoad = true;
        gridHolder = grids[0];
        grids.splice(0, 1);
        $(gridHolder.selector + ' .item').each(function () {
            var img = $('#tmb_' + $(this).data("id"));
            if (isScrolledIntoView(img[0])) {
                if (!img.attr("src")) {
                    img.attr("src", $(this).data("imgtmb"));
                }
            }
        });
        $(gridHolder.selector).waitForImages(function () {
            InLoad = false;
        });
    }
}
function parseScript(sInnerHTML) {
    var s = sInnerHTML;

    var scriptTagPattern = /<script[^>]+>((\r|\n|.)*?)<\/script>/gi;
    var scriptCodePattern = /<script[^>]+>((\r|\n|.)*?)<\/script>/mi;

    var tags = s.match(scriptTagPattern);
    var code = "";
    if (tags != null) {
        for (var i = 0; i < tags.length; i++) {
            code += tags[i].match(scriptCodePattern)[1];
        }
    }
    s = s.replace(scriptTagPattern, "");   // js_Code entfernen

    s = s.replace(/(\r|\n)/g, "");         // noch die Zeilenumbrüche entfernen
    s = s.replace(/(\s)(\1{2,})/gi, "$1"); // entstandene Leerzeichen entfernen die überflüssig sind

    return [s, code];
};

function CloseAboutUser() {
    $('#AboutMeDlg').remove();
    RefreshCurrentView(MaVas.IsFlat, MaVas.Type, MaVas.SortFor);
}

function ShowUserInfoDlg(UserID, DirID, History, withCloseBtn) {
    //    reloadContent(true);
    if (!CurrentView)
        CurrentView = jQuery.extend({}, MaVas);
    if (History)
        AddToHistory("UserInfo", "Title", clearLocElements(CurrentView.Album, 'i' + IsListViewAlpha() + "&dir=" + DirID + "&rd=" + MaVas.RootDirId));
    OnChangePage('UserInfo');

    discardPendingImages();
    removeAboutMe();
    $('#AlbumsView').remove();

    var dlg = $('<div id="AboutMeDlg" class="AboutMe"></div>').insertAfter("#AboutMenuPlace"); //appendTo('body');
    $("#DateTimeContainer").remove();
    SLApp.CommunityService.GetUserAndAlbumInfo(CurrentView.RootDirId, CurrentView.Lang, function (code) {
        var script = parseScript(code);
        $(code).appendTo(dlg);
        eval(script[1]);
        $(window).scrollTop(170);
        $('#Website').click(function (e) {
            window.open($(this).data('link'));
            e.preventDefault();
        });
        $('#facebook').click(function (e) {
            window.open("http://www.facebook.com/" + $(this).data('link'));
            e.preventDefault();
        });
        $('#Twitter').click(function (e) {
            window.open("http://www.twitter.com/" + $(this).data('link'));
            e.preventDefault();
        });
        $('#Email').click(function (e) {
            Show_SendPM('l=' + _locStrings.LanguageCode + "&did=" + DirID);
        });
        $('#HomeBookmark').click(function () {
            var title = document.title;
            var url = document.location.href;
            if (window.sidebar) { //firefox bookmark functionality
                window.sidebar.addPanel(title, url, "");
            } else if (window.external) { //ie favorite functionality
                window.external.AddFavorite(url, title);
            } else if (window.opera) {//opera virtual sidebar link
                a = document.createElement("A");
                a.rel = "sidebar";
                a.target = "_search";
                a.title = title;
                a.href = url;
                a.click();
            }
        });
        if (!withCloseBtn)
            $('#AboutViewDlgClose').css('display', 'none');
    })
}

function removeAboutMe() {
    if ($('#AboutMeDlg').length > 0) {
        discardPendingImages(1);
        $('#AboutMeDlg').remove();
        $("#DateTimeContainer").show();
        return true;
    }
    return false;
}
function min(a, b) {
    if (a < b)
        return a;
    return b;
}

function BuildDirectoryElement($grid, dir, w) {
    var dirElem = $('<div id="dg_' + dir.getAttribute('id') + '" class="sqs-gallery-design-autocolumns-slide slide-stretched DirItems"><div id="AI_' + dir.getAttribute('id') + '" class="AlbumsInner"></div></div>').appendTo($grid);
    imges = $('<div class="sqs-gallery-design-autocolumns DimagesHolder" id="di_' + dir.getAttribute('id') + '"></div>').appendTo($('#AI_' + dir.getAttribute('id')));
    $('#di_' + dir.getAttribute('id')).hmLayout({
        itemSelector: '.Dimages'
    });
    var id = parseInt(dir.getAttribute('id'));
    SLApp.UserAndInfoService.GetAlbumImagesForDir(id, 7, function (xml) {
        imgLis = xml.getElementsByTagName('Image');
        if (imgLis != null && imgLis.length > 0) {
            for (var i = 0; i < min(imgLis.length, 4); i++) {
                var img = imgLis[i];
                $('<div class="sqs-gallery-design-autocolumns-slide slide-stretched Dimages"><img width="' + (w - 10) / 2 + 'px" src="/SLOAIMGTMB_' + img.getAttribute('ID') + '_d' + img.getAttribute('dirID') + '_' + img.getAttribute("xt") + '?w=300' + '"/></div>').appendTo($('#di_' + id));
            }
            $('#di_' + dir.getAttribute('id')).hmLayout('reloadItems');
            $('#di_' + dir.getAttribute('id')).waitForImages(function () {
                var w = $('#di_' + dir.getAttribute('id')).width();
                $('#di_' + dir.getAttribute('id') + ' img').each(function (index) {
                    $(this).attr("width", (w / 2) - 4 + 'px');
                })
                $('#di_' + dir.getAttribute('id')).hmLayout('layout');
                $grid.hmLayout('layout');
            });
        }
    });
    $('<div class="AlbumName">' + dir.getAttribute('AlbumName') + '</div>').appendTo($('#AI_' + dir.getAttribute('id')));
    $('<div class="AlbumDesc">' + dir.getAttribute('AlbumDescription') + '</div>').appendTo($('#AI_' + dir.getAttribute('id')));
}
function GetAlbumsGridWidth(gridWidth) {
    var items = 1;
    if (gridWidth > 400)
        items = 2;
    if (gridWidth > 700)
        items = 3;
    if (gridWidth > 1000)
        items = 3;
    if (gridWidth > 1400)
        items = 4;
    if (gridWidth > 1900)
        items = 4;

    var dispWidth = (gridWidth - items * 2) / items;
    return dispWidth;
}
function OnResizeAlbumGrid($gridlst) {
    DisplWidth = GetAlbumsGridWidth($gridlst.width());
    $('.DirItems').each(function (index) {
        $(this).width(DisplWidth);
    })
    $('.Dimages img').each(function (index) {
        $(this).attr("width", (DisplWidth / 2) - 14 + 'px');
    })
    $('.Dimages').each(function () {
        $(this).hmLayout('layout');
    })
    $gridlst.hmLayout('layout');
}

function ShowUserAlbums(ShownUserID, DirID) {
    removeAboutMe();
    HasGeoInView = false;

    $("#DateTimeContainer").hide();
    var dlg = $('<div id="AlbumsView" class="sqs-gallery-design-autocolumns Album"></div>').appendTo('#ScrollableContent');
    SetScrollBarsSize();
    var $gridlst = $('#AlbumsView').hmLayout({
        // options
        itemSelector: '.DirItems'
    });
    var DisplWidth = GetAlbumsGridWidth($(window).width());
    $('.DirItems').css('width', DisplWidth);
    SLApp.UserAndInfoService.CollectChildAlbums(DirID, function (xml) {
        var dirList = xml.getElementsByTagName('Dir');
        if (dirList != null && dirList.length > 0) {
            for (i = 0; i < dirList.length; i++) {
                var dirID = dirList[i].getAttribute('id');
                BuildDirectoryElement($gridlst, dirList[i], DisplWidth);
            }
        }
        $('.DirItems').each(function () {
            $(this).width(DisplWidth);
        });
        $gridlst.hmLayout('reloadItems');
        $gridlst.hmLayout('layout');
    });

    $(window).resize(function () {
        OnResizeAlbumGrid($gridlst);
    })
    OnResizeAlbumGrid($gridlst);
}
function GetGridWidth(gridWidth, View) {
    var margin = parseInt($('.' + View).css('margin-left')) + parseInt($('.' + View).css('margin-right'))+1;
    //   if ($('#ScrollableContent').hasClass('scroll-scrolly_visible'))
    //        gridWidth -= 6;
    var items = 1;
    if (!CurrentView)
        CurrentView = jQuery.extend({}, MaVas);

    if (CurrentView.thumbSize === 'large') {
        if (gridWidth > 420)
            items = 2;
        if (gridWidth > 800)
            items = 3;
        if (gridWidth > 1600)
            items = 4;
        if (gridWidth > 1920)
            items = 5;
        if (gridWidth > 2300)
            items = 6;
        /*    if (gridWidth > 2000)
                items = 9;
            if (gridWidth > 3000)
                items = 10;
        */
    } else {
        items = 2;
        if (gridWidth > 420)
            items = 3;
        if (gridWidth > 700)
            items = 4;
        if (gridWidth > 1000)
            items = 5;
        if (gridWidth > 1400)
            items = 7;
        if (gridWidth > 1900)
            items = 8;
        if (gridWidth > 2000)
            items = 9;
        if (gridWidth > 3000)
            items = 10;
    }
    //    gridWidth -= scrollWasVisible * 16;

    var dispWidth = (gridWidth - (items * margin)) / items;
 /*   while (dispWidth > 452) {
        items++;
        dispWidth = (gridWidth - (items * margin)) / items;
    }
*/
//    dispWidth = Math.floor(dispWidth + 0.1);
    return dispWidth;
}

/*
protected string GetQueryMoreImagesParms()
{
    string sSearchOptions = ((CommunityView)this.Master).GetSearchOptions();
    if (sSearchOptions===null)
        sSearchOptions = "*";

    return string.Format("window.location.search, {0}, MoreImagesOffset, count, {1}, {2}, '{3}', {4}, '{5}', {6},{7}, {8},{9}",
                         GetDirID(),
                         ((CommunityView)this.Master).GetRootDirID(),
                         ((CommunityView)this.Master).GetDisplayFlat() ? ((CommunityView)this.Master).GetFlatDirID() : -1,
                         GetDisplayType(),
                         GetFileTypes(),
                         sSearchOptions,
                         _MaxThumbWidth, _MaxThumbHeight,
                         _MaxHoverWidth, _MaxHoverHeight);
}

*/

function GetPendingBkColor() {
    return GridPendingColors[GridPendingColors.length * Math.random() | 0];
}

function ParseDirXML(xml, $grid, bSameSize, ItemSize, View) {
    var hover = ' data-hov=1 ';
    //    if (!bWithDescriptors)
    hover = ' data-hov=0 ';
    if (MaVas.ListView === true)
        return ParseDirXMLList(xml, $grid, bSameSize, ItemSize, View);
    $grid.data('flexsize', true);

    var info = xml.getElementsByTagName('Info');
    if (!info.length)
        return;
    if (info[0].getAttribute("DisplayTitles") === "False")
        $('#ShowDescriptors').data('showDescriptors', false);
    else
        $('#ShowDescriptors').data('showDescriptors', true);

    var dirList = xml.getElementsByTagName('Dir');
    if (dirList != null && dirList.length > 0) {
        var DisplWidth = GetGridWidth($grid.width(), View);
        var images = "";
        var i = 0;
        var CropTo = 0;
        var loadWidth = getLoadWidth(DisplWidth);

        for (i = 0; i < dirList.length; i++) {
            var dirID = dirList[i].getAttribute('ID');
            var imgID = dirList[i].getAttribute("FirstID");

            var par = '&f=l';
            var croppedHeight = 30;
            var DisplHeight = DisplWidth * 2 / 3;

            var sizeX = DisplWidth;
            var sizeY = DisplHeight;

            if (imgID >= 0) {
                var scale = parseInt(dirList[i].getAttribute("Height")) / parseInt(dirList[i].getAttribute("Width"));
                if (scale > 1)
                    par = '&f=p';

                croppedHeight = dirList[i].getAttribute("Width") * 2 / 3;
                DisplHeight = DisplWidth * scale;

                sizeX = dirList[i].getAttribute("Width");
                sizeY = dirList[i].getAttribute("Height");
            }

            images += '<div class="item sqs-gallery-design-autocolumns-slide slide-stretched ' + View + '" id="id_' + dirID + '" data-id="' + dirID + '" data-type="dir" data-sizex="' + sizeX + '" data-sizey="' + sizeY + '" ' +
                'data-title ="' + replaceInternals(dirList[i].getAttribute('HoverTitle')) + '" ' + 'data-description="' + replaceInternals(dirList[i].getAttribute('HoverDescription')) + '" data-href="' + dirList[i].getAttribute('Link') + '" ' +
                'data-datet ="' + dirList[i].getAttribute('DateTaken') + '" ' + 'data-downl ="' + dirList[i].getAttribute('AllowDownload') + '" ' +
                'data-geo ="' + dirList[i].getAttribute('GPS') + '" ' + 'data-print ="' + dirList[i].getAttribute('AllowPrint') + '" ' +
                'data-protected ="' + dirList[i].getAttribute('Protected') + '" ' +
                'data-selected ="' + dirList[i].getAttribute('Selected') + '" ' +
                'data-imgsrc ="/SLOAIMGTMB_' + imgID + '_d' + dirID + '.jpg?w=' + loadWidth + par + '" ' +
                'data-imgtmb = "/SLOAIMGTMB_' + imgID + '_d' + dirID + '.jpg?w=' + loadWidth + par + '" ' +
                'data-cropsizey = "' + croppedHeight + '"' +
                hover +
                '>';
            if (bSameSize)
                images += '<div class="cropper" id="crop_' + dirID + '" data-descrheight="60"  style="width:100%;height:' + CropTo + 'px"><canvas style="position:absolute" id="canv_' + dirID + '" width="100%" height = "100%"></canvas>';
            images += '<div id="outer_' + dirID + '" class="outerImg" style="height:' + DisplHeight + 'px;background-color:' + (dirList[i].getAttribute('Protected') == 0 ? GetPendingBkColor() : 'rgb(248,248,248)')+'"><a id="lnk_' + dirID + '" >';
            images += '<div><img id="tmb_' + dirID + '" ';
            images += ' width="' + 100 + '%" height="' + 100 + '%"';
            images += ' style="pointer-events:none"';
            images += ' data-id="' + dirID + '"';
            images += ' data-protected="' + dirList[i].getAttribute('Protected') + '" ';
            if (!dirList[i].getAttribute('AltText') || dirList[i].getAttribute('AltText')==='') {
                images += ' class="Thumb ThumbItem';
                if (dirList[i].getAttribute('Ext')  !==  '.jpg')
                    images += ' transI';
                images += '" title="' + replaceInternals(dirList[i].getAttribute('HoverDescription')) + '"';
                images += ' /></div>';
            }
            else {
                images += ' class="Thumb ThumbMedia' + dimentionClass;
                if (dirList[i].getAttribute('Ext')  !==  '.jpg')
                    images += ' transI';
                images += '" title="' + dirList[i].getAttribute('AltText') + '" />';
                images += ' /></div>';
            }
            if (parseInt(dirList[i].getAttribute('Type'))===2)
                images += '<div class="ThumbMediaTitle" style="width:' + (parseInt(dirList[i].getAttribute('Width')) - 12) + 'px">' + dirList[i].getAttribute('AltText') + '</div>';

            images += '</a><div class=\"ThumbButtons\">';

            images += '</div></div> ';
            if (bSameSize)
                images += '</div>';

            var Title = replaceInternals(dirList[i].getAttribute('HoverDescription'));
            var Desc = replaceInternals(dirList[i].getAttribute('HoverTitle'));
            if (Desc === Title)
                Desc = "";
            if (Desc !== "")
                Desc += '</br>';
            Desc += Title;

            images += '<div class="FolderIcon"></div><div class="FolderDescr FolderDescrHeight " id="Descr_' + dirID + '"><span id="DS_' + dirID + '">' + Desc + '</span></div>';
            images += '<div class="DirDescr noDisplay" id="DescrT_' + dirID + '"><span id="DSt_' + dirID + '">' + replaceInternals(dirList[i].getAttribute('HoverTitle')) + '</span></div>';
            images += '</div>';

            if (dirList[i].getAttribute('GPS')  !==  "0")
                mapCount++;
        }
        var $elemts = $(images);
        $grid.append($elemts).hmLayout('appended', $elemts);

        if (!$('#ShowDescriptors').data('checked') || !$('#ShowDescriptors').data('showDescriptors')) {
            $('.FolderDescr').addClass('NoHeight');
            $('.DirDescr').addClass('DisplayInFrame');
            $('.DirDescr').removeClass('noDisplay');

            $('.FolderIcon').addClass('FolderIconDark');
        }

        $grid.hmLayout('layout');
        ShowAllSelected();

        //                itemHS();
        return i;
    }
    return 0;
}


function GetObjectTmbSrc(item, loadWidth, par) {
    switch (parseInt(item.getAttribute("Type"))) {
        case 1:
            return '/SLOAIMGTMB_' + item.getAttribute("ID") + '_' + item.getAttribute("dirID") + '_' + item.getAttribute("Vs") + '.jpg?w=' + loadWidth + par;
        default:
            return '/SLOAIMGTMB_' + item.getAttribute("ID") + '_' + item.getAttribute("dirID") + '_' + item.getAttribute("Vs") + '.jpg?w=' + loadWidth + par;
    }
}


function getGeoIconString(imgID, obj) {
    var images = "";
    if (obj.getAttribute('GPS')==="1") {
        images += '<div class=" GeoSvgframe hovGeoBtn GeoPos" id="Geo_' + imgID + '"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><style>.cls-geo {fill: #fff;z-index:1} .cls-back {fill: rgba(5,5,5,.1)}</style></defs><g id="Ebene_2" data-name="Ebene 2"><g id="_24" data-name="24">';
        images += '<circle class="cls-back" cx="12" cy="12" r="9"></circle>'
        images += '<g><path class="cls-geo" d="M11.54,14.42ZM12,4a8,8,0,1,0,8,8A8,8,0,0,0,12,4Zm5.36,12.46a4.16,4.16,0,0,1-2,2.16l0,0c0,.06,0,.12-.5.27l-.11,0-.12,0a1.7,1.7,0,0,0,.08-1.05c-.28-.15-1.44-.82-1.38-1.12l.1-.12-.05-.08-.06,0a.46.46,0,0,1,.05-.49v0l.11-.19s0-.05,0-.07l.05-.06a5,5,0,0,0-.31-.54v-.07L13,15.09l-.06,0,0,.14.05.06-.07,0a.77.77,0,0,1-.21-.1,5,5,0,0,1-.55-.15.22.22,0,0,1,0-.08.64.64,0,0,0-.3-.24.17.17,0,0,0,0-.07s0,0,0,0a1.31,1.31,0,0,1-.7-.09.42.42,0,0,0-.39-.2.24.24,0,0,1-.1.1c-.11.06-1.49-.25-1.4-.74-.09-.14-.41-.58-.6-.64s0-.14-.1-.21h0a1.79,1.79,0,0,1-.43-.58c-.07-.18-.08-.2-.22-.21a3.32,3.32,0,0,0,.46.85,3.94,3.94,0,0,0,.35.55.21.21,0,0,1,0,.06c-.1-.16-.11-.17-.22-.18a4.78,4.78,0,0,1-.29-.48c-.09,0-.11,0-.16-.13H8l-.93-1.65a9.68,9.68,0,0,1,0-1.94h.07a.3.3,0,0,1,0,.15c0-.12,0-.26,0-.38H7.2c-.09-.69-.09-.69-.07-.72H7.06a1,1,0,0,1,.08-.14h0l-.05.05c.05-.11.15-.2.17-.33A1,1,0,0,1,7.15,8l-.06,0a4.48,4.48,0,0,0,.16-.68l0,.08V7.23l-.07,0c0-.16,0-.16.06-.24H7.12l0-.06,0,0h0v0h0l0-.06h0l0,0,0-.07A1.81,1.81,0,0,1,6.75,7L7,6.74s0,0,0-.07c-.36.23-.46.76-1,.84A5.29,5.29,0,0,0,6.6,7L6.54,7l0-.07L6.52,7l0-.07L6.48,7c.08-.09.15-.2.23-.3l-.07,0c.17-.3.52-.42.71-.71L7.28,6a.65.65,0,0,1,.35-.32l0,.07c.36-.15.58-.52,1-.65l0,.07h0l-.06,0a.75.75,0,0,0,.06.13,1.7,1.7,0,0,0,0,.22c.12,0,.21-.16.35-.18a1.45,1.45,0,0,0-.26.17L9,5.33a1,1,0,0,0-.06.16A.35.35,0,0,1,9,5.39a.19.19,0,0,0,0,.07l.07,0,0,.06h.07l0,.06-.09.13.22,0c0,.07,0,.14,0,.21a.6.6,0,0,1,.06-.22.22.22,0,0,0,.1-.09H9.47a.29.29,0,0,1,.14,0v.08l.06,0,.05.06h0a.85.85,0,0,0,.17-.06l.06,0a.17.17,0,0,1,0-.07l.06,0a.58.58,0,0,1,.05.14c0-.09,0-.09.12-.19a.31.31,0,0,0-.06-.21,1.36,1.36,0,0,1,.1-.21h0a.12.12,0,0,0,.05,0s0,0,.06.23l-.05.06c.06,0,.06,0,.09.19a.26.26,0,0,1,.09-.12c0,.07,0,.14,0,.21h.08a1.31,1.31,0,0,1,.09-.36h.07l.06,0h0s0,0,0,.07l-.06,0a.5.5,0,0,0,.08.12c0,.08,0,.13-.16.13l0,.07-.14,0c0,.13,0,.13-.2.15l.13.09c-.05.15-.22.21-.24.36a1.42,1.42,0,0,0-.22.2.17.17,0,0,1,0,.07c-.06.07-.09.11-.15.43a.47.47,0,0,1,.16,0,2,2,0,0,1,0,.24l.89.19c0,.23.1.52.38.59,0,0,0-.06,0-.08h.08a.19.19,0,0,1,0-.13c-.1-.18-.1-.18-.09-.28a.48.48,0,0,1-.09-.11c.21-.24.21-.24,0-.71.07-.2,0-.39,0-.58l.06,0,.07,0,.06,0,.06,0,.06,0c.24.14.24.14.33.14s.12.21.12.34l.06,0a.39.39,0,0,0,.14,0,1.46,1.46,0,0,1,.1-.34,2.59,2.59,0,0,1,.44.39l0,.08c.25.15.25.15.26.21l.06,0L13,7A.22.22,0,0,1,13.09,7l.05.06L13,7.14l0,.08.1-.15c.2,0,.24.1.27.21l.07,0s0,.1,0,.15l-.82.5c0,.25-.22.42-.26.67.2-.17.19-.6.56-.55l0,.06a1.22,1.22,0,0,1-.15.17.3.3,0,0,0,.16,0c0,.35.31.29.44.27l.06,0s0,0-.14.18h-.08c-.07.21-.07.21-.16.25s0,0,0-.36c0,0,0,0-.28.24a.29.29,0,0,1-.12.07s0,0,0,.08c-.24.19-.08.35,0,.45-.12.11-.31.1-.41.24a1.65,1.65,0,0,1,0,.55c-.07-.17-.07-.17-.12-.2a.2.2,0,0,0,0-.13.68.68,0,0,0,0,.15.31.31,0,0,1-.11.09l.14.06,0,.09,0,.06c.09.07.15.11.15.25,0,.38-.44.51-.5.85s.41.68.32,1.1a.38.38,0,0,1-.12-.1h0c-.37-.58-.37-.58-.45-.65H11.5l0,.06a2.63,2.63,0,0,0-.65,0l0,.07h.07a.61.61,0,0,1,.07.14l-.07,0c-.07.05-.07.05-.26,0-.19.14-.46.15-.59.38,0,0-.07,2,1.09,1.5l0-.07c.1-.11,0-.26,0-.36a.6.6,0,0,1,.39-.15l.05.06c0,.07,0,.07,0,.44l-.07,0a.75.75,0,0,1,0,.4h.05l0,0,.05-.06c.18,0,.35-.18.54,0s.08.41.14.61c0,0,.32.56.6.13h.23a.73.73,0,0,0,.18.14.87.87,0,0,1,.15-.5l.06,0v-.08c.19-.1.21-.15.22-.22l.08,0a.39.39,0,0,1,0,.14c.09.1.08.13,0,.23a.32.32,0,0,0,.1.1l0-.07a.26.26,0,0,0-.08-.13.25.25,0,0,1,.42-.12l.21-.09a.42.42,0,0,0,.14.06c.3-.18.3-.18.32-.18s0,0,0,.07l.06.07a.32.32,0,0,1,.14,0,.36.36,0,0,1,0,.15c.24,0,.3-.05.4.13.08,0,.1,0,.18.13a.55.55,0,0,1,.33-.14c.12,0,.19.1.29.15h0c0,.12.12.2.16.32a1.73,1.73,0,0,0-.23.41l.13-.1,0,.07c.19-.08.19-.08.26-.25a.42.42,0,0,1,.16,0h0l.15,0,0,.07a.33.33,0,0,1,0,.06c.17-.26.38-.16.77,0a1.08,1.08,0,0,1,0,.18A2.48,2.48,0,0,1,17.37,16.46Z" /></g></g></g></svg></div>'
        HasGeoInView = true;
    }
    return images;
}

function ParseImgXML(xml, $grid, bBreakOnDate, View, bSameSize, bWithDescriptors, DontCalcMaxTextHeight, OffsetL) {
    if (MaVas.ListView===true)
        return ParseImgXMLList(xml, $grid, bBreakOnDate, View, bSameSize, bWithDescriptors, DontCalcMaxTextHeight);
    $grid.data('flexsize', true);
    var info = xml.getElementsByTagName('Info');
    if (!info.length)
        return 0;

    if (info[0].getAttribute("DisplayTitles") === "False")
        $('#ShowDescriptors').data('showDescriptors', false);
    else
        $('#ShowDescriptors').data('showDescriptors', true);

    var ItemsInView = parseInt(info[0].getAttribute('Items'));
    var imgList = xml.getElementsByTagName('Image');
    var hover = ' data-hov=2 ';



    if (!bWithDescriptors)
        hover = ' data-hov=1 ';
    if (imgList != null && imgList.length > 0) {
        var DisplWidth = GetGridWidth($grid.width(), View);
        var images = "";
        var i = 0;
        var CropTo = 0;
        var tmbSize = thumbSize;
        var loadWidth = getLoadWidth(DisplWidth);
        var $firstEntry = $('#' + $grid[0].id + ' .item').first();

        if ($firstEntry.length > 0 && typeof $firstEntry.data('DateInserted') !== "undefined") {
            DateLastInserted = $firstEntry.data('DateInserted'); 
            DateLastTaken = $firstEntry.data('DateTaken');
        } else {
            DateLastInserted = imgList[0].getAttribute('RAWDateInserted');
            DateLastTaken = imgList[0].getAttribute('RAWDateTaken');
        }
        for (i = 0; i < imgList.length; i++) {
            var imgID = imgList[i].getAttribute('ID');
            var tmbSize = thumbSize;
            var scale = parseInt(imgList[i].getAttribute("OrigHeight")) / parseInt(imgList[i].getAttribute("OrigWidth"));
            if (bBreakOnDate) {
                if (SortField==='DateInserted') {
                    if (DateLastInserted  !==  imgList[i].getAttribute('RAWDateInserted'))
                        break;
                } else {
                    if (DateLastTaken  !==  imgList[i].getAttribute('RAWDateTaken'))
                        break;
                }
            }
            var twidth = parseInt(imgList[i].getAttribute('Width'));

            var loadHeight = Math.floor(loadWidth * scale);
            var par = '&f=l';
            if (scale > 1) {
//                loadWidth = loadWidth * scale;
                par = '&f=p';
            }
            var croppedHeight = imgList[i].getAttribute("OrigWidth") * 2 / 3;

            var DisplHeight = DisplWidth * scale;

            images += '<div class="item sqs-gallery-design-autocolumns-slide slide-stretched ' + View + '" id="id_' + imgID +
                '"data-type="img" data-id="' + imgID +
                '" data-sizex="' + imgList[i].getAttribute("OrigWidth") +
                '" data-sizey="' + imgList[i].getAttribute("OrigHeight") + '" ' +
                'data-title ="' + imgList[i].getAttribute('HoverTitle') + '" ' +
                'data-description="' + imgList[i].getAttribute('HoverDescription') +
                '" data-href="' + imgList[i].getAttribute('Link') + '" ' +
                'data-datet ="' + imgList[i].getAttribute('DateTaken') + '" ' +
                'data-print ="' + imgList[i].getAttribute('AllowPrint') + '" ' +
                'data-downl ="' + imgList[i].getAttribute('AllowDownload') + '" ' +
                'data-geo ="' + imgList[i].getAttribute('GPS') + '" ' +
                'data-protected ="' + imgList[i].getAttribute('Protected') + '" ' +
                'data-selected ="' + imgList[i].getAttribute('Selected') + '" ' +

                'data-imgsrc = "' + GetObjectSrc(imgList[i], loadWidth, par) + '" ' +
                'data-imgtmb = "' + GetObjectTmbSrc(imgList[i], loadWidth, par) + '" ' +
                //
                'data-itype = "' + imgList[i].getAttribute("Type") + '" ' +
                'data-ext = "' + imgList[i].getAttribute("Ext") + '" ' +
                'data-DateInserted = "' + imgList[i].getAttribute('RAWDateInserted') + '" ' +
                'data-DateTaken = "' + imgList[i].getAttribute('RAWDateTaken') + '" ' +

                'data-cropsizey = "' + croppedHeight + '" ' +
                'data-grid = "#' + $grid.get(0).id + '"' +
                'data-scale = "' + scale + '" ' +
                'data-hotx = "' + imgList[i].getAttribute('HotSpotX') + '" ' +
                'data-hoty = "' + imgList[i].getAttribute('HotSpotY') + '" ' +
                'data-view = "' + View + '" ' +
                'data-index = "' + imgList[i].getAttribute('Index') + '" ' +
                'data-dir = "' + imgList[i].getAttribute('dirID') + '" ' +
                'data-sameSize ="' + bSameSize + '" ' +
                'data-itemsInView ="' + ItemsInView + '" ' +
                'data-version = "' + imgList[i].getAttribute('Vs') + '" ' +

                hover +
                '>';
            var DescHeight = "";
            if (bWithDescriptors && !DontCalcMaxTextHeight)
                DescHeight = 'data-descrheight="60"'
            var alignfif = "fif";
            if (bSameSize) {
                images += '<div class="cropper" id="crop_' + imgID + '"' + DescHeight + ' style="width:100%;height:' + CropTo + 'px"><canvas style="position:absolute" id="canv_' + imgID + '" width="100%" height = "100%"></canvas>';
                alignfif = "";
            }

            var lnk = ' href="?i=' + imgID + '" ';
            var topMargin = 0;
            images += '<div id="outer_' + imgID + '" class="outerImg ' + alignfif + '" style="height:' + parseInt(DisplHeight) + 'px;background-color:' + GetPendingBkColor() +'"><a id="lnk_' + imgID + '"'+ lnk +'>';
            //            images += '<div class="debugInfo">'+imgID + '</div>'

            switch (imgList[i].getAttribute("Type")) {
/*
 case "1":

                    images += '<video class="tmbVids" id="vid_' + imgID + '" poster="/MCIMG_' + imgID + '_' + loadWidth + '_' + loadWidth + imgList[i].getAttribute('Ext') + '.jpg" width="100%" height="100%" title="' + imgList[i].getAttribute('AltText') + '">' +
                        '<source src="/SLVID_' + imgID + '.m4v" type="video/mp4" /></video>';
                    break;
*/
                default:
                    images += '<div><img id="tmb_' + imgID + '"';
                    images += ' name="tmb_' + imgID + '"';

                    images += ' data-id="' + imgID + '"';
                    if (NoSourceInImgs)
                        images += ' src="/images/Community/tp.gif"';
                    else
                        images += ' src="/SLOAIMGTMB_' + imgID + '_' + imgList[i].getAttribute("dirID") + '.jpg?w=' + loadWidth + par + '&q=1" ';
                    images += ' style="pointer-events:none"';

                    if (imgList[i].getAttribute('AltText')==='') {
                        images += ' class="Thumb ThumbItem';
                        if (imgList[i].getAttribute('Ext')  !==  '.jpg')
                            images += ' transI';
                        images += '" title=""';
                        images += ' /></div>';
                    }
                    else {
                        images += ' class="Thumb ThumbMedia' + dimentionClass;
                        if (imgList[i].getAttribute('Ext')  !==  '.jpg')
                            images += ' transI';
                        images += '" title="' + imgList[i].getAttribute('AltText') + '" /></div>';

                        if (parseInt(imgList[i].getAttribute('Type'))===2)
                            images += '<div class="ThumbMediaTitle" style="width:' + (parseInt(imgList[i].getAttribute('Width')) - 12) + 'px">' + imgList[i].getAttribute('AltText') + '</div>';
                    }
            }
            images += '</a><div class=\"ThumbButtons\"></div> ';
            switch (imgList[i].getAttribute("Type")) {
                case "1":
                    images += '<div class="VideoIcon" id="VidIco_' + imgID + '">' +
                        '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"> <circle style="fill:#DC0811;" cx="256" cy="256" r="256" /> <polygon style="fill:#FFFFFF;" points="193.93,148.48 380.16,256 193.93,363.52 " /></svg>' +
                        '</div> ';
                    break;
                case "2":
                    break;
                case "3":
                    images += '<div class="SoundPlayShow" data-id="' + imgID + '">' +
                        '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"> <circle class="SoundPlayButton" cx="256" cy="256" r="256" /> <polygon style="fill:#FFFFFF;" points="193.93,148.48 380.16,256 193.93,363.52 " /></svg>' +
                        '</div> ';
                    break;
                default:
                    break;
            }
            images += getGeoIconString(imgID, imgList[i]);
            images += '</div>';
            if (bSameSize)
                images += '</div>'

            var Title = imgList[i].getAttribute('HoverDescription');
            var Desc = imgList[i].getAttribute('HoverTitle');
            if (Desc===Title)
                Desc = "";
            if (Desc  !==  "")
                Desc += '</br>'
            Desc += Title;
            if (!DontCalcMaxTextHeight && bWithDescriptors) {
                images += '<div class="FolderDescr" id="Descr_' + imgID + '"><span id="DS_' + imgID + '">' + Desc + '</span></div>'
            }
            else {
                if (bWithDescriptors)
                    images += '<div class="FolderDescr FolderDescrHeight" id="Descr_' + imgID + '"><span id="DS_' + imgID + '">' + Desc + '</span></div>'
            }

            images += '</div> ';

            if (imgList[i].getAttribute('GPS')  !==  "0")
                mapCount++;
            if (i  !==  0 && i % 100===0) {
                images += "##Breaker##";
            }
        }
        var theImages = images.split("##Breaker##");
        if (OffsetL === 0) {
            var $elemts = $(theImages[0]);
            $($elemts).appendTo($grid);

            $grid.hmLayout('reloadItems');
            if (theImages.length > 1)
                loadNextImgsIntoGrid($grid, theImages, 1, View);
        }
        else {
            //$grid.hmLayout('appended');
            loadNextImgsIntoGrid($grid, theImages, 0, View);
        }

        var DisplWidth = GetGridWidth($grid.width(), View);
        $('.FolderDescr').width(DisplWidth - 8);

        if (!$('#ShowDescriptors').data('checked') || !$('#ShowDescriptors').data('showDescriptors')) {
            $('.FolderDescr').addClass('NoHeight');
            $('.DirDescr').addClass('DisplayInFrame');
            $('.FolderIcon').addClass('FolderIconDark');
        }
        $grid.hmLayout('layout');
        ShowAllSelected(OffsetL);
        updateSoundPlay();
        return i;
    }
    return 0;
}
function ParseDirXMLList(xml, $grid, bSameSize, ItemSize, View) {
    var hover = ' data-hov=1 ';
    //    if (!bWithDescriptors)
    hover = ' data-hov=0 ';
    $grid.data('flexsize', false);
    var info = xml.getElementsByTagName('Info');
    if (!info.length)
        return 0;



    var dirList = xml.getElementsByTagName('Dir');
    if (dirList  !==  null && dirList.length > 0) {
        var DisplWidth = GetGridWidth($grid.width(), View);
        var images = "";
        var i = 0;
        var CropTo = 0;

        for (i = 0; i < dirList.length; i++) {
            var dirID = dirList[i].getAttribute('ID');
            var tmbSize = thumbSize;
            var imgID = dirList[i].getAttribute("FirstID");
            var scale = parseInt(dirList[i].getAttribute("Height")) / parseInt(dirList[i].getAttribute("Width"));
            var twidth = parseInt(dirList[i].getAttribute('Width'));

            var loadWidth = Math.min(tmbSize, 300);
            var loadHeight = Math.floor(loadWidth * scale);
            var par = '&f=l';
            if (scale > 1) {
                loadWidth = loadWidth * scale;
                par = '&f=p';
            }
            var croppedHeight = dirList[i].getAttribute("Width") * 2 / 3;

            var DisplHeight = DisplWidth * scale;

            images += '<div class="item list ' + View + '" id="id_' + dirID + '" data-id="' + dirID + '" data-type="dir" data-sizex="' + dirList[i].getAttribute("Width") + '" data-sizey="' + dirList[i].getAttribute("Height") + '" ' +
                'data-title ="' + replaceInternals(dirList[i].getAttribute('HoverTitle')) + '" ' + 'data-description="' + replaceInternals(dirList[i].getAttribute('HoverDescription')) + '" data-href="' + dirList[i].getAttribute('Link') + '" ' +
                'data-datet ="' + dirList[i].getAttribute('DateTaken') + '" ' + 'data-downl ="' + dirList[i].getAttribute('AllowDownload') + '" ' +
                'data-geo ="' + dirList[i].getAttribute('GPS') + '" ' + 'data-print ="' + dirList[i].getAttribute('AllowPrint') + '" ' +
                'data-protected ="' + dirList[i].getAttribute('Protected') + '" ' +
                'data-selected ="' + dirList[i].getAttribute('Selected') + '" ' +
                'data-imgsrc = "/SLOAIMGTMB_' + imgID + '_d' + dirID + '.jpg?w=' + loadWidth + par + '" ' +
                'data-imgtmb = "/SLOAIMGTMB_' + imgID + '_d' + dirID + '.jpg?w=' + loadWidth + par + '" ' +
                'data-cropsizey = "' + croppedHeight + '"' +
                
                hover +
                '>';
            var DescHeight = "";
            DescHeight = 'data-descrheight="60"'
            var alignfif = "fif";

            if (bSameSize) {
                images += '<div class="cropper fif" id="crop_' + dirID + '" data-descrheight="60"  style="width:100%;height:' + CropTo + 'px">';
                alignfif = "";
            }
            images += '<div id="outer_' + dirID + '" class="outerImg ' + alignfif + '" style="height:' + DisplHeight + 'px;background-color:' + GetPendingBkColor() +'"><a id="lnk_' + imgID + '" >';
            images += '<div><img id="tmb_' + dirID + '"';
            images += ' src="/images/Community/tp.gif"';
            images += ' style="pointer-events:none"';
            images += ' data-id="' + dirID + '"';

            if (!dirList[i].getAttribute('AltText') || dirList[i].getAttribute('AltText')==='') {
                images += ' class="ThumbList' + (scale > 1 ? 'P' : '') + ' ThumbItem';
                if (dirList[i].getAttribute('Ext')  !==  '.jpg')
                    images += ' transI';
                images += '" title="' + replaceInternals(dirList[i].getAttribute('HoverDescription')) + '"';
                images += ' /></div>';
            }
            else {
                images += ' class="ThumbList' + (scale > 1 ? 'P' : '') + ' ThumbMedia' + dimentionClass;
                if (dirList[i].getAttribute('Ext')  !==  '.jpg')
                    images += ' transI';
                images += '" title="' + dirList[i].getAttribute('AltText') + '" /></div>';
            }
            if (parseInt(dirList[i].getAttribute('Type'))===2)
                images += '<div class="ThumbMediaTitle" style="width:' + (parseInt(dirList[i].getAttribute('Width')) - 12) + 'px">' + dirList[i].getAttribute('AltText') + '</div>';

            images += '</a><div class=\"ThumbButtons\">';

            images += '</div></div> ';
            if (bSameSize)
                images += '</div>'

            images += '<div class="FolderIcon"></div>'
            images += '<div class="FolderDescrList fif" id="DescrL_' + imgID + '" >'
            var Title = replaceInternals(dirList[i].getAttribute('HoverDescription'));
            var Desc = replaceInternals(dirList[i].getAttribute('HoverTitle'));
            if (Desc===Title)
                Desc = "";
            if (Desc  !==  "")
                Desc += '</br>'
            Desc += Title;
            images += '<div class="dirDesc" id= "DS_' + dirID + '" > ' + Desc + '</div>';
            images += '<div class="DirDescriptorContainer">'
            if (parseInt(dirList[i].getAttribute('AllImages')) > 0)
                images += '<div id= "DSii_' + dirID + '" >' + _localized.images + dirList[i].getAttribute('AllImages') + '</div>';
            if (parseInt(dirList[i].getAttribute('AllVideos')) > 0)
                images += '<div id= "DSiiv0_' + dirID + '" >' + _localized.videos + dirList[i].getAttribute('AllVideos') + '</div>';
            if (parseInt(dirList[i].getAttribute('AllAssets')) > 0)
                images += '<div id= "DSiiv0_' + dirID + '" >' + _localized.documents + dirList[i].getAttribute('AllAssets') + '</div>';

            if (parseInt(dirList[i].getAttribute('Subfolders')) > 0)
                images += '<div id= "DSis_' + dirID + '" >' + _localized.subfolder + dirList[i].getAttribute('Subfolders') + '</div>';
            images += '</div>'
            images += '</div> '; // FolderDescrList

            images += '</div>';

            if (dirList[i].getAttribute('GPS')  !==  "0")
                mapCount++;
        }
        var $elemts = $(images);
        $grid.append($elemts).hmLayout('appended', $elemts);

        //$grid.hmLayout('layout');
        //ShowAllSelected();
        $grid.hmLayout('layout');
        ShowAllSelected();
        return i;
    }

    return 0;
}

function ParseImgXMLList(xml, $grid, bBreakOnDate, View, bSameSize, bWithDescriptors, DontCalcMaxTextHeight) {
    $grid.data('flexsize', false);
    var imgList = xml.getElementsByTagName('Image');
    var hover = ' data-hov=2 ';
    if (!bWithDescriptors)
        hover = ' data-hov=1 ';

    var info = xml.getElementsByTagName('Info');
    var ItemsInView = parseInt(info[0].getAttribute('Items'));

    if (imgList != null && imgList.length > 0) {
        var DisplWidth = GetGridWidth($grid.width(), View);

        var images = "";
        var i = 0;
        var CropTo = 0;
        DateLastInserted = imgList[0].getAttribute('RAWDateInserted');
        DateLastTaken = imgList[0].getAttribute('RAWDateTaken');
        for (i = 0; i < imgList.length; i++) {
            var imgID = imgList[i].getAttribute('ID');
            var tmbSize = thumbSize;
            var scale = parseInt(imgList[i].getAttribute("OrigHeight")) / parseInt(imgList[i].getAttribute("OrigWidth"));
            if (bBreakOnDate) {
                if (SortField==='DateInserted') {
                    if (DateLastInserted  !==  imgList[i].getAttribute('RAWDateInserted'))
                        break;
                } else {
                    if (DateLastTaken  !==  imgList[i].getAttribute('RAWDateTaken'))
                        break;
                }
            }
            var twidth = parseInt(imgList[i].getAttribute('Width'));
            var loadWidth = Math.min(tmbSize, 400);
            var loadHeight = Math.floor(loadWidth * scale);
            var par = '&f=l';
            if (scale > 1) {
                loadWidth = loadWidth * scale;
                par = '&f=p';
            }
            var croppedHeight = imgList[i].getAttribute("OrigWidth") * 2 / 3;

            var DisplHeight = DisplWidth * scale;

            images += '<div class="item list ' + View + '" id="id_' + imgID + '" data-id="' + imgID + '" data-type="img" data-sizex="' + imgList[i].getAttribute("OrigWidth") + '" data-sizey="' + imgList[i].getAttribute("OrigHeight") + '" ' +
                'data-title ="' + imgList[i].getAttribute('HoverTitle') + '" ' + 'data-description="' + imgList[i].getAttribute('HoverDescription') +
                '" data-href="' + imgList[i].getAttribute('Link') + '" ' +
                'data-datet ="' + imgList[i].getAttribute('DateTaken') + '" ' + 'data-downl ="' + imgList[i].getAttribute('AllowDownload') + '" ' +
                'data-geo ="' + imgList[i].getAttribute('GPS') + '" ' + 'data-print ="' + imgList[i].getAttribute('AllowPrint') + '" ' +
                'data-protected ="' + imgList[i].getAttribute('Protected') + '" ' +
                'data-selected ="' + imgList[i].getAttribute('Selected') + '" ' +
                'data-imgsrc = "' + GetObjectSrc(imgList[i], loadWidth, par) + '" ' +
                'data-imgtmb =  "' + GetObjectTmbSrc(imgList[i], loadWidth, par) + '" ' +
                'data-cropsizey = "' + croppedHeight + '" ' +
                'data-grid = "#' + $grid.get(0).id + '"' +
                'data-scale = "' + scale + '" ' +
                'data-hotx = "' + imgList[i].getAttribute('HotSpotX') + '" ' +
                'data-hoty = "' + imgList[i].getAttribute('HotSpotY') + '" ' +
                'data-DateInserted = "' + imgList[i].getAttribute('RAWDateInserted') + '" ' +
                'data-DateTaken = "' + imgList[i].getAttribute('RAWDateTaken') + '" ' +
                'data-view = "' + View + '" ' +
                'data-index = "' + imgList[i].getAttribute('Index') + '" ' +
                'data-dir = "' + imgList[i].getAttribute('dirID') + '" ' +
                'data-version = "' + imgList[i].getAttribute('Vs') + '" ' +
                'data-ext = "' + imgList[i].getAttribute('Ext') + '" ' +
                'data-itype = "' + imgList[i].getAttribute("Type") + '" ' +
                'data-itemsInView ="' + ItemsInView + '" ' +
                'data-islist = "true" ' +
                hover +
                '>';
            var DescHeight = "";
            if (bWithDescriptors && !DontCalcMaxTextHeight)
                DescHeight = 'data-descrheight="60"'
            var alignfif = "fif";
            if (bSameSize) {
                images += '<div class="cropper fif" id="crop_' + imgID + '"' + DescHeight + ' style="width:100%;height:' + CropTo + 'px">';
                alignfif = "";
            }
            var lnk = ' href="?i=' + imgID + '" ';
            images += '<div id="outer_' + imgID + '" class="outerImg ' + alignfif + '" style="height:' + DisplHeight + 'px;background-color:' + GetPendingBkColor() +'"><a id="lnk_' + imgID + '"' + lnk + '>';
            //            images += '<div class="debugInfo">'+imgID + '</div>'
            images += '<div><img id="tmb_' + imgID + '" ';
            images += ' name="tmb_' + imgID + '" ';
            images += ' src="' + GetObjectSrc(imgList[i], loadWidth, par + '&q=1') + '" ';

            images += ' data-id="' + imgID + '"';
            images += ' style="pointer-events:none"';
            if (imgList[i].getAttribute('AltText')==='') {
                images += ' class="ThumbList' + (scale > 1 ? 'P' : '') + ' ThumbItem';
                if (imgList[i].getAttribute('Ext')  !==  '.jpg')
                    images += ' transI';
                images += '" title=""';
                images += ' /></div>';
            }
            else {
                images += ' class="ThumbList' + (scale > 1 ? 'P' : '') + ' ThumbMedia' + dimentionClass;
                if (imgList[i].getAttribute('Ext')  !==  '.jpg')
                    images += ' transI';
                images += '" title="' + imgList[i].getAttribute('AltText') + '" /></div>';

                if (parseInt(imgList[i].getAttribute('Type'))===2)
                    images += '<div class="ThumbMediaTitle" style="width:' + (parseInt(imgList[i].getAttribute('Width')) - 12) + 'px">' + imgList[i].getAttribute('AltText') + '</div>';
            }

            images += '</a><div class=\"ThumbButtons\"></div> ';

            switch (imgList[i].getAttribute("Type")) {
                case "1":
                    images += '<div class="VideoIcon" id="VidIco_' + imgID + '">' +
                        '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"> <circle style="fill:#DC0811;" cx="256" cy="256" r="256" /> <polygon style="fill:#FFFFFF;" points="193.93,148.48 380.16,256 193.93,363.52 " /></svg>' +
                        '</div > ';
                    break;
                case "2":
                    break;
                case "3":
                    images += '<div class="SoundPlayShow" data-id="' + imgID + '">' +
                        '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"> <circle class="SoundPlayButton" cx="256" cy="256" r="256" /> <polygon style="fill:#FFFFFF;" points="193.93,148.48 380.16,256 193.93,363.52 " /></svg>' +
                        '</div> ';
                    break;
                default:
                    break;
            }

            images += '</div>';
            if (bSameSize)
                images += '</div>'

            var Title = imgList[i].getAttribute('HoverDescription');
            var Desc = imgList[i].getAttribute('HoverTitle');
            if (Desc===Title)
                Desc = "";
            if (Desc  !==  "")
                Desc += '</br>'
            Desc += Title;

            images += '<div class="FolderDescrList fif" id="DescrL_' + imgID + '" >'

            var descTypes = getQueryVariable('desc');
            if (descTypes === -1) {
                descTypes = null;
            }
            else if (descTypes === 'off') {
                descTypes = [];
            }
            else {
                descTypes = descTypes.split('+');
            }
            if (descTypes === null) {
                descTypes = 'dkc';
            }

            if (descTypes == 'all' || descTypes.indexOf('d') >= 0)
                images += '<div id= "DS_' + imgID + '" > ' + Desc + '</div>';

            if (descTypes == 'all' || descTypes.indexOf('k') >= 0) {
                var Keywords = parseInt(imgList[i].getAttribute('Keywords'));
                if (Keywords > 0) {
                    var KeyText = '';

                    for (var cbI = 0; cbI < Keywords; cbI++) {
                        if (cbI)
                            KeyText += " - ";
                        KeyText += '<a href="javascript:DoSearch(\'' + imgList[i].getAttribute('Keyword.' + cbI) + '\')">' + imgList[i].getAttribute('Keyword.' + cbI) + '</a>';
                    }
                    images += '<div id= "DSkwd_' + imgID + '" > ' + KeyText + '</div>';
                }
            }

            if (descTypes == 'all' || descTypes.indexOf('c') >= 0) {
                var CopyRight = imgList[i].getAttribute('Copyright');
                if (CopyRight && CopyRight.length > 0) {
                    Desc = _localized["copyright"] + ' ' + CopyRight;
                    images += '<div id= "DScpr_' + imgID + '" ><div class="halfline"></div>' + Desc + '<div class="halfline"></div></div>';
                }
            }
            if (descTypes == 'all' || descTypes.indexOf('j') >= 0) {
                var jobID = imgList[i].getAttribute('JobId');
                if (jobID && jobID.length > 0) {
                    Desc = "JobId:" + ' ' + jobID;
                    images += '<div id= "DScpr_' + imgID + '" ><div class="halfline"></div>' + Desc + '<div class="halfline"></div></div>';
                }
            }
            var DateTaken = imgList[i].getAttribute('RAWDateTaken');
            if (DateTaken && DateTaken.length) {
                var d = imgList[i].getAttribute('RAWDateTaken').split('/');
                DateTaken = FormatDate(new Date(d[2], d[0] - 1, d[1]), _localized['DateFormatLong']);
            }
            var DateInserted = imgList[i].getAttribute('RAWDateInserted');
            if (DateInserted && DateInserted.length) {
                var d = imgList[i].getAttribute('RAWDateInserted').split('/');
                DateInserted = FormatDate(new Date(d[2], d[0] - 1, d[1]), _localized['DateFormatLong']);
            }

            if (descTypes == 'all' || descTypes.indexOf('dt') >= 0) {
                if (DateTaken && DateTaken.length) {
                    Desc = _localized["DateTaken"] + ': ' + DateTaken;
                    if (DateInserted && DateInserted.length === 0) {
                        Desc += '<div class="halfline"></div>';
                    }
                    images += '<div id= "DSdpr_' + imgID + '" ><div class="halfline"></div>' + Desc + '</div>';
                }
            }

            if (descTypes == 'all' || descTypes.indexOf('di') >= 0) {
                if (DateInserted && DateInserted.length) {
                    Desc = '';
                    if (DateTaken && DateTaken.length === 0) {
                        Desc = '<div class="halfline"></div>';
                    }
                    Desc += _localized["DateInserted"] + ': ' + DateInserted;
                    images += '<div id= "DSdipr_' + imgID + '" >' + Desc + '<div class="halfline"></div></div>';
                }
            }

            if (descTypes == 'all' || descTypes.indexOf('i') >= 0) {
                images += '<div id= "DSid_' + imgID + '" >#' + imgID + '</div>'
            }
            images += '</div> '; // FolderDescrList

            images += '</div> ';

            if (imgList[i].getAttribute('GPS')  !==  "0")
                mapCount++;
            if (i  !==  0 && i % 100===0) {
                images += "##Breaker##";
            }
        }
        var theImages = images.split("##Breaker##");
        if ((typeof OffsetL === 'undefined') || OffsetL === 0) {
            var $elemts = $(theImages[0]);
            $($elemts).appendTo($grid);

            $grid.hmLayout('reloadItems');
            if (theImages.length > 1)
                loadNextImgsIntoGrid($grid, theImages, 1, View);
        }
        else {
            $grid.hmLayout('appended');
            loadNextImgsIntoGrid($grid, theImages, 0, View);
        }

        var DisplWidth = GetGridWidth($grid.width(), View);
        $('.outerImg').css('width', DisplWidth);
        $grid.children().each(function (index, element) {
            resizeElement(element, DisplWidth);
        });

        $grid.hmLayout('layout');
        ShowAllSelected();
        updateSoundPlay();
        //                itemHS();
        return i;
    }
    return 0;
}
function loadNextImgsIntoGrid($grid, theImages, i, View) {
    setTimeout(function (i) {
        if (i < theImages.length) {
            var $elemts = $(theImages[i]);
            $grid.append($elemts).hmLayout('appended', $elemts);
            loadNextImgsIntoGrid($grid, theImages, i + 1, View);
        }
        else {
            ResizeGridsImgs($grid.data('SameSize'));
            if (!$('#ShowDescriptors').data('checked') || !$('#ShowDescriptors').data('showDescriptors')) {
                $('.FolderDescr').addClass('NoHeight');
                $('.DirDescr').addClass('DisplayInFrame');
                $('.FolderIcon').addClass('FolderIconDark');
            }
            $grid.hmLayout('layoutRecalc');
        }
    }, 100, i);
}
function isScrolledIntoView(el) {
    var isVisible = $(el).offset().top - $(window).scrollTop() < $(el).height()
    return isVisible;

    var elemTop = el.getBoundingClientRect().top;
    var elemBottom = el.getBoundingClientRect().bottom;

    var isVisible = (elemTop >= 0) && (elemBottom <= window.innerHeight + 200);
    return isVisible;
}

function intersectRect(r1, r2) {
    return !(r2.left >= r1.right ||
        r2.right <= r1.left ||
        r2.top >= r1.bottom ||
        r2.bottom <= r1.top);
}

function AbsoluteCoordinates($element) {
    var sTop = $(window).scrollTop();
    var sLeft = $(window).scrollLeft();
    var w = $element.width();
    var h = $element.height();
    var offset = $element.offset();
    var $p = $element;

    var rect = $element[0].getBoundingClientRect(),

        scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,

        scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    //   return { top: rect.top + scrollTop, left: rect.left + scrollLeft }

    xpos = $element.position();
    xtop = xpos.top;
    xleft = xpos.left;
    currentTag = $element.offsetParent();
    while (currentTag[0].tagName  !==  'HTML') {
        p = currentTag.position();
        xtop += p.top;
        xleft += p.left;
        currentTag = currentTag.offsetParent();
    }

    var pos = {
        left: xleft,
        right: xleft + $element.outerWidth(),
        top: xtop,
        bottom: xtop + $element.outerHeight()
    }
    pos.tl = { x: pos.left, y: pos.top };
    pos.tr = { x: pos.right, y: pos.top };
    pos.bl = { x: pos.left, y: pos.bottom };
    pos.br = { x: pos.right, y: pos.bottom };
    //console.log( 'left: ' + pos.left + ' - right: ' + pos.right +' - top: ' + pos.top +' - bottom: ' + pos.bottom  );
    return pos;
}


function inViewport($ele, boundingHeight) {
    if (boundingHeight==undefined)
        boundingHeight = 0;
    var rcWindow = {
        left: 0,
        top: -(boundingHeight * $(window).innerHeight()) ,
        right: $(window).innerWidth(),
        bottom: (1 + boundingHeight) * $(window).innerHeight() 
    };
    return intersectRect(rcWindow, $ele[0].getBoundingClientRect());
}

function IsInView($ele, boundingHeight) {
    if (boundingHeight==undefined)
        boundingHeight = 0;

    var rcEl = $ele[0].getBoundingClientRect();
    if (rcEl.bottom < -(boundingHeight * $(window).innerHeight()))
        return 1;
    if (rcEl.top > (1 + boundingHeight) * $(window).innerHeight())
        return -1;
    return 0;
}

var VasCurr = null;
var maxScaleFact = 0.99;

function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}   

function resizeElement(element, DisplWidth, maxHeight, bWithDescriptors,maxPortScaleFact) {
    if (typeof bWithDescriptors==="undefined")
        bWithDescriptors = true;
    

    var id = $(element).data('id');
    var scale = parseInt($(element).data('sizey')) / parseInt($(element).data('sizex'));
    var scaleCrop = DisplWidth / parseInt($(element).data('sizex'));

    var cH = Math.floor(parseInt($(element).data('cropsizey')) * scaleCrop);
    if (typeof maxPortScaleFact !== 'undefined' && maxPortScaleFact != null)
        cH = Math.floor(DisplWidth * maxPortScaleFact);

    //    console.debug("id " + id + " ch: " + cH + " scale: "+scale);
    $('#crop_' + id).width(DisplWidth);
    $('#outer_' + id).width(DisplWidth);
    $('#outer_' + id).height(Math.floor(DisplWidth * scale));
    if ($('#Descr_' + id).length > 0) {
        $('#Descr_' + id).outerWidth(DisplWidth - 8);
        maxHeight = Math.max(maxHeight, $('#DS_' + id)[0].offsetHeight);
    }
    if ($('#DescrL_' + id).length > 0) {
        $('#DescrL_' + id).css("max-width", $(element).width() - DisplWidth - 30 + "px");
    }

    var extH = 0;
    if (scale > maxScaleFact) {
        var height = cH;
        var additional = 0;

        if (bWithDescriptors && $('.FolderDescr').length > 0) {
            additional = $('.FolderDescr').outerHeight(true);
        }
        if (height + cH < Math.floor(DisplWidth * scale) + (parseInt($('#id_' + id).css('margin-top')) + parseInt($('#id_' + id).css('margin-bottom')))) {
//            cH += height + (parseInt($('#id_' + id).css('margin-top')) + parseInt($('#id_' + id).css('margin-bottom'))) + additional; //+24;
            cH *= 2;
            cH = Math.floor(cH + $('#id_' + id).outerHeight(true) - $('#id_' + id).outerHeight() + additional);
            extH = 1;
        }
        //        scale = parseInt($(element).data('sizex')) / parseInt($(element).data('sizey'));
        //        cH = parseInt($(element).data('cropsizey')) / scale;
    }

    if (scale > maxScaleFact && !extH) {
        if ($('#canv_' + id).length > 0) {
            $('#outer_' + id).width(cH / scale);
            $('#outer_' + id).height(cH);
            $('#outer_' + id).css({ 'margin-left': 'auto', 'margin-right': 'auto' });
            //        $('#crop_' + id).css({ 'background-image': 'url("' + $('#tmb_3464326')[0].src + '")', 'background-size': DisplWidth + 'px ' + cH + 'px', 'background-repeat': 'repeat-x' });
            //        $('#crop_' + id).css({ '-webkit-filter': 'blur(70px)', '-o-filter': 'blur(70px)', 'filter': 'blur(70px)', 'filter': "progid: DXImageTransform.Microsoft.Blur(PixelRadius = '70')" });
            //        $('#crop_' + id).data('href', $('#tmb_' + id)[0].src);
            //        $('#crop_' + id).blurr({ sharpness: 80 });
            $('#tmb_' + id).on('load', function () {
                var id = $(this).data('id');
                if ($(this).data('protected') == 0) {
                    if (!$('#tmb_' + id).data('blurred'))
                        stackBlurImage('tmb_' + id, 'canv_' + id, 34, false);
                    $('#tmb_' + id).data('blurred', true);
                }
                if ($('#crop_' + id).length > 0) {
                    $('#canv_' + id).height($('#crop_' + id).height());
                    $('#canv_' + id).width($('#crop_' + id).width());
                }
            });
            $('#canv_' + id).height($('#crop_' + id).height());
            $('#canv_' + id).width(DisplWidth);
        }
    }

    if ($('#crop_' + id).length > 0) {
        $('#crop_' + id).height(cH);
        if ($('#outer_' + id).height() > cH) {
            var offs = ((cH - $('#outer_' + id).height()) / 2);
            if (offs < 0) {
                $('#outer_' + id).css("margin-top", offs + 'px');
                $('#Geo_' + id).css("margin-top", parseInt(Math.abs(offs) + 2) + 'px');
            }
            else {
                $('#outer_' + id).css("margin-top", '');
                $('#Geo_' + id).css("margin-top", '');
            }
        }
        if (scale < 0.1) {
            var h = $('#outer_' + id).height();
            var w = $('#outer_' + id).width();
            $('#outer_' + id).height(h * 2);
            $('#outer_' + id).width(w * 2);
        }
    }
    
    ShowSelected(element);
    return maxHeight;
}


function ResizeGridsImgs(resizeTextSameHeight,maxPortScale) {
    if (typeof resizeTextSameHeight === "undefined")
        resizeTextSameHeight = true;
    var DisplWidth = 0;
    if ($('#DateTimeContainer').length)
        DisplWidth = GetGridWidth($('#last').width(), "DateViewItem");
    else if ($('#FordersAndImages').length)
        DisplWidth = GetGridWidth($('#FordersAndImages').width(), "FolderViewItem");
    else
        return;

    var maxTextHeight = 0;
    $('.outerImg').width(DisplWidth);
    $('.cropper').width(DisplWidth);
    $('.FolderDescr').width(DisplWidth - 8);
    var bWithDescriptors = !$('#ShowDescriptors').data('checked') || !$('#ShowDescriptors').data('showDescriptors') ? false : true;
    $('.dategrid').each(function (index, grid) {
        var flexsize = $(grid).data('flexsize');

        if (flexsize) {
            $(grid).children().each(function (index, element) {
                maxTextHeight = resizeElement(element, DisplWidth, maxTextHeight, bWithDescriptors, maxPortScale);
            });
        } else {
            var widthOfInner = $('.item:first-child').width();
            var widthOfImage = $('.cropper:first-child').width();
            if (!widthOfImage)
                widthOfImage = $('.outerImg:first-child').width();
            $('.FolderDescrList').css("max-width", widthOfInner - widthOfImage - 30 + "px");
        }
    });

    if(resizeTextSameHeight)
        $('.FolderDescrHeight').css({ "height": maxTextHeight });

    $('.dategrid').each(function (index, grid) {
        var flexsize = $(grid).data('flexsize');

        $(grid).children().each(function (index, element) {
            if ($(element).width() !== DisplWidth || $(element).children('.cropper').height() == 0)
                maxTextHeight = resizeElement(element, DisplWidth, maxTextHeight, bWithDescriptors, maxPortScale);
        });
    });

    var thWidth = getLoadWidth(DisplWidth);
    $('.Thumb').each(function (index, it) {
        if ($(this).attr('src'))
            $(this).attr('src', $(this).attr('src').replace(/w=\d+/, "w=" + thWidth));
    });
}
function clearDateTime() {
    //   $('#NewBtnItems_View').children().remove();
    //    $('#DateTimeContainer').children().remove();
}
function removeAlbumView() {
    if ($('#AlbumsView').length===0)
        return false;
    $('#AlbumsView').remove();
    return true;
}

function rtrim(char, str) {
    if (str.slice(str.length - char.length) === char) {
        return rtrim(char, str.slice(0, 0 - char.length));
    } else {
        return str;
    }
}

String.prototype.trimLeft = function (charlist) {
    if (charlist == undefined)
        charlist = "\s";

    return this.replace(new RegExp("^[" + charlist + "]+"), "");
};

String.prototype.trimRight = function (charlist) {
    if (charlist == undefined)
        charlist = "\s";

    return this.replace(new RegExp("[" + charlist + "]+$"), "");
};

function clearLocElements(folderAddInfo, view, exept) {
    var ar = ['dir', 'rd', 'v', 'flat', 'scrt', 'uid','it'];
    if (exept) {
        for (var cbI = 0; cbI < exept.length; cbI++)
            ar.push(exept[cbI]);
    }
    return getLocElementsExcept(ar, folderAddInfo, view);
}



var CurrentView = null;
var delTimer = 0;
function DisplaySubDirsMenu(dirID) {
    if ($('#DirS').length > 0)
        return;

    clearTimeout(delTimer);
    delTimer = 0;

    $('<div id="DirS" class="DirSelector" style="display:none"><ul id="DirList"></ul></dir>').appendTo($('#ScrollableContent'));
    $('#DirS').data('hover', false);

    CollectSubDirsForUser(dirID, function (json) {
        var obj = JSON.parse(json);

        $('#DirS').show();
        var endPt = $('#endDir').offset();
        if (endPt != null) {
            endPt.top -= window.location === window.parent.location ? 24 : 8;
            endPt.left += 7;
            $('#DirS').offset({ top: endPt.top, left: endPt.left });
        }

        for (var cbI = 0; cbI < obj.length; cbI++) {
            $('<li class="DirSelectorList" data-dirid="' + obj[cbI].DirID + '">' + replaceInternals(obj[cbI].Name) + '</li>').appendTo('#DirList');
        }

        $('.DirSelectorList').click(function () {
            clearTimeout(delTimer);
            delTimer = 0;
            $('#DirS').remove();

            var NewDirID = $(this).data('dirid');
            var VasDir = jQuery.extend({}, MaVas);
            if (CurrentView)
                VasDir = jQuery.extend({}, CurrentView);
            VasDir.ParentId = MaVas.DirId;
            VasDir.DirId = NewDirID;
            VasDir.UFOffset = 0;

            ShowUserFolder(VasDir, 1, 1);
        });

        var scr = new PerfectScrollbar($('#DirS')[0], { suppressScrollX: true, minScrollbarLength: 20 });
        scr.update();
        $('#DirS').data('scroller', scr);
    });

    $('#DirS').hover(function () {
        $(this).data('hover', true);
        clearTimeout(delTimer);
        delTimer = 0;
    }, function () {
        $(this).data('hover', false);
        delTimer = window.setTimeout(function () {
            delTimer = 0;
            $('#DirS').fadeOut('fast', function () {
                $('#DirS').remove();
            });
        }, 1500);
    });
}
function ShowAndSelectSubDirs(itemHover, itemClick) {
    if (itemHover != undefined) {
        $(itemHover).hover(function () {
            DisplaySubDirsMenu(parseInt($(this).data('dir')));
        }, function () {
            delTimer = window.setTimeout(function () {
                delTimer = 0;
                if ($('#DirS').data('hover') === true)
                    return;

                $('#DirS').fadeOut('fast', function () {
                    $('#DirS').remove();
                });
            }, 1500);
        });
    }
    if (itemClick != undefined) {
        $(itemClick).click(function (e) {
            DisplaySubDirsMenu(parseInt($(this).data('dir')));
        });
    }
}

function IsListViewAlpha() {
    if (MaVas.ListView===true || MaVas.ListView==="true")
        return 'l';
    return '';
}

function LoadDaysContent(SortField, dateFrom, dateTo) {
    $("#DateTimeContainer").remove();

    $('#AlbumsView').remove();
    if (MaVas.UFOffset===0) {
        var filter = "WHERE CONVERT(VARCHAR(10)," + SortField + ",112) = Convert(Date,'" + dateFrom + "',101)";
        if (dateTo)
            filter = "WHERE CONVERT(VARCHAR(10)," + SortField + ",112) >= Convert(Date,'" + dateFrom + "',101) AND CONVERT(VARCHAR(10)," + SortField + ",112) <= Convert(Date,'" + dateTo + "',101)";
        var dlg = $('<div id="AlbumsView" class="sqs-gallery-design-autocolumns Album"></div>').appendTo('#ScrollableContent');
        $('<div id="DateDisplay"><span id="DateDisplayInfo">displaying items where date inserted on ' + dateFrom + '</span></div>').appendTo(dlg);
        if (!dateTo)
            dateTo = "";
        SLApp.CommunityService.TranslateDateTimeItem(SortField, dateFrom, dateTo, function (text) {
            $('#DateDisplayInfo').text(text);
        });
        $('<div id="FordersAndImagesContainer" data-gridname="FordersAndImages"><div id="FordersAndImages" class="sqs-gallery-design-autocolumns dategrid"></div></div>').appendTo(dlg);
        $('<div id="FordersAndImagesContainerEnd" ></div>').appendTo($('#AlbumsView'));
        $('#FordersAndImagesContainerEnd').hide();
        $('#FordersAndImages').hmLayout({
            // options
            layout: 'grid',
            itemSelector: '.item'
        });
        var $grid = $('#FordersAndImages');
        var SortFor = "so=" + SortField + " DESC, DispOrder, SortOrder ";
        CurrentView = jQuery.extend({}, MaVas);
    }
    VasCurr = jQuery.extend({}, MaVas);
    var request = QueryMoreImagesFiltered
        (window.location.search, MaVas.DirId, MaVas.UFOffset, MaVas.UFCount, MaVas.RootDirId, MaVas.RootDirId, MaVas.DisplayDirs, SortFor, GetViewTypes(), MaVas.SearchOptions, filter, '', '', 220, 60000, 400, 60000, false,
        function (xml) {
            var info = xml.getElementsByTagName('Info');
            if (info.length > 0) {
                //                VasCurr.Items = parseInt(info[0].getAttribute('Items'));
                ParseDirXML(xml, $grid, true, 220, "FolderViewItem");
                ParseImgXML(xml, $grid, false, "FolderViewItem", true, true, true);
                LoadImages($grid);

                var DisplWidth = GetGridWidth($('#FordersAndImages').width(), "FolderViewItem");
                var maxTextHeight = 0;
                $grid.children().each(function (index, element) {
                    maxTextHeight = resizeElement(element, DisplWidth, maxTextHeight);
                });
                $('.FolderDescrHeight').css({ "height": maxTextHeight });
                $grid.children().each(function (index, element, maxTextHeight) {
                    resizeElement(element, DisplWidth, maxTextHeight);
                });
                $grid.hmLayout('layout');
                $('#FordersAndImagesContainerEnd').show();

                NoSourceInImgs = false;
                CheckImgs();
            }
        }, function () {
        });
}


function ShowImageAndBuildArray(ImageID, flat,SortOrder) {
    var itemsArray = [];
    var item = $('#id_' + ImageID);
    $(item.data("grid")).children().each(function (index, item) {
        itemsArray[index] = $(item).data();
    });
    if (itemsArray.length === 0) {
        var Sort = '';
        var theImgID = ImageID;
        if (!CurrentView)
            CurrentView = jQuery.extend({}, MaVas);
        if (flat == undefined)
            flat = MaVas.IsFlat;
        var DirID = MaVas.DirId;
        if (SortOrder == undefined)
            SortOrder = MaVas.SortFor;
        else {
            SortOrder = "so=" + SortField + " DESC, DispOrder, SortOrder ";
            DirID = MaVas.RootDirId;
        }
        SLApp.UserAndInfoService.GetImageIndex(theImgID, DirID, flat, SortOrder, -1, MaVas.SearchFor, MaVas.SearchForAny, MaVas.SearchForExact, GetViewTypes(), MaVas.SearchOptions, function (idx) {
            var offset = idx - Math.min(MaVas.UFCount / 2,25);
            MaVas.Index = idx;
            if (offset < 0)
                offset = 0;
            MaVas.UFOffset = offset;
            GetImagesData(MaVas, offset, function (itemsArray,items) {
               ShowDetailView(theImgID, itemsArray, 'AlbumsView', true, true, MaVas.Items, function () {

                });
            });
        });
    }
    else {
        if (item.data("itype")==="1") {
            if ($("#vid_" + item.data("id")).length > 0) {
                $("#vid_" + item.data("id"))[0].pause();
                console.log('Pause called');
            }
        }

        ShowImage(ImageID, itemsArray, 'AlbumsView', true);
    }
}
function CheckProtected(DirId) {
    SLApp.CommunityService.IsProtectedAlbum(DirId, function (prot) {
        if (prot==="True")
            $('.Protected').show();
        else
            $('.Protected').hide();
    });
}
var maxTextHeight = 0;

function ResizeFolderDescription() {
    if ($('#FolderDescription').length == 0)
        return;

    var limit = $('#FolderDescription').data('limit');
    if (limit == null || limit == '')
        return;

    if ($('#FolderDescription').data('maximized') == 'yes') {
        $('#FolderDescriptionTxt').css('max-height', '');
    }
    else {
        var maxHeight = 0;
        if (limit.substr(-1) == "%") {
            maxHeight = $(window).height() * parseInt(limit) / 100;
        }
        else if (limit.substr(-2) == "px") {
            maxHeight = parseInt(limit);
        }

        if (maxHeight <= 0 || maxHeight >= $('#FolderDescription').data('height')) {
            $('#FolderDescriptionTxt').css('max-height', '');
            $('#FolderDescriptionBtns').hide();
        }
        else {
            $('#FolderDescriptionTxt').css('max-height', maxHeight + 'px');
            $('#FolderDescriptionBtns').show();
        }
    }
}

function ShowUserFolder(MaVasDir, navi, History, onDataThere) {
    var flatVal = "";
    if (MaVasDir.IsFlat==='True') {
        MaVasDir.FlatDirId = MaVasDir.DirId;
        flatVal = "&flat=true";
    }
    else
        MaVasDir.FlatDirId = -1;

    CurrentView = jQuery.extend({}, MaVasDir);
    var TempVas = jQuery.extend({}, MaVasDir);
    TempVas.Navigation = [];
    $('#SavedMaVas').val(encodeURI(JSON.stringify(TempVas)));

    if (History && MaVasDir.DirId === MaVasDir.RootDirId) {
        if (!$('#slideShow').length) {
            var clr = clearLocElements("", 'a' + IsListViewAlpha());

            AddToHistory("OpenFolder", "Title", clr + '&dir=' + MaVasDir.DirId + '&rd=' + MaVasDir.RootDirId + flatVal + GetViewTypesParam());
        }
    }
    if (MaVasDir.UFOffset === 0)
        OnChangePage('Folder');

    if (MaVasDir.UFOffset === 0) {

        CheckProtected(MaVasDir.DirId);
        if (MaVas.NavIdx < MaVas.Navigation.length) {
            if (MaVas.Navigation[MaVas.NavIdx-1].DirID   !==  MaVasDir.DirId) {
                MaVas.Navigation.splice(MaVas.NavIdx, 2000);
            }
        };

        if (MaVas.NavIdx === MaVas.Navigation.length) {
            MaVas.Navigation.push({ DirID: MaVasDir.DirId, Name:'' });
            MaVas.NavIdx++;
        }

        if (typeof (AbortAllPendingRequests) === 'function')
            AbortAllPendingRequests();
        if (typeof (discardPendingImages) === 'function')
            discardPendingImages(1);
        removeAboutMe();
        clearDateTime();
        $("#DateTimeContainer").remove();
        maxTextHeight = 0;
        $('#AlbumsView').remove();

        var dlg = $('<div id="AlbumsView" class="sqs-gallery-design-autocolumns Album"></div>').appendTo('#ScrollableContent');

        if ((MaVasDir.SearchFor === '' && MaVasDir.SearchForExact === '' && MaVasDir.SearchForAny === '') || (MaVasDir.IsFlat === 'True' && MaVasDir.SearchFor === '')) {
            $('<div class="naviLine"></div>').appendTo($('#AlbumsView'));
            $('<div id="TopLines"></div>').appendTo($('#AlbumsView'));
            var navigator = $('<div id="Navigator" class="navigator" style="display:none"></div>').appendTo($('#TopLines'));
            var GalleryListDia = $('<div class="GaleryListDia"></div>').appendTo(navigator);

            $('<div id="galView" title="' + _localized["ShowThumbs"] + '" class="NavBtn"></div>').appendTo(GalleryListDia).click(function () {
                $("#ShowGallery").click();
            });
            $('<div id="listView" title="' + _localized["ShowList"] + '" class="NavBtn"></div>').appendTo(GalleryListDia).click(function () {
                $("#ShowList").click();
            });
            $('<div id="SlidesView" title="' + _localized["ShowSlides"] + '" class="NavBtn"></div>').appendTo(GalleryListDia).click(function () {
                $('#ShowSlideShow').click();
            });
            if (MaVasDir.IsFriend === true) {
                $('<a id="EditView" title="' + _localized["ShowInMaintainer"] + '" class="NavBtn" target="_blank" href="/user/?dir=' + MaVasDir.DirId + '"></a>').appendTo(GalleryListDia);
            }
            if (MaVasDir.Copy) {
                $(MaVasDir.Copy).appendTo(GalleryListDia);
            }

            if (MaVasDir.ListView === true) {
                $('#listView').addClass("NavBtnActive");
            } else {
                $('#galView').addClass("NavBtnActive");
            }

            SelectAbout("#Albums");

            var navi = $('<div id="nav_Names"></div>').appendTo(navigator);
            var rightNav = $('<div id="right_space"></div>').appendTo(navigator);
            rightNav.append('<div id="nav_FilesCnt"></div>');

            var lr = $('<div id="nav_leftRight"><div id="nav_up" class="NavBtn"></div><div id="nav_left" class="NavBtn"></div><div id="nav_right" class="NavBtn"></div><div id="nav_folders" class="NavBtn"></div>').appendTo(rightNav);

            $('#nav_left').attr('disabled', 'disabled');
            $('#nav_right').attr('disabled', 'disabled');
            $('#nav_left').addClass('nav_disabled');
            $('#nav_right').addClass('nav_disabled');
            $('#nav_up').addClass('nav_disabled');
            $('#nav_folders').attr('title', $("#FlatViewToggle").text());
            if (MaVasDir.IsFlat==='True') {
                $('#nav_folders').addClass("nav_WithOutF");
            } else if (MaVasDir.DisplayDirs === false) {
                $('#nav_folders').remove();
            } else {
                $('#nav_folders').addClass("nav_WithF");
            }
            $('#nav_folders').click(function () {
                FlatViewModeClicked();
            });
            if (getQueryParam("frame") )
            {
                $('#nav_folders').css('display','none');
                $('.GaleryListDia').css('display','none');
                        
            }
            GetFolderPath(0, MaVasDir.DirId, -1, false, function (Folders) {
                var objInfo = JSON.parse(Folders);
                if (objInfo != null) {
                    if (!$('#slideShow').length) {
                        AddToHistory("OpenFolder", "Title", clearLocElements(objInfo.folderName, 'a' + IsListViewAlpha(), ['anchor']) + '&dir=' + MaVasDir.DirId + '&rd=' + MaVasDir.RootDirId + flatVal + GetViewTypesParam());
                    }
                    var MaxDir = MaVasDir.RootDirId;
                    if(getQueryParam("frame"))
                    {
                        MaxDir = MaVas.DirId;
                        $('#nav_folders').css('display','none');
                        $('.GaleryListDia').css('display','none');
                        
                    }

                    var obj = objInfo.pathObj;
                    var skip = true;

                    var href = "";
                    for (var cbI = 0; cbI < obj.length; cbI++) {
                        if (obj[cbI].dirID === MaxDir)
                            skip = false;

                        if (cbI > 0 && skip)
                            continue;

                        var clss = "DirNavi";
                        if (cbI === obj.length - 1) {
                            if (window.location !== window.parent.location) {
                                var link = getLocElementsExcept(["ba", "desc", "dir", "fdesc", "frame", "menu", "op", "SLClose", "ts"]);
                                if (link.indexOf('?') < 0)
                                    link += '?dir=' + obj[cbI].dirID;
                                else
                                    link += '&dir=' + obj[cbI].dirID;

                                href = 'href="' + link + '" target="_blank"';
                                clss = "DirNavi endDir";
                            }
                            else {
                                clss = "DirNavi endDir noTextDeco";
                            }
                        }
                        if (cbI === 0) {
                            clss = "DirNavi startDir";
                        }

                        var lnk = '<a class="' + clss + '" id="Path_' + cbI + '" data-dir="' + obj[cbI].dirID + '" data-index="' + cbI + '" '+href+'>' + replaceInternals(obj[cbI].Name) + '</a>';
                        if (cbI < obj.length - 1)
                            lnk += "<span>/</span>";
                        $(lnk).appendTo(navi);
                    }
                    if (obj.length > 0 && obj[obj.length - 1].HasSubDirs > 0) {
                        var cbI = obj.length - 1;
                        $('<span id="endDir" class="endDir DirNavi" data-index="' + cbI + '" data-dir="' + obj[cbI].dirID + '" ><svg height="14px" width="14px"  id="MoreIcon" viewBox="0 0 512 512" ><g><path d="M256,224c-17.7,0-32,14.3-32,32s14.3,32,32,32c17.7,0,32-14.3,32-32S273.7,224,256,224L256,224z"/><path d="M128.4,224c-17.7,0-32,14.3-32,32s14.3,32,32,32c17.7,0,32-14.3,32-32S146,224,128.4,224L128.4,224z"/><path d="M384,224c-17.7,0-32,14.3-32,32s14.3,32,32,32s32-14.3,32-32S401.7,224,384,224L384,224z"/></g></svg></span>').appendTo(navi);
                        ShowAndSelectSubDirs('.endDir', '#endDir');
                    }

                    $('.DirNavi').on("click", function () {
                        if ($(this).data('index') !== obj.length - 1) {
                            $('#DirS').remove();
                            var DirId = parseInt($(this).data('dir'));
                            var VasDir = jQuery.extend({}, MaVasDir);;
                            if (CurrentView)
                                VasDir = jQuery.extend({}, CurrentView);;
                            VasDir.ParentId = MaVasDir.DirId;
                            VasDir.DirId = DirId;
                            VasDir.UFOffset = 0;
                            ShowUserFolder(VasDir, 1, 1);
                        }
                    })
                    if (MaVasDir.DirId !== MaxDir) {
                        /*
                        $('#nav_up').click(function(e){
                            var DirId = parseInt($(this).data('dir'));
                            var VasDir = jQuery.extend({}, MaVasDir);
                            if (CurrentView)
                                VasDir = jQuery.extend({}, CurrentView);
                            VasDir.ParentId = MaVasDir.DirId;
                            VasDir.DirId = DirId;
                            VasDir.UFOffset = 0;
                            ShowUserFolder(VasDir, 1, 1);
                        });
                        var paths = objInfo.pathObj;
                        if (paths.length > 1) {
                            var i = paths.length - 1;
                            while (i > 0) {
                                if (paths[i].dirID === MaVasDir.DirId) {
                                    $('#nav_up').data('dir', paths[i - 1].dirID);
                                    $('#nav_up').data('Name', paths[i - 1].Name);
                                    $('#nav_up').attr('title', paths[i - 1].Name);

                                    $('#nav_up').removeAttr('disabled');
                                    $('#nav_up').removeClass('nav_disabled');
                                    break;
                                }
                                i--;
                            }
                        }
                        */

                        SLApp.CommunityService.GetLeftRightFolder(MaVasDir.DirId, function (leftRigth) {
                            var obj = JSON.parse(leftRigth);
                            if (obj != null && obj.length > 0) {
                                $('#nav_left').data('dir', obj[0].dirID);
                                $('#nav_left').data('Name', obj[0].Name);
                                $('#nav_left').attr('title', obj[0].Name);

                                $('#nav_right').data('dir', obj[1].dirID);
                                $('#nav_right').data('Name', obj[1].Name);
                                $('#nav_right').attr('title', obj[1].Name);

                                $('#nav_up').data('dir', obj[2].dirID);
                                $('#nav_up').data('Name', obj[2].Name);
                                $('#nav_up').attr('title', obj[2].Name);

                                if (obj[0].dirID) {
                                    $('#nav_left').removeAttr('disabled');
                                    $('#nav_left').removeClass('nav_disabled');
                                }
                                if (obj[1].dirID) {
                                    $('#nav_right').removeAttr('disabled');
                                    $('#nav_right').removeClass('nav_disabled');
                                }
                                if (obj[2].dirID) {
                                    $('#nav_up').removeAttr('disabled');
                                    $('#nav_up').removeClass('nav_disabled');
                                }

                                $('#nav_left').click(function () {
                                    if ($(this).attr('disabled') !== 'disabled') {
                                        var DirId = parseInt($(this).data('dir'));
                                        var VasDir = jQuery.extend({}, MaVasDir);;
                                        VasDir.ParentId = MaVasDir.DirId;
                                        VasDir.DirId = DirId;
                                        VasDir.UFOffset = 0;
                                        ShowUserFolder(VasDir, 1, 1);
                                    }
                                });
                                $('#nav_right').click(function () {
                                    if ($(this).attr('disabled') !== 'disabled') {
                                        var DirId = parseInt($(this).data('dir'));
                                        var VasDir = jQuery.extend({}, MaVasDir);;
                                        VasDir.ParentId = MaVasDir.DirId;
                                        VasDir.DirId = DirId;
                                        VasDir.UFOffset = 0;
                                        ShowUserFolder(VasDir, 1, 1);
                                    }
                                });
                                $('#nav_up').click(function () {
                                    if ($(this).attr('disabled') !== 'disabled') {
                                        var DirId = parseInt($(this).data('dir'));
                                        var VasDir = jQuery.extend({}, MaVasDir);
                                        if (CurrentView)
                                            VasDir = jQuery.extend({}, CurrentView);
                                        VasDir.ParentId = MaVasDir.DirId;
                                        VasDir.DirId = DirId;
                                        VasDir.UFOffset = 0;
                                        ShowUserFolder(VasDir, 1, 1);
                                    }
                                });
                            }
                        });
                    }

                    $('#FolderDescription').remove();
                    if (getQueryParam('fdesc') != 'off') {
                        for (cbI = 0; cbI < obj.length; cbI++) {
                            if (obj[cbI].dirID === MaVasDir.DirId) {
                                var txt = obj[cbI].Description != null ? obj[cbI].Description.trim() : '';
                                while (txt.substr(0, 4) == '<br>') {
                                    txt = txt.substr(4);
                                }
                                while (txt.substr(-4) == '<br>') {
                                    txt = txt.substr(0, txt.length - 4);
                                }

                                var limit = getQueryParam('fdesc');
                                if (limit === false)
                                    limit = obj[cbI].DescriptionLimit;
                                if (limit == 'all')
                                    limit == '';

                                if (txt != '' && limit != 'off') {
                                    var desc = $('<div id="FolderDescription"><div id="FolderDescriptionTxt">' + txt + '</div></div>').appendTo($('#TopLines'));
                                    desc.children('a').each(function (i) {
                                        if ($(this).attr('target') == undefined)
                                            $(this).attr('target', '_blank');
                                        if ($(this).attr('rel') == undefined)
                                            $(this).attr('rel', 'noopener nofollow external');
                                    });

                                    if (limit != null && limit != '') {
                                        desc.data('limit', limit);
                                        desc.data('height', desc.height());
                                        desc.data('maximized', 'no');

                                        desc.append('<div id="FolderDescriptionBtns"></div>');
                                        $('<span>Read More</span>').appendTo('#FolderDescriptionBtns').click(function (e) {
                                            if ($('#FolderDescription').data('maximized') == 'yes') {
                                                $(this).text('Read More');
                                                $('#FolderDescription').data('maximized', 'no');
                                            }
                                            else {
                                                $(this).text('Read Less');
                                                $('#FolderDescription').data('maximized', 'yes');
                                            }
                                            ResizeFolderDescription();
                                        });
                                        ResizeFolderDescription();
                                    }
                                }
                                break;
                            }
                        }
                    }
                    // $(Folders).appendTo(navi);
                }
            });
        } else {
            GetFolderPath(0, MaVasDir.DirId, MaVasDir.RootDirId, false, function (Folders) {
                var objInfo = JSON.parse(Folders);
                if (objInfo && History && !$('#slideShow').length)
                    AddToHistory("OpenFolder", "Title", clearLocElements(objInfo.folderName, 'a' + IsListViewAlpha()) + '&dir=' + MaVasDir.DirId + '&rd=' + MaVasDir.RootDirId + flatVal);
            });
        }
        MaVas.ListView ? $('#CopyButton').show() : $('#CopyButton').hide();
        
        $('<div id="FordersAndImagesContainer" data-gridname="FordersAndImages"><div id="FordersAndImages" class="sqs-gallery-design-autocolumns dategrid"></div></div>').appendTo($('#AlbumsView'));
        $('<div id="FordersAndImagesContainerEnd" ></div>').appendTo($('#AlbumsView'));
        $('#FordersAndImagesContainerEnd').hide();
        if (getQueryParam("d")   !==  "masonry") {
            $('#FordersAndImages').hmLayout({
                // options
                layout: 'grid',
                itemSelector: '.item'
            });
        } else {
            $('#FordersAndImages').hmLayout({
                // options
                itemSelector: '.item'
            });
        }
    }
    VasCurr = jQuery.extend({}, MaVasDir);

    var search = getQueryParam("ft");
    var Sort = '';
    if (MaVasDir.SortFor !== 'random')
        Sort = 'so=' + MaVasDir.SortFor;

    if (search !== false && search.indexOf("search.") == 0) {
        if (MaVasDir.SortFor !== 'random' && MaVasDir.SearchOptions != '') {
            Sort = MaVasDir.SearchOptions;
        }
        else if (search == 'search.' && Sort != '') {
            if (Sort.substring(Sort.length - 5).toLowerCase() == ' desc')
                Sort = Sort.replace(/-/g, ' desc-');
        }

        $('.NoSearch').hide();
        $('#nav_leftRight').hide();
        //    var request = SLApp.CommunityService.QueryMoreImagesFiltered
    }
    else {
        if (!MenuHide)
            $('.NoSearch').show();
    }
    if (MaVas.UFOffset === 0) {
        StopPlayingMusic();
        opViewItems = [];
    }

    var request = QueryMoreImagesFiltered
        (window.location.search, MaVasDir.DirId, MaVasDir.UFOffset, MaVasDir.UFCount, Math.abs(MaVasDir.RootDirId), MaVasDir.FlatDirId, MaVasDir.DisplayDirs, search, GetViewTypes(), Sort, MaVasDir.SearchFor, MaVasDir.SearchForAny, MaVasDir.SearchForExact, 60000, 60000, 60000, 60000, false,
        function (xml) {
            var $grid = $('#FordersAndImages');
            if (xml==null || $grid.length===0) {
                return;
            }
            var info = xml.getElementsByTagName('Info');
            if (info.length > 0) {
                MaVasDir.AllowDirMap = VasCurr.AllowDirMap = info[0].getAttribute('AllowDirMap') != '0';

                var files = parseInt(info[0].getAttribute('Documents'));
                var Dirs = parseInt(info[0].getAttribute('Dirs'));
                MaVasDir.Items = VasCurr.Items = CurrentView.Items = Dirs + parseInt(info[0].getAttribute('Items'));
                if (Dirs + files===0) {
                    $('#SlidesView').addClass("SlidesDisabled");
                } else {
                    $('#SlidesView').removeClass("SlidesDisabled");
                }

                var strFilesCnt = "";
                if (Dirs > -1) {
                    if (Dirs > 0) {
                        strFilesCnt += FormatNumber(Dirs) + ' ' + _localized['Dirs'];
                    }
                    $('#Navigator').css('display','');
                }else{
                    var MaxDir = MaVasDir.RootDirId;
                    if(getQueryParam("frame"))
                    {
                        MaxDir = MaVas.DirId;
                    }
                    if(MaVasDir.DirId   !==  MaxDir)
                        $('#Navigator').css('display','');
                }

                if (files >= 0) {
                    if (files === 1) {
                        if (strFilesCnt != '')
                            strFilesCnt += ", ";
                        strFilesCnt += FormatNumber(files) + ' ' + _localized['File'];
                    }
                    else if (files > 0 || Dirs == 0) {
                        if (strFilesCnt != '')
                            strFilesCnt += ", ";
                        strFilesCnt += FormatNumber(files) + ' ' + _localized['Files'];
                    }
                }

                $('#nav_FilesCnt').text(strFilesCnt);
                if (GetViewTypes() != 11111)
                    $('#nav_FilesCnt').prepend('<img id="nav_FilesCnt_filter" src="/images/Community/Views/new/SVGs/Filter.svg" />');

                var SameSize = true;

                if (getQueryParam("d") === "masonry") {
                    SameSize = false;
                }
                $grid.data('SameSize', SameSize);
                ParseDirXML(xml, $grid, SameSize, 220, "FolderViewItem");
                ParseImgXML(xml, $grid, false, "FolderViewItem", SameSize, true, SameSize, MaVasDir.UFOffset);
                MaVas.Navigation[MaVas.NavIdx - 1].Name = info[0].getAttribute('DirectoryName');
/*
                if (MaVasDir.UFOffset === 0 && MaVasDir.NoMenu === true && MaVasDir.DirId   !==  MaVas.DirId) {
                    $('#DirName').text(decodeHtml(info[0].getAttribute('DirectoryName')));
                    var dirList = xml.getElementsByTagName('Dir');
                    if (dirList != null && dirList.length > 0 || MaVas.NavIdx > 1) {
                        $('#frameNavigation').show();
                        $('#backDir').off();
                        $('#vorwDir').off();
                        if (MaVas.NavIdx < MaVas.Navigation.length) {
                            $('#vorwDir').click(function () {
                                MaVas.NavIdx++;
                                var VasDir = jQuery.extend({}, MaVas);
                                VasDir.ParentId = MaVasDir.DirId;
                                VasDir.DirId = MaVas.Navigation[MaVas.NavIdx - 1].DirID;
                                VasDir.UFOffset = 0;
                                ShowUserFolder(VasDir, 1, 1);

                            });
                            $('#vorwDir').prop("disabled", false);
                            $('#vorwDir').attr('title', MaVas.Navigation[MaVas.NavIdx].Name);
                            $('#vorwDir').removeClass('disabled');
                        } else {
                            $('#vorwDir').prop("disabled", true);
                            $('#vorwDir').addClass('disabled');
                        }
                        if (MaVas.NavIdx > 1) {
                            $('#backDir').click(function () {
                                MaVas.NavIdx--;
                                var VasDir = jQuery.extend({}, MaVas);
                                VasDir.ParentId = MaVasDir.DirId;
                                VasDir.DirId = MaVas.Navigation[MaVas.NavIdx - 1].DirID;
                                VasDir.UFOffset = 0;
                                ShowUserFolder(VasDir, 1, 1);
                            });
                            $('#backDir').prop("disabled", false);
                            $('#backDir').removeClass('disabled');
                            $('#backDir').attr('title', MaVas.Navigation[MaVas.NavIdx - 2].Name);
                        } else {
                            $('#backDir').prop("disabled", true);
                            $('#backDir').addClass('disabled');
                        }
                    }
                }
                else {
                    $('#frameNavigation').hide();
                }
*/
                LoadImages($grid);

                var DisplWidth = GetGridWidth($('#FordersAndImages').width(), "FolderViewItem");
                var oldMaxHeight = maxTextHeight;
                /*                $grid.children().each(function (index, element) {
                                    maxTextHeight = resizeElement(element, DisplWidth, maxTextHeight);
                                });
                */

                var bWithDescriptors = !$('#ShowDescriptors').data('checked') || !$('#ShowDescriptors').data('showDescriptors') ? false : true;

                if (getQueryParam("d") !== "masonry") {
                    var elements = $grid.children();

                    var scaleSum = 0;
                    var scaleCount = 0;

                    for (var cbI = 0; cbI < elements.length; cbI++) {
                        var element = $(elements[cbI]);
                        var scale = element.data("sizey") / element.data("sizex");
                        if (scale < 1 && scale > 0.1) {
                            scaleSum += scale;
                            scaleCount++;
                        } else {
                            scaleSum += 0.5;
                            scaleCount++;
                        }
                    }
                    var maxScale = scaleCount > 0 ? scaleSum / scaleCount : null;
                    if (maxScale == null) {
                        // only portraits
                        maxScale = 0.5;
                    }
                    for (var cbI = 0; cbI < elements.length; cbI++) {
                        element = elements[cbI];
                        maxTextHeight = resizeElement(element, DisplWidth, maxTextHeight, bWithDescriptors, maxScale);
                    }

                    $('.FolderDescrHeight').css({ "height": maxTextHeight });
                    if (maxTextHeight   !==  oldMaxHeight) {
                        for (var cbI = 0; cbI < elements.length; cbI++) {
                            element = elements[cbI];
                            resizeElement(element, DisplWidth, maxTextHeight, bWithDescriptors, maxScale);
                        }

                        if (oldMaxHeight   !==  maxTextHeight)
                            ResizeGridsImgs(true, maxScale);
                    }else{
                        ResizeGridsImgs(false, maxScale);
                    }
                } else {    
                   ResizeGridsImgs(false);
                }

                $grid.hmLayout('layout');
                $('#FordersAndImagesContainerEnd').show();

                NoSourceInImgs = false;
                CheckImgs();
                if (typeof buildItemsContextMenu !== "undefined")
                    buildItemsContextMenu();
                if (onDataThere)
                    onDataThere();

                if (getQueryParam('op') === 'parent') {
//                    $('#Placer').height(5);
//                    $("#TopLines").prependTo("#Page").css('margin-top','30px');
                    
                    var isInQuery = false;
                    checkFinished = function () {
                        if ($('#AlbumsView').children().length > 0) {
                            if ((opViewItems == null || opViewItems.length == 0) && !isInQuery) {
                                isInQuery = true;
                                var request = SLApp.CommunityService.GetObjectsNC
                                    (MaVasDir.DirId, MaVasDir.FlatDirId > 0 ? true : false, search, GetViewTypes(), MaVasDir.SearchOptions, MaVasDir.SearchFor, MaVasDir.SearchForAny, MaVasDir.SearchForExact,
                                        function (strimgList) {
                                            opViewItems = [];
                                            var loadWidth = 482;
                                            var par = '&f=l';
                                            var imgList = JSON.parse(strimgList);
                                            for (var i = 0; i < imgList.length; i++) {
                                                var scale = parseInt(imgList[i].SizeY) / parseInt(imgList[i].SizeX);
                                                if (scale > 1) {
                                                    //                loadWidth = loadWidth * scale;
                                                    par = '&f=p';
                                                }

                                                opViewItems.push({
                                                    imgsrc: imgList[i].SrcName,
                                                    title: imgList[i].Title,
                                                    description: imgList[i].Description,
                                                    itype: imgList[i].Type,
                                                    id: parseInt(imgList[i].ID),
                                                    scale: scale
                                                });

                                            }
                                        })
                            }
                        } else {
                            window.setTimeout(checkFinished, 1000);
                        }
                    }
                    window.setTimeout(checkFinished, 1000);
                    
/*                    VasCurr.UFOffset += VasCurr.UFCount;
                    if (VasCurr.Items >= VasCurr.UFOffset)
                        ShowUserFolder(VasCurr, null, 1);
*/
                }

                var nr = thumbSize + maxTextHeight + (Number($(".FolderViewItem").css('margin').replace(/px/, '') * 2));
                setTimeout(function () {
                    ResizeGridsImgs(true, maxScale);
                    SetIframeParentSize(thumbSize);
                }, 500);
            }
            else {
                var error = xml.getElementsByTagName('Error');
                if (error.length > 0) {
                    if (error[0].getAttribute('Message') === "NOTRIGHTPWD") {
                        //debugger;
                        window.location.href = window.location.href + '&redirect=login';
                    }
                }

            }

            HideSpinner();
        }, function () {
        });
    if (MaVasDir.UFOffset === 0) {
        CheckFolderProtection(MaVasDir.DirId);
        getPossibleDownloads(MaVasDir.DirId);
    }

    /*

        var executor = request.get_executor();
        if (executor.get_started())
            executor.abort();
    */
}

function CheckFurtherFolder() {
    if ($('#FordersAndImagesContainerEnd').length > 0) {
        if (!InFetching()) {
            if (inViewport($('#FordersAndImagesContainerEnd'))) {
                VasCurr.UFOffset += VasCurr.UFCount;
                if (VasCurr.Items >= VasCurr.UFOffset)
                    ShowUserFolder(VasCurr, null, false);
            }
        }
    }
}
function ShowUserFolderFlat(ShownUserID, DirID) {
}
var CollectSubDirs = null;
function CollectSubDirsForUser(dirID, funcSuccsess) {
    if (CollectSubDirs) {
        var executor = CollectSubDirs.get_executor();
        if (executor._xmlHttpRequest != null && executor.get_started() && !executor.get_aborted())
            executor._xmlHttpRequest.abort();
    }
    CollectSubDirs = SLApp.UserAndInfoService._staticInstance.CollectSubDirsForUser(dirID, function (strJson) {
        funcSuccsess(strJson);
        CollectSubDirs = null;
    });
}

function CloseImgView() {
    $('#ImageDlg').remove();
}
function LoadItemsAndShowImage(MaVas, ImgID) {
}

function domPurge(d) {
    if (d==null)
        return;
    var a = d.attributes, i, l, n;
    if (a) {
        for (i = a.length - 1; i >= 0; i -= 1) {
            n = a[i].name;
            if (typeof d[n] === 'function') {
                d[n] = null;
            }
        }
    }
    a = d.childNodes;
    if (a) {
        l = a.length;
        for (i = 0; i < l; i += 1) {
            domPurge(d.childNodes[i]);
        }
    }
}

function domRemove(id) {
    var elem = document.getElementById(id);
    if (elem) {
        domPurge(elem);
        return elem.parentNode.removeChild(elem);
    }
}

function ShowImage(ImgID, ItemsArround, ParentView, addHistory,items) {
    //    discardPendingImages(1);
    //    AbortAllPendingRequests();
    CurrentView.CurrentImageID = ImgID;
    if (getQueryParam('op') === 'parent') {
        SendToParent(ImgID, opViewItems);
        return;
    }

    if (ShowImageType==='slideshow') {
        OpenSlideShow($('#id_' + ImgID).data('index'), false, true);
        return;
    }
    var Items = CurrentView.Items;
    if (ParentView  !==  "FolderViewItem")
        Items = MaVas.AllItems;
    $('#MenuAnsicht').hide();
    ShowDetailView(ImgID, ItemsArround, ParentView, addHistory, true, Items, function() {
        $('#MenuAnsicht').show();
    });;
}
function fillThumbsAndShowDetailView(itemdata, index, ItemsArround, ParentView) {
    var recs = itemdata.ItemsInView;
    if (recs == undefined)
        recs = itemdata.itemsinview;
    var offset = Math.max(0, parseInt(itemdata.index) - 25) /*parseInt(ItemsArround.length / 2  )*/;
    GetImagesData(CurrentView, offset, function (ItemsArroundN) {
        ShowDetailView(itemdata.id, ItemsArroundN, ParentView, true, false, itemdata.ItemsInView);
    });
    return;
    /*
    if (index > 40 && itemdata.itemsinview > 40) {
        var offset = parseInt(itemdata.index) - parseInt(ItemsArround.length / 2);
        GetImagesData(CurrentView, offset, function (ItemsArroundN) {
            ShowDetailView(itemdata.id, ItemsArroundN, ParentView, true, false, itemdata.ItemsInView);
        });
    }
    else
        if (index < 15) {
            var offset = parseInt(itemdata.index) - CurrentView.UFCount / 2;
            offset = Math.max(0, offset);
            if (!ItemsArround[0]) {
                GetImagesData(CurrentView, offset, function (ItemsArroundN) {
                    ShowDetailView(itemdata.id, ItemsArroundN, ParentView, true, false, itemdata.ItemsInView);
                })
            } else {
                ShowDetailView(itemdata.id, ItemsArround, ParentView, true, false, itemdata.ItemsInView);

            }
        }
        else {
            ShowDetailView(itemdata.id, ItemsArround, ParentView, true, false, itemdata.ItemsInView);
        }

    */
}

function GetThumbData(index,Count, OnDone) {
        var offset = index;
        GetImagesData(CurrentView, offset, function (ItemsArroundN,Count) {
            OnDone(ItemsArroundN, true,Count);
        });

    return;
}

function render_html_to_canvas(html, ctx, x, y, width, height) {
    var data = "data:image/svg+xml;charset=utf-8," + '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
        '<foreignObject width="100%" height="100%">' +
        html_to_xml(html) +
        '</foreignObject>' +
        '</svg>';

    var img = new Image();
    img.onload = function () {
        ctx.drawImage(img, x, y);
    }
    img.src = data;
}

function html_to_xml(html) {
    var doc = document.implementation.createHTMLDocument('');
    doc.write(html);

    // You must manually set the xmlns if you intend to immediately serialize     
    // the HTML document to a string as opposed to appending it to a
    // <foreignObject> in the DOM
    doc.documentElement.setAttribute('xmlns', doc.documentElement.namespaceURI);

    // Get well-formed markup
    html = (new XMLSerializer).serializeToString(doc.body);
    return html;
}



function Show_Zoomed(ImageID) {
    $.getScript(window.location.protocol + '//' + window.location.host + "/Snippets/ZoomImage.js.axd?imgID=" + ImageID)
        .done(function (data, textStatus) {
            SLApp.CommunityService.IsPrintingAllowed(ImageID, function (printing) {
                ShowZoomed($('body'), printing, "DetailImage");
            });
        })
        .fail(function (jqxhr, settings, exception) {
            alert("Error on Zoom Image!\n\n" + jqxhr + "\n\n" + settings + "\n\n" + exception);
        });
}
var bRefrehNeed = false;
function RefreshNeedet() {
    var ret = bRefrehNeed;
    bRefreshNeed = false;
    return ret;
}

function RefreshCurrentView(IsFlat, Type, SortFor) {
    if (!CurrentView)
        CurrentView = jQuery.extend({}, MaVas);

    if (CurrentView.Type  !==  'a') {
        reloadTimeLineContent(true, true);
        removeMenu();
        return;
    }
    var VasDir = jQuery.extend({}, CurrentView);
    VasDir.UFOffset = 0;
    VasDir.UFCount = MaVas.UFCount;
    VasDir.IsFlat = IsFlat;
    VasDir.Type = Type;
    VasDir.SortFor = SortFor;
    VasDir.ListView = MaVas.ListView;
    ShowUserFolder(VasDir, 1, 1);
}
function SelectAbout(selected) {
    $('#innerAboutDiv').children().removeClass("activeAboutMenu");
    $(selected).addClass("activeAboutMenu");
}
var imgsLoadingCalls = 0;

function DisplayDate(obj, addHistory, onDone) {
    var clickedObj = "#Container_" + obj;
    if ($(clickedObj).length > 0) {
        var filter = $(clickedObj).data('filter');
        var count = $(clickedObj).data('count');
        var type = $(clickedObj).data('type');
        var objxml = $(clickedObj).data('objxml');
        if ($(clickedObj).data('hdrtxt'))
            $("#hdrTxt" + $(obj).data('elem')).text($(clickedObj).data('hdrtxt'));
        if (addHistory) {
            var path = window.location.pathname.split('/');
            var locNew = getLocElementsExcept(["anchor"], '/' + path[1]);
            var dti = SortField==="DateTaken" ? "dt." : "di.";
            AddToHistory("TimeLine", "Title", locNew + '&anchor=' + dti + obj);
        }
        imgsLoadingCalls++;
        GetNewestImages(filter, clickedObj, 0, count, type, objxml, function () {
            imgsLoadingCalls--;
            if (onDone)
                onDone(imgsLoadingCalls);
        });
    }
}


function ShowHoverShareMenu(id) {
    $('#ShareImgMenu').remove();

    var img = $('#id_' + id);
    if (img.length===0)
        return;

    var menu = $('<ul id="ShareImgMenu"></ul>').appendTo(img);
    menu.mouseleave(function () {
        HideHoverShareMenu();
    });

    var url = SetUrlParam(GetShareURL(), 'i', id);

    var facebook = $('<li>' + _locStrings['ShareMenuFacebook'] + '</li>').appendTo(menu);
    facebook.data('url', url);
    facebook.click(function () {
        var win = window.open('https://www.facebook.com/sharer.php?u=' + encodeURIComponent($(this).data('url')) + '&t=' + encodeURIComponent(_locStrings.ShareTitle), 'sl_facebook', 'height=450,width=700,scrollbars=1');
        if (win != null)
            win.focus();
        HideHoverShareMenu();
    });

    var twitter = $('<li>' + _locStrings['ShareMenuTwitter'] + '</li>').appendTo(menu);
    twitter.data('url', url);
    twitter.click(function () {
        var win = window.open('https://twitter.com/share?url=' + encodeURIComponent($(this).data('url')) + '&text=' + encodeURIComponent(_locStrings.ShareTitle), 'sl_twitter', 'height=450,width=700,scrollbars=1');
        if (win != null)
            win.focus();
        HideHoverShareMenu();
    });

    var mail = $('<li>' + _locStrings['ShareMenuMail'] + '</li>').appendTo(menu);
    mail.data('url', url);
    mail.click(function () {
        HideHoverShareMenu();
        ShareLinkWithMail($(this).data('url'));
    });
}

function HideHoverShareMenu() {
    $('#ShareImgMenu').fadeOut('fast', function () { $(this).remove(); });
}



function ShowImageShareMenu(btn, id) {
    if ($('#ShareImgDetailMenu').length > 0) {
        HideImageShareMenu();
        return;
    }

    var menu = $('<ul id="ShareImgDetailMenu"></ul>').appendTo('body');
    menu.mouseleave(function () {
        HideImageShareMenu();
    });

    var url = SetUrlParam(GetShareURL(), 'i', id);

    var facebook = $('<li>' + _locStrings['ShareMenuFacebook'] + '</li>').appendTo(menu);
    facebook.data('url', url);
    facebook.click(function () {
        var win = window.open('https://www.facebook.com/sharer.php?u=' + encodeURIComponent($(this).data('url')) + '&t=' + encodeURIComponent(_locStrings.ShareTitle), 'sl_facebook', 'height=450,width=700,scrollbars=1');
        if (win != null)
            win.focus();
        HideImageShareMenu();
    });

    var twitter = $('<li>' + _locStrings['ShareMenuTwitter'] + '</li>').appendTo(menu);
    twitter.data('url', url);
    twitter.click(function () {
        var win = window.open('https://twitter.com/share?url=' + encodeURIComponent($(this).data('url')) + '&text=' + encodeURIComponent(_locStrings.ShareTitle), 'sl_twitter', 'height=450,width=700,scrollbars=1');
        if (win != null)
            win.focus();
        HideImageShareMenu();
    });

    var mail = $('<li>' + _locStrings['ShareMenuMail'] + '</li>').appendTo(menu);
    mail.data('url', url);
    mail.click(function () {
        HideImageShareMenu();
        ShareLinkWithMail($(this).data('url'));
    });


    var x = btn.offset().left;
    if (x + menu.outerWidth() > $(window).width())
        x = $(window).width() - menu.outerWidth();

    var y = btn.offset().top + btn.outerHeight();
    if (y + menu.outerHeight() > $(window).height())
        y = btn.offset().top - menu.outerHeight();

    menu.css({ left: x + 'px', top: y + 'px' });
}

function HideImageShareMenu() {
    $('#ShareImgDetailMenu').fadeOut('fast', function () { $(this).remove(); });
}

function scrollToContainer(elem, time, finished) {
    if (!time)
        time = 20;
    var currPos = UseOwnScrollbar() ? $('#ScrollableContentLayer').scrollTop() : $(window).scrollTop();
    if ($("#Container_" + elem).length===0)
        return;
    var topOffset = $('.CommunityMenuContent').height();
    if ($("#HeaderSearch2").visible())
        topOffset += $("#HeaderSearch2").height();

    var posT = $("#Container_" + elem).offset().top + currPos - topOffset;
    if (UseOwnScrollbar()) {
        if (posT === $('#ScrollableContentLayer').scrollTop()) {
            if (finished) {
                finished();
            }
            return;
        }
        $('#ScrollableContentLayer').animate({
            scrollTop: posT
        }, time, "swing", function () {
            if (finished) {
                finished();
            }
        });
    }
    else {
        $(window).scrollTop(posT);
    }
}

function CheckSelectionForMenue() {
    SLApp.CommunityService.CheckSelectionForMenu(function (elem) {
        var theResult = JSON.parse(elem);

        if (theResult.geo || (MaVas != null && MaVas.AllowDirMap))
            $('#ShowInMaps').removeClass('DisabledMenu');
        else
            $('#ShowInMaps').addClass('DisabledMenu');

        countSelectItems = theResult.count;
        if (countSelectItems > 0) {
            $('#MenuSelect').removeClass('HiddenMenu');
            $('#MenuDownloadSelected a').removeClass('disabled');
        }
        else {
            $('#MenuSelect').addClass('HiddenMenu');
            $('#MenuDownloadSelected a').addClass('disabled');
        }
    });
}

function FormatToLength(val, len) {
    var str = parseInt(val).toString();
    var place = "          ";
    if (str.length < len) {
        str = place.substr(0, len - str.length) + str;
    }
    return str;
}

function showDownloadInfo(result, files) {
    SLApp.DownloadHandler.CheckDownload(result, function (howfar) {
        var obj = JSON.parse(howfar);
        if (obj) {
            if (obj.percentComplete === 100 && obj.ZipFiles === 1) {
                if (obj.ZipFilesData[0].Downloaded === 1)
                    return;
            }
        }

        $('#DownloadingInfo').show();

        $('<div id="d' + result + '"><div class="FileDownload" id="fild_' + result + '"><span id="txt_' + result + '">' + _localized['DownloadProgress'] + '</span><div class="progOuter"><div class="ProgFilesPrepare" id="' + result + '"><span class="procText" id="prg_txt_' + result + '"></span></div></div><div class="CancelDownload" data-id="' + result + '">' + _localized['Cancel'] + '</div><div class="CloseDeleteDwonl" data-id="' + result + '"></div></div></div>').appendTo($('#DownloadingInfo'));
        $('#' + result).progressbar({
            value: 0
        });
        var pV = $('#' + result).find(".ui-progressbar-value");
        pV.css({ 'background': '#404040' });
        var tm = window.setInterval(function () {
            SLApp.DownloadHandler.CheckDownload(result, function (howfar) {
                if (howfar == '')
                    return;

                var obj = JSON.parse(howfar);
                if (obj) {
                    HideSpinner();
                    $('#' + result).progressbar('option', 'value', parseInt(obj.percentComplete));
                    $('#prg_txt_' + result).text('' + obj.filesCompressed + '/' + obj.totalFiles + ' ' + _localized["Files"]);

                    if (obj.finished === true) {
                        if (obj.ZipFiles === 1) {
                            clearInterval(tm);

                            if (obj.ZipFilesData[0].Downloaded === 0)
                                $('<iframe style="display:none" src="/GetDownload.ashx?idx=' + '0' + '&ID=' + result + '"></iframe>').appendTo('body');
                            $('#d' + result).remove();
                            if ($('#DownloadingInfo').children().length===0)
                                $('#DownloadingInfo').hide();
                            if (DownloadComesFromSelected) {
                                UnselectAllItems();
                                DownloadComesFromSelected = false;
                            }

                        }
                        else if (obj.ZipFiles > 1) {
                            clearInterval(tm);

                            $('#' + result).remove();
                            $('#txt_' + result).text(_localized['AllFilesPreparedDnl']);
                        }
                    }

                    if (obj.ZipFiles > 0) {
                        if (!$('#Btns' + result).length)
                            $('<div class="DownloadButtonsContainer" id="Btns' + result + '"></div>').appendTo('#d' + result);

                        for (var cbI = 0; cbI < obj.ZipFiles; cbI++) {
                            if (!$('#dqnl_' + cbI + '_' + result).length) {
                                var txt = _localized['downfile'].replace('{0}', '<span class="numbs">' + (cbI + 1) + '</span>');
                                $('<div class="NewDownloadBtn" id="dqnl_' + cbI + '_' + result + '" data-id="' + result + '" data-idx="' + cbI + '">' + txt + '</div>').appendTo('#Btns' + result).click(function () {
                                    var result = $(this).data('id');
                                    $('<iframe style="display:none" src="/GetDownload.ashx?idx=' + parseInt($(this).data('idx')) + '&ID=' + result + '"></iframe>').appendTo('body');
                                });
                            }
                        }
                    }
                }
            });
        }, 1000);
    });
}

var $spinner = null;

function ShowSpinner(appender, spWidth) {
    if ($('#commSpinner').length===0) {
        if (!appender)
            appender = 'body';
        $('<div id="commSpinner"><div id="commSpinnerCell"><div id="spinnIt"></div></div></div>').appendTo(appender);
        var StepWidth = 12;
        var KnockOutRatio = 0.6;

        if (spWidth) {
            StepWidth = 2;
            KnockOutRatio = 0.5;
            $("#spinnIt").css({ width: spWidth + 'px', height: spWidth + 'px' });
        }

        var $spinnerDiv = $("#spinnIt");
        $spinner = $spinnerDiv.progressSpin({ fillColor: "rgba(227,0,15,1)", activeColor: "#f0f0f0", stepWidth: StepWidth, cornerRadius: 0, tailCount: 0, knockOutRatio: KnockOutRatio, cycleTime: 3000 });
        $spinner.start();
    }
}

function HideSpinner() {
    if ($('#commSpinner').length > 0) {
        if ($spinner != null && $spinner.length > 0)
            $spinner.stop();
        $('#commSpinner').remove();
    }
}
function loadItemInView(id, onEnd) {
    if ($('#id_' + id).length===0) {
        VasCurr.UFOffset += VasCurr.UFCount;
        if (VasCurr.Items >= VasCurr.UFOffset) {
            ShowUserFolder(VasCurr, null, 1, function () {
                loadItemInView(id, onEnd);
            });
        }
    }
}

function OpenFolderAndScrollToItem(id, dirID, nohilite) {
    var idItem = $('#id_' + id);

    var VasDir = jQuery.extend({}, MaVas);
    if (CurrentView)
        VasDir = jQuery.extend({}, CurrentView);
    var reLoad = false;
    if (VasDir.DirId  !==  dirID)
        reLoad = true;
    VasDir.ParentId = MaVas.DirId;
    VasDir.DirId = dirID;
    VasDir.UFOffset = 0;
    VasDir.Type = 'a';
    SelectAbout("#Albums");

    if ($('#id_' + id).length===0 || reLoad === true) {
        ShowUserFolder(VasDir, 1, 1, function () {
            $('#ScrollableContent').scrollTop(0);
            window.setTimeout(function () {
                if (idItem.length===0) {
                    loadItemInView(id, function () {
                    });
                }
            }, 500);
            var TimeUsed = 0;
            var scrollToInterv = window.setInterval(function (noHiLite) {
                if ($('#id_' + id).length  !==  0) {
                    if (!noHiLite)
                        $('#id_' + id).css({ 'background-color': 'lightGray', 'border': '1px dotted #DC0811' });

                    if (UseOwnScrollbar())
                        $('#ScrollableContentLayer').scrollTop($('#id_' + id).position().top);
                    else
                        $(window).scrollTop($('#id_' + id).position().top);

                    if (TimeUsed < 18000)
                        TimeUsed = 18000;
                }

                TimeUsed += 200;
                if (TimeUsed > 20000)
                    window.clearInterval(scrollToInterv);
            }, 200, nohilite);
        });
    } else {
        var TimeUsed = 0;
        var scrollToInterv = window.setInterval(function (noHiLite) {
            if ($('#id_' + id).length  !==  0) {
                if (!noHiLite)
                    $('#id_' + id).css({ 'background-color': 'lightGray', 'border': '1px dotted #DC0811' });

                if (UseOwnScrollbar())
                    $('#ScrollableContentLayer').scrollTop($('#id_' + id).position().top);
                else
                    $(window).scrollTop($('#id_' + id).position().top);

                if (TimeUsed < 18000)
                    TimeUsed = 18000;
            }
            TimeUsed += 200;
            if (TimeUsed > 20000)
                window.clearInterval(scrollToInterv);
        }, 200, nohilite);
    }
}

function onShareLinkWithMail(parms) {
    $('#sharemail_name').val(parms['yourName']);
    $('#sharemail_from').val(parms['yourMail']);

    $('#sharemail_url').val(parms['longUrl']);
    $('#sharemail_url').attr('title', parms['longUrl']);
    $('#sharemail_url').click(function () {
        $(this).select();
    });

    if (parms['shortUrl']  !==  '') {
        $('#sharemail_shorturl').data('longUrl', parms['longUrl']);
        $('#sharemail_shorturl').data('shortUrl', parms['shortUrl']);
        $('#sharemail_shorturl').click(function () {
            var url = $(this).is(':checked') ? $(this).data('shortUrl') : $(this).data('longUrl');
            $('#sharemail_url').val(url);
            $('#sharemail_url').attr('title', url);
        });
    }
    else {
        $('#sharemail_shorturl').parent().remove();
    }

    if (parms['IsLoggedIn']) {
        $("#sharemail_to").autocomplete({
            appendTo: '#sharemail',
            minLength: 2,
            source: function (request, response) {
                var prefix = $('#sharemail_to').val();
                if (prefix.lastIndexOf(';') >= 0)
                    prefix = prefix.substring(prefix.lastIndexOf(';') + 1);

                if (prefix.length >= 2) {
                    var param = { prefixText: prefix.trim() };
                    $.ajax({
                        url: 'UserAndInfoService.asmx/CollectEmailConversation',
                        data: JSON.stringify(param),
                        dataType: "json",
                        type: "POST",
                        contentType: "application/json; charset=utf-8",
                        dataFilter: function (data) { return data; },
                        success: function (data) {
                            response($.map(data.d, function (item) {
                                return {
                                    value: item
                                }
                            }))
                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            ;
                        }
                    });
                }
            },
            select: function (event, ui) {
                var recipients = $('#sharemail_to').val();
                if (recipients.lastIndexOf(';') < 0)
                    $('#sharemail_to').val(ui.item.value);
                else
                    $('#sharemail_to').val(recipients.substr(0, recipients.lastIndexOf(';')) + '; ' + ui.item.value);
                event.preventDefault();
            }
        }).data('ui-autocomplete')._renderItem = function (ul, item) {
            ul.addClass('MaintainerDialogAutocomplete');
            return $('<li class="MaintainerDialogAutocompleteItem"></li>')
                .append(EncodeHTML(item.label))
                .appendTo(ul);
        };
    }
}

function ShareLinkWithMail(shareURL) {
    SLApp.CommunityService.QueryShareInfo(shareURL, function (res) {
        var parms = JSON.parse(res);
        if (parms['yourName'] === '' && parms['yourMail'] === '') {
            parms['IsLoggedIn'] = false;
        }
        else {
            parms['IsLoggedIn'] = true;
        }

        var dlg = new MaintainerDlg('share-mail', 450);

        dlg.SetButton(_locStrings.ShareSendMailOK, function () {
            if ($(this).hasClass('MaintainerDialogButtonsDisabled'))
                return;
            $(this).addClass('MaintainerDialogButtonsDisabled');

            if ($('#sharemail_name').val()==='') {
                $(this).removeClass('MaintainerDialogButtonsDisabled');
                dlg.SetErrorText(_locStrings.ShareSendMailEmptyName);
                $('#sharemail_name').focus();
                return;
            }
            if ($('#sharemail_from').val()==='' || !ValidateEmail($('#sharemail_from').val())) {
                $(this).removeClass('MaintainerDialogButtonsDisabled');
                dlg.SetErrorText(_locStrings.ShareSendMailErrorMail);
                $('#sharemail_from').focus();
                return;
            }
            if ($('#sharemail_to').val()==='' || !ValidateEmail($('#sharemail_to').val())) {
                $(this).removeClass('MaintainerDialogButtonsDisabled');
                dlg.SetErrorText(_locStrings.ShareSendMailErrorMail);
                $('#sharemail_to').focus();
                return;
            }

            var btnOK = $(this);
            SLApp.CommunityService.ShareLinkWithMail($('#sharemail_name').val(), $('#sharemail_from').val(), $('#sharemail_to').val(), _locStrings.LanguageCode, $('#sharemail_url').val(), $('#sharemail_msg').val(), function (res) {
                switch (res) {
                    case 'ok':
                        dlg.Close();
                        break;
                    default:
                        dlg.SetErrorText(_locStrings.ShareSendMailErrorUnknown);
                        btnOK.removeClass('MaintainerDialogButtonsDisabled');
                        break;
                }
            });
        });
        dlg.SetButton(_locStrings.Cancel, function () {
            dlg.Close();
        });

        dlg.Open(onShareLinkWithMail, parms);
    });
}



var dtime = new Date();

function logToConsole(str) {

    var d = new Date();

    console.log(d.getTime() - dtime.getTime() + ' ', str);

}

SendToParent = function (ImgID,itemsArray) {
    var arr = [];
    var idx = 0;
    for (var i = 0; i < itemsArray.length; i++) {
        arr.push({src:itemsArray[i].imgsrc, title:itemsArray[i].title, descr:itemsArray[i].description, type:itemsArray[i].itype, id:itemsArray[i].id,scale:itemsArray[i].scale });
        if (itemsArray[i].id === ImgID)
            idx = i;
    }
    window.parent.postMessage({
        emitter: window.name,      // Security Check; must match the IFRAME name attribute.
        action: 'ShowImage',
        imgs: JSON.stringify(arr),
        idx: idx
    },
        '*'
    );

}

var music = new Audio();

function StopPlayingMusic() {
    music.pause();
    $('.SoundPlayShow').each(function () {
        let $btn = $(this);
        $btn.children("svg").remove();
        $('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"> <circle class="SoundPlayButton" cx="256" cy="256" r="256" /> <polygon style="fill:#FFFFFF;" points="193.93,148.48 380.16,256 193.93,363.52 " /></svg>').appendTo($(this));
        $btn.data('playing', 0);
    });

}
function playMusic(file) {
    music.pause();
    music = new Audio(file);
    music.play();
}

function updateSoundPlay() {
    $('.SoundPlayShow').off("click");
    $('.SoundPlayShow').on("click", function () {
        let $btn = $(this);
        $btn.children("svg").remove();
        if (!$btn.data('playing')) {
            StopPlayingMusic()
            $btn.children("svg").remove();
            $('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"> <circle class="SoundPlayButton" cx="256" cy="256" r="256" /><rect xmlns="http://www.w3.org/2000/svg" style="fill: #ffffff;" x="150" y="120" width="80" height="250" /><rect xmlns="http://www.w3.org/2000/svg" style="fill: #ffffff;" x="280" y="120" width="80" height="250" /></svg>').appendTo($(this));
            playMusic("/SLSND_" + $(this).data('id') + ".mp3");
            $btn.data('playing', 1);
        } else {
            StopPlayingMusic()
        }
    });
}


function OnShowAdvancedSearch(parms) {
    $('#dlg-search-advanced').css('min-width', '500px');

    $('#advsearch_search_for').val(parms['Search']);
    try {
        $("#advsearch_search_for").autocomplete({
            appendTo: '#advsearch',
            minLength: 2,
            source: function (request, response) {
/*                if (!$('#advsearch_search_for_spin').is(':visible'))
                    $('#advsearch_search_for_spin').css('display', 'block');
                SLApp.UserAndInfoService.GetCompletionList($('#advsearch_search_for').val(), 100, 'rootdir=' + MaVas.DirId, function (data) {
                    response($.map(data.d, function (item) {
                        return {
                            value: item
                        }
                    }))

                }, function (er) {
                    $('#advsearch_search_for_spin').css('display', 'none');

                });
*/
                var param = { prefixText: $('#advsearch_search_for').val(), count: 100, contextKey: 'rootdir=' + MaVas.DirId };
                $.ajax({
                    url: "/UserAndInfoService.asmx/GetCompletionList",
                    data: JSON.stringify(param),
                    dataType: "json",
                    type: "POST",
                    contentType: "application/json; charset=utf-8",
                    dataFilter: function (data) { return data; },
                    success: function (data) {
                        response($.map(data.d, function (item) {
                            return {
                                value: item
                            }
                        }))
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        $('#advsearch_search_for_spin').css('display', 'none');
                    }
                });

            },
            open: function (event, ui) {
                $('#advsearch_search_for_spin').css('display', 'none');
            },
            select: function (event, ui) {
                $('#advsearch_search_for').val(ui.item.value)
            },
            _renderItem: function (ul, item) {
                return $("<li>")
                    .attr("data-value", item.value)
                    .append(item.label)
                    .appendTo(ul);
            }
        })
    } catch (e) { };

    try {
        $("#advsearch_search_any").autocomplete({
            appendTo: '#advsearch',
            minLength: 2,
            source: function (request, response) {
                if (!$('#advsearch_search_any_spin').is(':visible'))
                    $('#advsearch_search_any_spin').css('display', 'block');

                var param = { prefixText: $('#advsearch_search_any').val(), count: 100, contextKey: 'rootdir=' + MaVas.DirId };
                $.ajax({
                    url: "/UserAndInfoService.asmx/GetCompletionList",
                    data: JSON.stringify(param),
                    dataType: "json",
                    type: "POST",
                    contentType: "application/json; charset=utf-8",
                    dataFilter: function (data) { return data; },
                    success: function (data) {
                        response($.map(data.d, function (item) {
                            return {
                                value: item
                            }
                        }))
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        $('#advsearch_search_any_spin').css('display', 'none');
                    }
                });
            },
            open: function (event, ui) {
                $('#advsearch_search_any_spin').css('display', 'none');
            },
            select: function (event, ui) {
                $('#advsearch_search_any').val(ui.item.value)
            },
            _renderItem: function (ul, item) {
                return $("<li>")
                    .attr("data-value", item.value)
                    .append(item.label)
                    .appendTo(ul);
            }
        })
    } catch (e) { };

    switch (parms['Scope']) {
        case 'all':
            $('#advsearch_scope_all').prop('checked', true);
            break;
        case 'folder':
            $('#advsearch_scope_folder').prop('checked', true);
            break;
    }
}
function ShowAdvancedSearch() {
    var parms = { Scope: $('#Searcher').data('scope'), Search: $('#SearchEdit').val() };
    if ($('#SearchEdit1').is(':visible'))
        parms['Search'] = $('#SearchEdit1').val();

    var dlg = new MaintainerDlg('search-advanced');

    dlg.SetButton(_locStrings.Ok, function () {
        $('#SearchEdit').val($('#advsearch_search_for').val().trim());
        $('#SearchEdit1').val($('#advsearch_search_for').val().trim());

        $('#SearchAny').val($('#advsearch_search_any').val().trim());

        $('#SearchExact').val($('#advsearch_search_exact').val().trim());

        if ($('#SearchEdit').val() != '' || $('#SearchAny').val() != '' || $('#SearchExact').val() != '')
            $('#Searcher').click();

        dlg.Close();
    });
    dlg.SetButton(_locStrings.Cancel, function () {
        dlg.Close();
    });

    dlg.Open(OnShowAdvancedSearch, parms);
}
