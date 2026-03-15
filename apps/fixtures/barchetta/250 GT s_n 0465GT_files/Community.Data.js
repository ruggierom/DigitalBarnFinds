function GetObjectSrc(item, loadWidth, par) {

    if (MaVas.DetailDisplay == 'parent' && item.getAttribute("guid"))
        return item.getAttribute("SrcName") + '_' + item.getAttribute("Vs") + '.jpg';
    //          
    switch (parseInt(item.getAttribute("Type"))) {
        case 1:
            return '/SLOAIMGTMB_' + item.getAttribute("ID") + '_' + item.getAttribute("dirID") + '_' + item.getAttribute("Vs") + '.jpg?w=' + loadWidth + par;
        //            return '/SLVID_' + item.getAttribute("ID") + '.m4v" type="video/mp4';
        default:
            return '/SLOAIMGTMB_' + item.getAttribute("ID") + '_' + item.getAttribute("dirID") + '_' + item.getAttribute("Vs") + '.jpg?w=' + loadWidth + par;
    }
}

function HasOneOf(element, inArray) {
    for (var cbI = 0; cbI < inArray.length; cbI++) {
        if (element.toLowerCase().startsWith(inArray[cbI] + "="))
            return true;
    }
    return false;
}

function CheckFolderProtection(DirID, ImgID) {
    if (ImgID == undefined)
        ImgID = -1;

    SLApp.CommunityService.IsFolderProtected(DirID, ImgID, function (Protection) {
        /*if (Protection === '0')
            $('#MenuShare').show();
        else
            $('#MenuShare').hide();*/
    });
}


function getLocElementsExcept(noElements, folderAddInfo, view) {
    if (!folderAddInfo)
        folderAddInfo = '/';
    if (!folderAddInfo.startsWith('/'))
        folderAddInfo = '/' + folderAddInfo;
    var loc = window.location.origin + folderAddInfo;
    var first = true;

    if (window.location.search.length > 1) {
        var elem = window.location.search.substring(1).split("&");

        for (var i = 0; i < elem.length; i++) {
            if (!HasOneOf(elem[i], noElements)) {
                loc += first ? '?' : '&';
                loc += elem[i];
                first = false;
            }
        }
    }

    if (view) {
        loc += first ? '?' : '&';
        loc += 'v=' + view;
    }
    return loc;
}

function GetImagesData(MaVas, offset, onDone) {
    var Loader = jQuery.extend({}, MaVas);
/*    if (MaVas.Index > 50 && MaVas.UFCount > 50)
        offset = MaVas.Index - 25;
*/
    Loader.UFCount = MaVas.UFCount;
    Loader.UFOffset = offset;
    LoadItems(Loader, function (xml) {
        var info = xml.getElementsByTagName('Info');
        if (info.length > 0) {
            var Items = parseInt(info[0].getAttribute('Items'));
            if (MaVas != null)
                MaVas.Items = Items;
            if (CurrentView != null)
                CurrentView.Items = Items;

            var files = parseInt(info[0].getAttribute('Documents'));
            var Dirs = parseInt(info[0].getAttribute('Dirs'));
            var imgList = xml.getElementsByTagName('Image');
            var i = 0;
            var strFilesCnt = "";
            itemsArray = new Array(imgList.length);

            for (var cbI = 0; cbI < imgList.length; cbI++) {
                if (cbI > -1) {

                    var scaleI = parseInt(imgList[i].getAttribute("OrigHeight")) / parseInt(imgList[i].getAttribute("OrigWidth"));
                    var loadWidth = 200;
                    var par = '&f=l';
                    if (scaleI > 1) {
                        par = '&f=p';
                    }

                    var croppedHeight = imgList[i].getAttribute("OrigWidth") * 2 / 3;
                    itemsArray[cbI] = {
                        type: "img",
                        id: parseInt(imgList[i].getAttribute('ID')),
                        ext: imgList[i].getAttribute('Ext'),
                        sizex: imgList[i].getAttribute("OrigWidth"),
                        sizey: imgList[i].getAttribute("OrigHeight"),
                        title: imgList[i].getAttribute('HoverTitle'),
                        description: imgList[i].getAttribute('HoverDescription'),
                        href: imgList[i].getAttribute('Link'),
                        datet: imgList[i].getAttribute('DateTaken'),
                        print: imgList[i].getAttribute('AllowPrint'),
                        downl: imgList[i].getAttribute('AllowDownload'),
                        geo: imgList[i].getAttribute('GPS'),
                        protected: imgList[i].getAttribute('Protected'),
                        selected: imgList[i].getAttribute('Selected'),

                        imgsrc: GetObjectSrc(imgList[i], loadWidth, par),
                        imgtmb: GetObjectSrc(imgList[i], loadWidth, par),

                        itype: imgList[i].getAttribute("Type"),

                        //                                cropsizey: croppedHeight,
                        grid: "",
                        scale: scaleI.toString(),
                        hotx: imgList[i].getAttribute('HotSpotX'),
                        hoty: imgList[i].getAttribute('HotSpotY'),
                        index: parseInt(imgList[i].getAttribute('Index')),
                        dir: imgList[i].getAttribute('dirID'),
                        version: imgList[i].getAttribute('Vs'),
                        ItemsInView: Items
                    };
                    i++;
                }
            }
            onDone(itemsArray, Items);
        }
    });
}

function LoadItems(MaVas, onDataThere) {
    var flatVal = "";
    if (MaVas.IsFlat === 'True') {
        MaVas.FlatDirId = MaVas.DirId;
        flatVal = "&flat=true";
    }
    else
        MaVas.FlatDirId = -1;
    var SortFor = "DisplayOrder, SortOrder";

    var search = getQueryParam("ft");
    var Sort = '';
    var DisplayDirs = MaVas.DisplayDirs;

    if (search && search.startsWith("search") === true) {
        if (MaVas.SortFor !== 'random')
            Sort = search;

        DisplayDirs = false;
        $('.NoSearch').hide();
        //    var request = SLApp.CommunityService.QueryMoreImagesFiltered
    }
    else {
        try {
            if (!MenuHide)
                $('.NoSearch').show();
        } catch (err) { ; };
        if (MaVas.SortFor !== 'random')
            Sort = 'so=' + MaVas.SortFor;
    }
    var tiFo = getQueryParam("v");
    if (!tiFo)
        tiFo = "a";
    var request = null;
    if (tiFo[0] === "t") {
        var SortFor = "so=" + SortField + " DESC, DispOrder, SortOrder ";

        QueryMoreImagesFiltered
            (window.location.search, MaVas.RootDirId, MaVas.UFOffset, MaVas.UFCount, MaVas.RootDirId, MaVas.RootDirId, DisplayDirs, SortFor, parseInt(MaVas.ViewTypes), '*', '', '', '', 220, 160, 400, 300, false, function (xml) {
                if (onDataThere)
                    onDataThere(xml);
            }, function () {
            });
    } else {

        request = QueryMoreImagesFiltered
            (window.location.search, MaVas.DirId, MaVas.UFOffset, MaVas.UFCount, MaVas.RootDirId, MaVas.FlatDirId, MaVas.DisplayDirs, Sort, parseInt(MaVas.ViewTypes), MaVas.SearchOptions, MaVas.SearchFor, MaVas.SearchForAny, MaVas.SearchForExact, 220, 60000, 400, 60000, false,
                function (xml) {
                    if (onDataThere)
                        onDataThere(xml);
                }, function () {
                });
    }
}
var InQueryMoreImgs = false;
function InFetching() {
    return InQueryMoreImgs;
}

var allRequests = [];
function QueryMoreImagesFiltered(locS, DirID, Offset, Count, RootDirId, FlatDirId, DisplayDirs, queryFT, ViewTypes, searchOpt, filter, filterAny, filterExact, nMaxThumbWidth, nMaxThumbHeight, nMaxHoverWidth, nMaxHoverHeight, bFullInfo, onSuccess, onFail) {
    InQueryMoreImgs = true;
    if (MaVas.ListView === true)
        bFullInfo = true;
    if (!Count)
        Count = 50;
/*
    console.log("Calling QueryMoreImgs: " +
        " DirID:" + DirID +
        " Offset:" + Offset +
        " Count:" + Count +
        " RootDirId:" + RootDirId +
        " FlatDirId:" + FlatDirId +
        " SortFor:" + SortFor +
        " ViewTypes:" + ViewTypes +
        " searchOpt:" + searchOpt +
        " filter:" + filter +
        " nMaxThumbWidth:" + nMaxThumbWidth +
        " nMaxThumbHeight:" + nMaxThumbHeight +
        " nMaxHoverWidth:" + nMaxHoverWidth +
        " nMaxHoverHeight:" + nMaxHoverHeight +
        " bFullInfo:" + bFullInfo
    );
*/
    //if (filter == undefined || DirID === 0)
    //    debugger;

    if (DisplayDirs == undefined)
        DisplayDirs = true;

    var request = SLApp.CommunityService._staticInstance.QueryMoreImagesFiltered
        (locS, DirID, Offset, Count, RootDirId, FlatDirId, DisplayDirs, queryFT, ViewTypes, searchOpt, filter, filterAny, filterExact, nMaxThumbWidth, nMaxThumbHeight, nMaxHoverWidth, nMaxHoverHeight, bFullInfo, function (xml) {
            onSuccess(xml);
            GotImagesLoaded();
            InQueryMoreImgs = false;
        }, function (err) {
            if (err.get_statusCode() !== -1)
                displayErrorMesssage(err.get_message(), _localized.Error);

            console.log("Query More Images Aborted! ");
            InQueryMoreImgs = false;
        });
    allRequests.push(request);
    return request;
}

function GetFolderPath(unk, DirID, RoodID, boole, onSuccess, onErr) {
    var request = SLApp.CommunityService._staticInstance.GetFolderPath(unk, DirID, RoodID, boole, function (par) {
        onSuccess(par)
    }, function (err) {
        if (typeof onErr != "undefined")
            onErr(err);
    });
    allRequests.push(request);
    return request;
}

function AbortAllPendingRequests() {

    for (var i = 0; i < allRequests.length; i++) {
        var request = allRequests[i];
        var executor = request.get_executor();
        if (executor.get_started())
            if (!executor.get_aborted())
                executor.abort();
        request.aborted = true;
    }
    allRequests.slice(0, allRequests.length);
}

String.prototype.plusDecode = function () {
    try{
        return decodeURIComponent(this.replace(/\+/gm, "%20"));
    }catch(e){
        return this;
    }
}