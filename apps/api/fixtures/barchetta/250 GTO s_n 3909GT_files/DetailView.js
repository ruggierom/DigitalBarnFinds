var ItemsArroundCurrentImage = null;
var UndoRedoJson = null;
(function ($) {
    $.fn.collidesWith = function (elements) {
        var rects = this;
        var checkWith = $(elements);
        var c = $([]);

        if (!rects || !checkWith) {
            return false;
        }

        rects.each(function () {
            var rect = $(this);

            // define minimum and maximum coordinates
            var rectOff = rect.offset();
            var rectMinX = rectOff.left;
            var rectMinY = rectOff.top;
            var rectMaxX = rectMinX + rect.outerWidth();
            var rectMaxY = rectMinY + rect.outerHeight();

            checkWith.not(rect).each(function () {
                var otherRect = $(this);
                var otherRectOff = otherRect.offset();
                var otherRectMinX = otherRectOff.left;
                var otherRectMinY = otherRectOff.top;
                var otherRectMaxX = otherRectMinX + otherRect.outerWidth();
                var otherRectMaxY = otherRectMinY + otherRect.outerHeight();

                // check for intersection
                if (rectMinX >= otherRectMaxX ||
                    rectMaxX <= otherRectMinX ||
                    rectMinY >= otherRectMaxY ||
                    rectMaxY <= otherRectMinY) {
                    return true; // no intersection, continue each-loop
                } else {
                    // intersection found, add only once
                    if (c.length == c.not(this).length) {
                        c.push(this);
                    }
                }
            });
        });
        // return collection
        return c;
    }
})(jQuery);

function doPrint() {


    var ImgFields = $('#' + $('.ImgDlg .ImgViewDlg').first().data('idd') + '_ImgViewDlg').data('imgfields');

    if (ImgFields.ext.toLowerCase() === '.pdf') {
        $('<iframe id="printPdf" name = "iframe_a" src = "\PDFDocP.ashx?id=' + ImgFields.ID + '"/>').appendTo('body');
        ///                printPdf('/MEDIA_' + ImgFields.ID + '_' + ImgFields.SizeX + '_' + ImgFields.SizeY + '.pdf');
        //                printJS('/MEDIA_' + ImgFields.ID + '_' + ImgFields.SizeX + '_' + ImgFields.SizeY + '.pdf');
    } else {
        printIt.PrintWithPDF(ImgFields);
        /*
                var rotate = '';
                if (ImgFields.SizeX > ImgFields.SizeY)
                    rotate = '&Rot=3';
                var scale = ImgFields.SizeY / ImgFields.SizeX;
                if (ImgFields.SizeY < ImgFields.SizeX)
                    scale = ImgFields.SizeX / ImgFields.SizeY;
                var dinA4 = 297 / 210;
                var style = 'width:100%;';
                if (scale > dinA4)
                    style = 'height=100%';
                printJS({
                    printable: "/MCIMG_" + ImgFields.ID + "_" + ImgFields.SizeX + "_" + + ImgFields.SizeY + ImgFields.ext + "?v=" + $R('#theImg').data('version') + rotate,
                    type: 'image',
                    imageStyle: style,
                    docuemtnTitle: 'MediaCenter.PLUS'
                });
                */
    }
    return true;
    /*
    */
};

var styleSheets = null;
var getStyle = function (className) {
    try {
        if (styleSheets == null) {
            styleSheets = new Array();
            for (s = 0; s < document.styleSheets.length; s++) {
                if (!document.styleSheets[s].href || document.styleSheets[s].href.substr(0, window.location.origin.length) == window.location.origin)
                    styleSheets.push(document.styleSheets[s]);
            }
        }

        for (s = 0; s < styleSheets.length; s++) {
            if (styleSheets[s] instanceof CSSStyleSheet && styleSheets[s].cssRules) {
                if (styleSheets[s].rules !== 'undefined')
                    classes = styleSheets[s].rules;
                else
                    classes = styleSheets[s].cssRules;

                for (x = 0; x < classes.length; x++) {
                    if (classes[x].selectorText === className) {
                        return (classes[x].cssText ? classes[x].cssText : classes[x].style.cssText);
                    }
                }
            }
        }
    }
    catch (e) {
        console.log('Error while getting style ' + className);
    }
    /*
        for (sheets = document.styleSheets.length - 1; sheets >= 0; sheets--) {
            try {
                if (typeof document.styleSheets[sheets].rules !== 'undefined')
                    classes = document.styleSheets[sheets].rules;
                else
                    classes = document.styleSheets[sheets].cssRules;
                for (x = 0; x < classes.length; x++) {
                    if (classes[x].selectorText === className) {
                        return (classes[x].cssText ? classes[x].cssText : classes[x].style.cssText);
                    }
                }
            } catch (e) { ; };
    
    }
    */
    return false;
};


(function ($) {

    var isIE = /*@cc_on!@*/false || !!document.documentMode;
    var startTmbPos = 0;
    var CropRect = null;
    var LastUsedRatio = null;
    var jcrop_api = null;
    var StartRect = null;
    var CurRatio = null;
    var animTime = 750;
    var timerInput = 0;
    var TO_RADIANS = Math.PI / 180;

    var UpdImageInterVal = 0;
    var bodyTag;
    var DVDowloadMenuShow = false;
    var mousedown = false;
    var idd = "";
    var ImgViewScrollPos = 0;
    var theView = null;
    var PDFObjectLoaded = false;
    function loadScript(url, callback) {
        // Adding the script tag to the head as suggested before
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;

        // Then bind the event to the callback function.
        // There are several events for cross browser compatibility.
        script.onreadystatechange = callback;
        script.onload = callback;

        // Fire the loading
        head.appendChild(script);
    }


    function loadScriptModule(src) {
        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = src;
            script.onload = resolve;

            script.onerror = function () {
                reject(new Error("Cannot load script at: ".concat(script.src)));
            };

            (document.head || document.documentElement).appendChild(script);
        });
    }

    Math.trunc = Math.trunc || function (x) {
        if (isNaN(x)) {
            return NaN;
        }
        if (x > 0) {
            return Math.floor(x);
        }
        return Math.ceil(x);
    };

    $R = function (id) {
        return $('#' + idd + '_' + id.substring(1));
    };
    $RI = function (idd, id) {
        return $('#' + idd + '_' + id.substring(1));
    };
    $RV = function (idd, id) {
        return $(id + '_' + idd);

    };

    CheckMaxTmbSlidePos = function (newLeft) {

        var l = 0;
        var posL = $('.IV_Tmb').last().outerWidth() * $('.IV_Tmb').last().index();
        var posF = $('.IV_Tmb').last().outerWidth() * $('.IV_Tmb').first().index();

        if (newLeft)
            l = newLeft + posL;
        else
            l = $('#IV_TmbSlide').position().left + posL;

        if (l > $(window).width() && l < $(window).width() * 2)
            GetMoreThumbs();
        if (l < 0) {
            //            $('#IV_TmbSlide').animate({ "left": "+=" + items }, "fast");
            return false;
        }
        if ($('#IV_TmbSlide').position().left > $(window).width() - $(window).width() / 3)
            return false;
        return true;
    }

    var sheet = (function (number) {
        // Create the <style> tag
        var style = document.createElement("style");

        // Add a media (and/or media query) here if you'd like!
        // style.setAttribute("media", "screen")
        // style.setAttribute("media", "only screen and (max-width : 1024px)")

        // WebKit hack :(
        style.setAttribute("Name", number);
        style.appendChild(document.createTextNode(""));

        // Add the <style> element to the page
        document.head.appendChild(style);

        return style.sheet;
    })();

    function addCSSRule(sheet, selector, rules, index) {
        if ("insertRule" in sheet) {
            sheet.insertRule(selector + "{" + rules + "}", index);
        }
        else if ("addRule" in sheet) {
            sheet.addRule(selector, rules, index);
        }
    }
    var allIds = {};
    $SR = function (id, sheet) {
        try {
            var divIds = id.substring(('' + idd).length + 1);
            var st = getStyle('#' + divIds);
            if (st !== false) {



                st = st.replace(divIds, id);

                st = $.trim(st.split("{")[1].split("}")[0]);
                if (st !== "") {
                    //                    var arr = st.split(/[{}]/).filter(String).map(function (str) { return str.split(/:/); });
                    //                    $('#' + id).css(cssN);
                    st = st.replace(/; /g, ";");
                    var o = {};
                    var i = 0;
                    var arr = st.split(";").map(function (e) {
                        var a = e.split(":");
                        //                        a[0] = '"' + a[0] + '"';
                        //                        a[1] = '"' + a[1] + '"';
                        if (typeof a[0] !== "undefined" && a[0] !== '')
                            o[a[0]] = $.trim(a[1]);
                        return a;
                    });
                    /*
                                        $('#' + id).css(JSON.stringify(arr));
                    */
                    var styles = {
                        backgroundColor: "#ddd",
                        fontWeight: ""
                    };

                    var item = $('#' + id);
                    item.css(o);
                    allIds[divIds] = o;
                    /*
                                        var cssA = st.split(";");
                                        for (var i = 0; i < cssA.length; i++) {
                                            var it = cssA[i].split(':');
                                            item.css($.trim(it[0]), $.trim(it[1]));
                                        }
                    */
                }
                //                addCSSRule(sheet, '.' + id, st);
            }
        } catch (e) {
            console.info(e);
        }
    };

    function CalcRotImgeSize() {
        var ImgFields = $('#' + $('.ImgDlg .ImgViewDlg').first().data('idd') + '_ImgViewDlg').data('imgfields');
        var image = $R('#theImg').get(0);
        if (image && ImgFields) {
            var rotateAngle = parseInt(image.getAttribute("rotangle"));
            if (ImgFields.SizeX > $R('#IV_ImgCont').width() || ImgFields.SizeY > $R('#IV_ImgCont').height()) {
                if (rotateAngle === 90 || rotateAngle === 270) {
                    $(image).width($R('#theImgH').height());
                } else {
                    $(image).width($R('#theImgH').width());
                }
            }
        }
    }

    function AnimateTextarea(txt) {
        txt.css('height', 'auto');
        var height = txt[0].scrollHeight;
        txt.css('height', height + 'px');
        //            txt.parent().css('height', (txt.siblings('label').outerHeight() + height) + 'px');
    }

    function rotateCW(image) {
        //        $(image).rotate(90);
        var rotateAngle = parseInt(image.getAttribute("rotangle"));
        if (!rotateAngle || isNaN(rotateAngle))
            rotateAngle = 0;
        rotateAngle = (rotateAngle + 90) % 360;
        for (var i = 0; i < 361; i += 90) {
            $(image).removeClass('theImgrotate' + i);
        }
        $(image).addClass('theImgrotate' + rotateAngle);
        image.setAttribute("rotangle", "" + rotateAngle);
        return rotateAngle;
    }

    function rotateCCW(image) {
        var rotateAngle = parseInt(image.getAttribute("rotangle"));
        if (rotateAngle === 0 || isNaN(rotateAngle))
            rotateAngle = 360;
        rotateAngle = (rotateAngle - 90) % 360;
        for (var i = 0; i < 361; i += 90) {
            $(image).removeClass('theImgrotate' + i);
        }
        $(image).addClass('theImgrotate' + rotateAngle);
        image.setAttribute("rotangle", "" + rotateAngle);
        return rotateAngle;
    }

    function IsImageRotated(img) {
        for (var cbI = 0; cbI < 370; cbI += 90)
            if (img.hasClass("theImgrotate" + cbI))
                return true;
        return false;
    }

    function DeleteRotation(img) {
        for (var cbI = 0; cbI < 370; cbI += 90)
            img.removeClass("theImgrotate" + cbI)
    }

    $(document).ready(function () {


        loadScript("/JavaScript/glfx/glfx.js", function () { });

        $(window).on('message', function (evt) {
            var e = evt.originalEvent;
            /*            emitter = document.getElementsByName(e.data.emitter);
                        if (1 !== emitter.length) {
                            console.warn('Message event by non-unique emitter: ' + e.data.emitter);
                            return;					// Disregard if not a unique name.
                        }
                        emitter = emitter[0];
            
                        // Confirm that the emitter's origin matches.
                        if (emitter.src.indexOf(e.origin) !== 0) {
                            console.warn('Message event from mismatched origin: "' + e.origin + '" not in: ' + emitter.src);
                            return;					// Disregard if mismatched origin.
                        }
            */
            // Proceed with the requested action.
            switch (e.data.action) {
                case 'downloadFile':
                    var ImgFields = $('#' + $('.ImgDlg .ImgViewDlg').first().data('idd') + '_ImgViewDlg').data('imgfields');
                    SLApp.DownloadHandler.PrepareSingleFileDownload(ImgFields.ID, 'Type=zip&Variables=embed&sub=yes&imgID=' + ImgFields.ID + '&Copyright=' + 'False' + '&l=' + _locStrings.LanguageCode,
                        function (result) {
                            showDownloadInfo(result);
                        }, function (fail) { });

                    break;
            }
        });
    });

    $(document).on("Message", function (theMsg) {
        alert("Got Message:" +theMsg);
    });

    printPdf = function (url) {
        $('<iframe id="printPdf" name = "iframe_a" src = "' + url + '"/>').appendTo('body');




        if (isIE === true) {
            $('<embed type="application/pdf" id="pdfDocument"  src="' + url + '"  width="200px"    height="200px" >').appendTo('body');
            $R('#pdfDocument').ready(function () {
                printPDF();
            });
        } else {

            $('<iframe id="printPdf" name = "iframe_a" src = "' + url + '"/>').appendTo('body');
            $R('#printPdf').ready(function () {
                printPDF();
            });

        }

    }

    function printPDF() {
        if (isIE === true) {

            //Wait until PDF is ready to print    
            if (typeof document.getElementById("pdfDocument").print === 'undefined') {

                setTimeout(function () { printPDF("pdfDocument"); }, 1000);

            } else {

                var x = document.getElementById("pdfDocument");
                x.print();
            }

        } else {
            var iframe = document.getElementById('printPdf');
            if (iframe.src) {
                var frm = iframe.contentWindow;

                frm.focus();// focus on contentWindow is needed on some ie versions  
                frm.print();
                return false;
            }

        }
    }




    clearTimeouts = function () {
        var t = $R('#ImgViewDlg').data('timer1');
        if (t)
            window.clearTimeout(t);
        t = $R('#ImgViewDlg').data('timer2');
        if (t)
            window.clearTimeout(t);
        window.clearTimeout(timerInput);
        window.clearInterval(UpdImageInterVal);
        $("#IV_ImgCont").off();
        $('#IVTmbs_right').off();
        $('#IVTmbs_left').off();
        $('#IV_imageThumbs').off();
    };

    hideAddressBar = function (bPad) {

        // Big screen. Fixed chrome likely.
        if (screen.width > 980 || screen.height > 980) return;

        // Standalone (full screen webapp) mode
        if (window.navigator.standalone === true) return;

        // Page zoom or vertical scrollbars
        if (window.innerWidth !== document.documentElement.clientWidth) {
            // Sometimes one pixel too much. Compensate.
            if ((window.innerWidth - 1) !== document.documentElement.clientWidth) return;
        }

        // Pad content if necessary.

        if (bPad === true && (document.documentElement.scrollHeight <= document.documentElement.clientHeight)) {

            // Extend body height to overflow and cause scrolling
            bodyTag = document.getElementsByTagName('body')[0];
            // Viewport height at fullscreen
            bodyTag.style.height = document.documentElement.clientWidth / screen.width * screen.height + 'px';
        }

        setTimeout(function () {
            // Already scrolled?

            if (window.pageYOffset !== 0) return;
            // Perform autoscroll
            window.scrollTo(0, 1);
            // Reset body height and scroll

            if (bodyTag && bodyTag != undefined)
                bodyTag.style.height = window.innerHeight + 'px';
            window.scrollTo(0, 1);
        }, 1000);
    };

    StopImgLoading = function () {

        if ($R('#overlay').length > 0) {
            $R('#theImg').attr('src', '');
            $R('#overlay').remove();
        }
    };

    theImageLoadet = function (idd) {
        BindHandlers(idd);
        //        $R('#theImg').unbind("load");
        $('#' + idd + '_theImg').show();


        window.setTimeout(function () {
            $(".IV_Tmb").each(function (idx, element) {
                var item = $(this).data('item');
                if (item != undefined)
                    $('#th_i_' + item.id).attr('src', '/SLOAIMGTMB_' + item.id + '_' + item.dir + '_' + item.version + '.jpg?w=200&f=l');
            });
            if (idd === $('.ImgDlg .ImgViewDlg').first().data('idd')) {
                var ItemsArround = $('#ImageDlg').data('ItemsArround');
                var CurrentTmb = BuildThumbSlider(ItemsArround, -1, idd);
                loadNextImage();
                loadPrevImage();
            }
        }, 300);

    };

    loadNextImage = function (idCurrent) {
        if (!$('#ImageDlg').data('ItemsArround'))
            return;

        if (idCurrent == undefined) {
            if (!$('.ImgDlg .ImgViewDlg').first())
                return;
            idCurrent = $('.ImgDlg .ImgViewDlg').first().data('idd');
        }

        var info = $('#' + idCurrent + '_IV_ImgHolder').data('nextImg');
        if (!info)
            return;

        GetImageView(JSON.stringify(theView), info.id, info.index, info.index, CurrentView.Lang, $('#FrameSpace').length ? false : true, function (code) {
            try {
                idCurrent = $('.ImgDlg .ImgViewDlg').first().data('idd');
                if ($('#ImageDlg_next').children().length === 0 && info.id === $('#' + idCurrent + '_IV_ImgHolder').data('nextImg').id) {
                    var ItemsArround = $('#ImageDlg').data('ItemsArround');
                    ParentView = $('#ImageDlg').data('ParentView');
                    if ($('#ImageDlg_next').length === 0) {
                        $('<div id="ImageDlg_next" class="imgDlgNext newImage"></div>').insertAfter($('#ImageDlg'));
                    }

                    var dlg = $('#ImageDlg_next');
                    $(code).appendTo(dlg);

                    dlg.find('*').each(function () {
                        if (this.id !== '')
                            $SR(this.id);
                    });
                    dlg.data('id', info.id);

                    GotImageView(info.id, function () { }, ItemsArround, ParentView, -1, false, null);
                }
            } catch (e) {
            }
        });
    };
    loadPrevImage = function (idCurrent) {
        if (!$('#ImageDlg').data('ItemsArround'))
            return;

        if (idCurrent == undefined) {
            if (!$('.ImgDlg .ImgViewDlg').first())
                return;
            idCurrent = $('.ImgDlg .ImgViewDlg').first().data('idd');
        }

        var info = $('#' + idCurrent + '_IV_ImgHolder').data('prevImg');
        if (!info)
            return;

        GetImageView(JSON.stringify(theView), info.id, info.index, info.index, CurrentView.Lang, $('#FrameSpace').length ? false : true, function (code) {
            try {
                idCurrent = $('.ImgDlg .ImgViewDlg').first().data('idd');
                if ($('#ImageDlg_prev').children().length === 0 && info.id === $('#' + idCurrent + '_IV_ImgHolder').data('prevImg').id) {
                    var ItemsArround = $('#ImageDlg').data('ItemsArround');
                    ParentView = $('#ImageDlg').data('ParentView');
                    if ($('#ImageDlg_prev').length === 0) {
                        $('<div id="ImageDlg_prev" class="imgDlgPrev  newImage"></div>').insertBefore($('#ImageDlg'));
                    }

                    var dlg = $('#ImageDlg_prev');
                    $(code).appendTo(dlg);

                    dlg.find('*').each(function () {
                        if (this.id !== '')
                            $SR(this.id);
                    });
                    dlg.data('id', info.id);

                    GotImageView(info.id, function () { }, ItemsArround, ParentView, -1, false, null, false);
                }
            } catch (e) {

            }
        });
    };

    var timerInterval = 0;
    StopVids = function () {
        var ImgFields = $('#' + $('.ImgDlg .ImgViewDlg').first().data('idd') + '_ImgViewDlg').data('imgfields');
        if (ImgFields.IsVideo === 'true') {
            if (ImgFields.theVideo != null) {
                ImgFields.theVideo.pause();
            }
        }
    };

    ShowHideThumbNails = function (event) {

        window.clearInterval(timerInterval);
        if ($('#TV_thms').data('noshow') === true)
            return;
        $('.player').fadeIn();
        timerInterval = window.setInterval(function () {
            if (event) {
                try {
                    var thumbsPos = $('#TV_thms').position();
                    if (startTmbPos.left)

                        if (AllowHide && !mousedown && !$('#IV_TmbSlide').data('inslide')) {
                            $('.player').fadeOut(1000);
                            window.clearInterval(timerInterval);
                        }
                } catch (e) { ; };
            } else {

                $('.player').fadeOut(2000);
                window.clearInterval(timerInterval);

            };
        }, 1000);

    };
    compareObjects = function (o1, o2) {
        var cp = {
            IsDifferent: false,
            FieldsChanged: "",
            beginObj: o1,
            currObj: o2,
            index: -1
        }
        for (var p in o1) {
            if (o1.hasOwnProperty(p)) {
                if (o1[p] !== o2[p]) {
                    cp.IsDifferent = true;
                    cp.FieldsChanged += p + ';';
                }
            }
        }

        return cp;
    };

    CopyImgVars = function (ImgID) {
        var imgobj = {
            title: $RI(ImgID, "#IVE_Title").val()
            , description: $RI(ImgID, "#IVE_Description").val()
            , datetaken: $RI(ImgID, "#IVE_DateTaken").val()
            , copyright: $RI(ImgID, "#IVE_Copyright").val()
            , keywords: $RI(ImgID, '#IVE_Keywords').val()
            , hotspotx: $RI(ImgID, '#theImgH').data('HotX')
            , hotspoty: $RI(ImgID, '#theImgH').data('HotY')
            , jobid: $RI(ImgID, '#IVE_JobID').val()
            , id: ImgID
        }
        return imgobj;
    };

    CopyVarsToImg = function (imgObj) {
        var ImgID = imgObj.id;
        $RI(ImgID, "#IVE_Title").val(imgObj.title);
        $RI(ImgID, "#IVE_Description").val(imgObj.description);
        $RI(ImgID, "#IVE_DateTaken").val(imgObj.datetaken);
        $RI(ImgID, "#IVE_Keywords").val(imgObj.keywords);
        $RI(ImgID, "#IVE_Copyright").val(imgObj.copyright);
        $RI(ImgID, '#theImgH').data('HotX', imgObj.hotspotx);
        $RI(ImgID, '#theImgH').data('HotY', imgObj.hotspoty);
        $RI(ImgID, '#IVE_JobID').val(imgObj.jobid);
    };

    checkUndoRedoInfo = function (ImageID, undo) {
        if (typeof undo == 'undefined')
            undo = $RI(ImageID, '#ImgViewDlg').data('undoRedo');
        if (undo) {
            if (undo.nIndex > 0) {
                if (undo.nIndex < undo.undoInfos.length) {
                    var current = JSON.parse(undo.undoInfos[undo.nIndex]);
                    CopyVarsToImg(current.beginObj);
                }
                $RI(ImageID, '#Undo').removeClass('disabledBtn');

                if (undo.nIndex < undo.undoInfos.length - 1)
                    $RI(ImageID, '#Redo').removeClass('disabledBtn');
            }

        }
        $RI(ImageID, '#Undo').on('click', function (e) {
            var ImageID = $(this).data('idd');
            if (!$RI(ImageID, '#Undo').hasClass('disabledBtn')) {
                var ur = $RI(ImageID, '#ImgViewDlg').data('undoRedo');
                ur.nIndex--;
                var current = JSON.parse(ur.undoInfos[ur.nIndex]);
                CopyVarsToImg(current.beginObj);
                $RI(ImageID, '#ImgViewDlg').data('undoRedo', ur);
                if (ur.nIndex === 0) {
                    $RI(ImageID, '#Undo').off('click');
                    $RI(ImageID, '#Undo').addClass('disabledBtn');
                }
                $RI(ImageID, '#Redo').removeClass('disabledBtn');
                SLApp.UserAndInfoService.SetImageUndoIndex($RI(ImageID, '#ImgViewDlg').data('ImgID'), ur.nIndex, function () { }, function (err) {
                    displayErrorMesssage(err.get_message(), _localized.Error);
                });
            }
        });
        $RI(ImageID, '#Redo').on('click', function (e) {
            var ImageID = $(this).data('idd');
            if (!$RI(ImageID, '#Redo').hasClass('disabledBtn')) {
                var current = null;
                var ur = $RI(ImageID, '#ImgViewDlg').data('undoRedo');
                if (ur.nIndex < ur.undoInfos.length - 1) {
                    ur.nIndex++;
                    current = JSON.parse(ur.undoInfos[ur.nIndex]);
                    CopyVarsToImg(current.beginObj);
                } else {
                    current = JSON.parse(ur.undoInfos[ur.nIndex]);
                    CopyVarsToImg(current.currObj);
                }

                if (ur.nIndex === ur.undoInfos.length - 1) {
                    $RI(ImageID, '#Redo').off('click');
                    $RI(ImageID, '#Redo').addClass('disabledBtn');
                }

                SLApp.UserAndInfoService.SetImageUndoIndex(ImageID, ur.nIndex, function () { }, function (err) {
                    displayErrorMesssage(err.get_message(), _localized.Error);
                });

            }
        });

    };

    CalcImageSize = function (id, sizex, sizey) {
        var ImgFields = $('#' + id + '_ImgViewDlg').data('imgfields');

        var OffsetH = $('.IV_theImg').offset().top + ImgFields.DetailViewOffset;
        try {
            if (!$R('#SearchPlaceUnder').is(':visible')) {
                //            $('.ImgDlg').css('top', '60px');
            } else {
                $R('#SearchPlaceUnder').hide();
                $R('#SearchPlaceUnder').data('mustShow', 1);
                //            $('.ImgDlg').css('top', '90px');
            }
            if ($R('#SearchPlaceUnder').data('mustShow') === 1) {
                OffsetH = $('.IV_theImg').offset().top + 30;
            }
        } catch (e) {
            ;
        }
        var scale = sizex / sizey;
        var Width = $('.IV_theImg').innerWidth();
        var Height = Width / scale;
        if (Height > $(window).height() - OffsetH) {
            Height = $(window).height() - OffsetH;
            if (ImgFields.ext.toLowerCase() !== '.pdf') {
                Width = Height * scale;
            }
        }
        var rcW = parseInt(Width);
        var rcH = parseInt(Height);
        Width = Math.min(sizex, Width);
        Height = Math.min(sizey, Height);
        return { cx: parseInt(Width), cy: parseInt(Height), rcx: rcW, rcy: rcH };
    };

    loadImgZoomed = function (ImgID) {
        if (typeof ImgID === 'undefined')
            ImgID = $('.ImgDlg .ImgViewDlg').first().data('idd');
        var ImgFields = $('#' + ImgID + '_ImgViewDlg').data('imgfields');
        if (!IsImageRotated($RI(ImgID, '#theImg')))
            if ($RI(ImgID, '#theImg').data("zoom") > 100) {
                $RI(ImgID, '#theImg').attr("src", "/MCIMG_" + ImgID + "_" + $RI(ImgID, '#theImg').data("width") + "_" + $RI(ImgID, '#theImg').data("height") + "_" + $RI(ImgID, '#theImg').data('version') + ImgFields.ext + "?v=" + $RI(ImgID, '#theImg').data('version'));
            }
    };

    CalcAspectRatio = function (w, h) {
        var c = w * 100 / h;
        switch (Math.trunc(c)) {
            case 15 < 0:
                return "3 x 2";
            case 133:
                return "4 x 3";
            case 177:
                return "16 x 9";
            case 75:
                return "3 x 4";
            case 66:
                return "2 x 3";
            case 100:
                return "1 x 1";
        }
    };

    SizeImage = function (whatImg) {
        if (typeof whatImg === "undefined")
            whatImg = "";
        else
            idd = whatImg;

        if ($(window).height() < 10)
            return;
        var ImgFields = $('#' + whatImg + '_ImgViewDlg').data('imgfields');
        if (typeof ImgFields === "undefined")
            return false;

        var scrolled = $RI(whatImg, '#ImgView').scrollTop();

        var OffsetH = /*$('.IV_theImg').offset().top +*/  ImgFields.DetailViewOffset;
        $('.IV_theImg').data('offset', ImgFields.DetailViewOffset);
        if ($('body').data("FullScreen") === true) {
            OffsetH = $('.IV_theImg').offset().top;
            $('.IV_theImg').data('offset', 0);

        }
        if (getMobileOperatingSystem() !== 'unknown' && $(window).height() < $(window).width()) {
            $('#ImageDlg').addClass('MoveTopZero');
            $('.CommunityMenuContent').addClass('HideTopMenu');
        } else {
            $('.CommunityMenuContent').removeClass('HideTopMenu');
            $('#ImageDlg').removeClass('MoveTopZero');
        }


        try {
            if (!$('#' + whatImg + '_SearchPlaceUnder').is(':visible')) {
                //            $('.ImgDlg').css('top', '60px');
            } else {
                $('#' + whatImg + '_SearchPlaceUnder').hide();
                $('#' + whatImg + '_SearchPlaceUnder').data('mustShow', 1);
                //            $('.ImgDlg').css('top', '90px');
            }
            if ($('#' + whatImg + '_SearchPlaceUnder').data('mustShow') === 1) {
                OffsetH = $('.IV_theImg').offset().top + 30;
            }
        } catch (e) {
            ;
        }

        var $theImg = $('#' + whatImg + '_theImg');
        if ($theImg.length === 0) {
            $theImg = $('#' + whatImg + '_theImgH');
            if ($theImg.length === 0)
                $theImg = $('#' + whatImg + '_IV_ImgHolder');
            if ($theImg.length === 0)
                return;
            $theImg.data('noload', true);
        }
        //        var scale = Variable(img.SizeX) / Variable(img.SizeY);
        var scale = $theImg.data("width") / $theImg.data("height");
        if (isNaN(scale))
            return;

        var Width = $('.IV_theImg').innerWidth();
        //        if ($(window).width() > 768)
        //               Width = $('#' +whatImg + '_IV_ImgCont').width();

        if (Width === 0)
            Width = $(window).width();
        var Height = Width / scale;
        if (Height > $(window).height() - OffsetH) {
            Height = $(window).height() - OffsetH;
            if (ImgFields.ext.toLowerCase() !== '.pdf') {
                Width = Height * scale;
            }
        }

        if (Width > $theImg.data("width") || Height > $theImg.data("height")) {
            Width = $theImg.data("width");
            Height = $theImg.data("height");
        }

        console.log("id " + whatImg + ': ' + Width + ' * ' + Height);
        /*            if ($(window).width()  > 768)
                    {
                        if (Height > $(window).height() - $('#' +whatImg + '_IV_ImgCont').offset().top -35) {
                            Height = $(window).height() - $('#' +whatImg + '_IV_ImgCont').offset().top - 35;
                            Width = Height * scale;

                        }
                    }
        */

        $('#' + whatImg + '_IV_ImgHolder').height(Height);

        if (ImgFields.IsDocument === 'true') {
            $('#' + whatImg + '_IV_ImgHolder').height($(window).height() - OffsetH);
        }
        if (scale > 4) {
            Height = $(window).height() / 2;
            $('#' + whatImg + '_IV_ImgHolder').height(Height);
        }
        $('#' + whatImg + '_IV_ImgHolder').width(Width);
        /*       $('#' +whatImg + '_IV_DescrInner').width(Width);
               {
                   $('.scrollbar-inner > div').css('max-height', 2000 + 'px');
               }
       */
        //            console.log("height is now " + Height);
        var c = $('#TV_thms').collidesWith('.IV_btnPrev');
        if (c.length > 0) {
            $('#TV_thms').css('left', '30px');
            if (!$('#TV_thms').hasClass('IV_ThmbsSmall'))
                $('#TV_thms').css('right', '40px');
        }
        else {
            $('#TV_thms').css('left', '0');
            if (!$('#TV_thms').hasClass('IV_ThmbsSmall'))
                $('#TV_thms').css('right', '10px');
        }

        $('#' + whatImg + '_theImgH').height(Height);
        $('#' + whatImg + '_theImgH').width(Width);
        logToConsole(whatImg + ' height:' + Height);
        CalcRotImgeSize();
        /*      if ($('#' +whatImg + '_ZoomFooter').length > 0)
                  Height += $('#' +whatImg + '_ZoomFooter').height()+3;
         */
        $("#TV_thms").removeAttr('top');
        /*
                $("#TV_thms").css('width', Width + "px");
                if ($('#' +whatImg + '_IV_ImgHolder').length > 0)
                    $("#TV_thms").css('left', $('#' +whatImg + '_IV_ImgHolder').offset().left - $('.ImgViewer').position().left + "px");
        */

        var elem = $('.DateTimeShowHide').first();
        $('.DateTimeShowHide').removeClass('HiddenClass');
        if (elem && $('#' + whatImg + '_DateHolder').width() < 275) {
            $('.DateTimeShowHide').addClass('HiddenClass');
        }
        if ($("#InsertionDateTD").height() > 23) {
            $("#InsertionDateTD").css("line-height", "23px");
        } else {
            $("#InsertionDateTD").css("line-height", "normal");
        }
        if ($("#CreationDateTD").height() > 23) {
            $("#CreationDateTD").css("line-height", "23px");
        } else {
            $("#CreationDateTD").css("line-height", "normal");
        }
        $('#' + whatImg + '_ImgView').height($('#ImageDlg').height());
        try {
            if (getMobileOperatingSystem() === 'unknown') {
                if ($('.ImgDlg .ImgViewDlg').first().data('idd') === whatImg)
                    $('#' + whatImg + '_ImgView').data('scroller').update();
            }
        } catch (err) { ; };
        if ($('#' + whatImg + '_theImg').data("width")) {
            var zoom = $('#' + whatImg + '_theImg').data("zoom");
            $RI(whatImg, '#theImgH').css({
                'max-width': $('#' + whatImg + '_theImg').data("width") * zoom / 100 + 'px', 'max-height': $('#' + whatImg + '_theImg').data("height") * zoom / 100 + 'px',
                'margin-top': Math.max((Height - ($('#' + whatImg + '_theImg').data("height") * zoom / 100)) / 2, 0) + 'px',
                'margin-left': Math.max((Width - ($('#' + whatImg + '_theImg').data("width") * zoom / 100)) / 2, 0) + 'px'
            });
        }

        if ($("#" + whatImg + "IV_ImgHolder").width() < $(window).width() - 30) {
            $('#' + whatImg + '_IV_PlaceHolder_Desc').height(0);
        } else {
            $('#' + whatImg + '_IV_PlaceHolder_Desc').height(30);
        }
        var needToReload = false;
        logToConsole("Resizing:" + $R("#IV_ImgHolder").width() + " Window:" + $(window).width());
        if (Width > $('#' + whatImg + '_theImg').data("width")) {
            Width = $('#' + whatImg + '_theImg').data("width");
            Height = $('#' + whatImg + '_theImg').data("height");
            needToReload = true;
        }
        if (Width - 1 > $('#' + whatImg + '_theImg').width() && Height - 1 > $('#' + whatImg + '_theImg').height())
            needToReload = true;

        if (!$('#' + whatImg + '_theImg').attr("src") || $('#' + whatImg + '_theImg').attr("src") === "")
            $('#' + whatImg + '_theImg').attr("src", "/MCIMG_" + $('#' + whatImg + '_theImg').data('idd') + "_" + parseInt(Width) + "_" + parseInt(Height) + "_" + $('#' + whatImg + '_theImg').data('version') + ImgFields.ext + "?v=" + $('#' + whatImg + '_theImg').data('version'));
        else {
            if (!MaVas.Bot) {
                var imgElem = $('#' + whatImg + '_theImg');
                if (imgElem.data("reloadTmr") !== 0) {
                    window.clearTimeout(imgElem.data("reloadTmr"));
                    imgElem.data("reloadTmr", 0);
                }
                if (needToReload === true) {
                    if (!IsImageRotated(imgElem)) {
                        imgElem.data("reloadTmr", window.setTimeout(function () {
                            imgElem.attr("src", "/MCIMG_" + imgElem.data('idd') + "_" + parseInt(Width) + "_" + parseInt(Height) + "_" + imgElem.data('version') + ImgFields.ext + "?v=" + imgElem.data('version'));
                        }, 300));
                    }
                }
            }
        }
        var rotateAngle = GetRotation(whatImg);
        if (rotateAngle === 90 || rotateAngle === 270) {
            $('#' + whatImg + '_theImg').width(Height);
            $('#' + whatImg + '_theImg').height(Width);
        } else {
            $('#' + whatImg + '_theImg').width(Width);
            $('#' + whatImg + '_theImg').height(Height);
        }

        $theImg.data('idd', idd);

        if ($theImg.data('noload') || $theImg.length == 0) {
            theImageLoadet(whatImg);

        }


        $theImg.off("load");

        $theImg.on("load", function () {
            whatImg = $(this).data('idd');
            logToConsole("Image loaded:" + $('#' + whatImg + '_theImg').attr('src'));
            disableImgEventHandlers($('#' + whatImg + '_theImg')[0]);
            /*            if (isIE) {
                            if (!$('#IV_TmbSlide').data("thumbsBicubic")) {
                                $('.TmbImg').bicubicImgInterpolation({
                                    crossOrigin: 'anonymous' //otherwise browser security error is triggered
                                });
                                $('#IV_TmbSlide').data("thumbsBicubic", true);
                            }
                        }
            */
            BindHandlers(whatImg);
            $('#' + whatImg + '_theImg').show();

            if ($('#' + whatImg + '_theImg').width() < $('#' + whatImg + '_theImg').data('width') || $('#' + whatImg + '_theImg').height() < $('#' + whatImg + '_theImg').data('height'))
                $('#' + whatImg + '_theImg').css('cursor', 'zoom-in');
            else
                $('#' + whatImg + '_theImg').css('cursor', 'default');

            if ($('body').data("FullScreen") === true) {
                if (!screenfull.isFullscreen) {
                    fullscreen.request($('#' + whatImg + '_IV_ImgCont')[0]);
                    SizeImage();
                }
            }

            theImageLoadet($(this).data('idd'));
        });
        $theImg.on("error", function () {
            theImageLoadet($(this).data('idd'));
        });


        $RI(whatImg, '#IV_LeftRightHolder').offset({
            left: 0, top: $RI(whatImg, '#IV_PlaceHolder_Desc').offset().top
        });
        $('#ImgViewDlgClose').click(function () {
            $('#PageContent').show();

            UpdateImg();
            clearTimeouts();
            $('#' + whatImg + '_overlay').fadeOut(500, function () {
                $('#' + whatImg + '_overlay').remove();
            });
            $('#' + whatImg + '_fs').remove();
            $('#TheImgViewer').remove();
        });

        if (jcrop_api)
            SetCropper(CropRect, $('#' + whatImg + '_CropHolder'), $('#' + whatImg + '_OrigImgID_IV'), -1, $('#' + whatImg + '_IV_ImgHolder').width(), $('#' + whatImg + '_IV_ImgHolder').height(), $('#' + whatImg + '_IV_ImgHolder').data('ratio'), null);
        $(".autoExpandH").each(function () { AnimateTextarea($(this)); });
        var midd = $('.ImgDlg .ImgViewDlg').first().data('idd');
        if ($('#' + midd + '_IV_DescrInner').length > 0)
            $('#TV_thms').css('bottom', $(window).height() - $('#' + midd + '_IV_DescrInner').offset().top);
        /*       $('#TV_thms').position({
                   my: "left bottom",
                   at: "left bottom",
                   of: "#" + whatImg + "_IV_ImgCont2"
               })
       */
        $RI(whatImg, "#ImgViewDlg").css('display', 'block');
        if (typeof $RI(whatImg, '#ImgView').data('scroller') !== 'undefined')
            $RI(whatImg, '#ImgView').data('scroller').update();
    };

    function DisplayedImageChanged(objImg) {
        var ImgID = objImg.ID;
        if ($('#' + ImgID + '_ImgViewDlg').length > 0) {
            var ImgFields = $('#' + ImgID + '_ImgViewDlg').data('imgfields');
            ImgFields.SizeX = objImg.SizeX;
            ImgFields.SizeY = objImg.SizeY;
            ImgFields.HotX = objImg.HotX;
            ImgFields.HotY = objImg.HotY;
            $('#' + ImgID + '_ImgViewDlg').data('imgfields', ImgFields);

            var box = $RI(ImgID, "#theImgH");
            box.data("HotX", ImgFields.HotX);
            box.data("HotY", ImgFields.HotY);
            SizeImage(ImgID);
        }
    }

    StartImg = function (ImgID) {

        var ImgFields = $('#' + ImgID + '_ImgViewDlg').data('imgfields');
        if (ImgFields != null && ImgFields.AllowEdit === 'true') {
            var imgobj = CopyImgVars(ImgID);
            $(".IV_EDIT").css('height', '');

            $RI(ImgID, '#ImgViewDlg').data('InitSettings', imgobj);
            $RI(ImgID, '#ImgViewDlg').data('ImgID', ImgFields.ID);
            $RI(ImgID, '#Undo').addClass('disabledBtn');
            $RI(ImgID, '#Redo').addClass('disabledBtn');
            /*
                        checkUndoRedo = function (json, ImgID) {
                            
                            checkUndoRedoInfo(ImgID, undoInfo);
                        };
            
                        if (UndoRedoJson == null)
                            SLApp.UserAndInfoService.GetImageUndoRedoInfoAll(MaVas.UserID, function (jsonStr) {
                                UndoRedoJson = JSON.parse(jsonStr);
                                checkUndoRedo(UndoRedoJson, ImgID);
                            });
                        else
                            checkUndoRedo(UndoRedoJson, ImgID);
            */
            SLApp.UserAndInfoService.GetImageUndoRedoInfo(ImgID, MaVas.UserID, function (json) {
                var undoInfo = JSON.parse(json);
                $RI(ImgID, '#ImgViewDlg').data('undoRedo', undoInfo);
                checkUndoRedoInfo(ImgID, undoInfo);
            });
            /*
                        if (UpdImageInterVal !== 0) {
                            clearInterval(UpdImageInterVal);
                            UpdImageInterVal = 0;
                        }
                        SLApp.UserAndInfoService.GetImageModifiedTime(ImgFields.ID, function (modTime) {
                            var ti = $.parseJSON(modTime);
            
                            var dt = new Date(ti.Year, ti.Month, ti.Day, ti.Hour, ti.Minute, ti.Second, ti.Millisecond);
                            UpdImageInterVal = setInterval(function () {
                                SLApp.UserAndInfoService.GetImageModifiedTime(ImgFields.ID, function (modTime) {
                                    var ti = $.parseJSON(modTime);
                                    var dtn = new Date(ti.Year, ti.Month, ti.Day, ti.Hour, ti.Minute, ti.Second, ti.Millisecond);
                                    if (dtn.getTime() !== dt.getTime()) {
                                        dt = dtn;
                                        SLApp.UserAndInfoService.GetImgInfo(ImgFields.ID, function (imgInfo) {
                                            var i = $.parseJSON(imgInfo);
                                            ImgFields.SizeX = i.SizeX;
                                            ImgFields.SizeY = i.SizeY;
                                            ImgFields.HotX = i.HotX;
                                            ImgFields.HotY = i.HotY;
                                        });
                                        var box = $RI(ImgID,"#theImgH");
                                        box.data("HotX", ImgFields.HotX);
                                        box.data("HotY", ImgFields.HotY);
                                    }
                                });
                            }, 500);
                        });
            
            */
        }
    };

    AddUndoImageInfo = function (ImgID) {
        if (timerInput > 0)
            window.clearTimeout(timerInput);
        timerInput = window.setTimeout(function (ImgID) {
            var imgData = $('#' + ImgID + '_ImgViewDlg').data('InitSettings');
            var imgobj = CopyImgVars(ImgID);
            var cp = compareObjects(imgData, imgobj);
            if (cp.IsDifferent) {
                SLApp.UserAndInfoService.AddUndoImageInfo(ImgID, JSON.stringify(cp), JSON.stringify(imgobj), function (undoInfo) {
                    $RI(ImgID, '#ImgViewDlg').data('InitSettings', imgobj);
                    $RI(ImgID, '#ImgViewDlg').data('undoRedo', undoInfo == '' ? '' : JSON.parse(undoInfo));
                    $RI(ImgID, '#Undo').removeClass('disabledBtn');
                });
            }
        }, 500, ImgID);
    };

    UpdateImg = function (ImgID) {
        var ImgFields = $('#' + ImgID + '_ImgViewDlg').data('imgfields');
        if (typeof ImgFields !== 'undefined')
            if (ImgFields.AllowEdit === 'true') {
                clearTimeout(timerInput);

                var imgData = $RI(ImgID, '#ImgViewDlg').data('InitSettings');
                var imgobj = CopyImgVars(ImgID);
                var cp = compareObjects(imgData, imgobj);
                if (cp.IsDifferent) {
                    SLApp.UserAndInfoService.UpdateImageInfo(ImgFields.ID, JSON.stringify(imgobj), JSON.stringify(cp), function (success) { });
                }
            }
    };



    var AllowHide = true;

    RatioClickHandler = function (obj, w, h, OnRatioChanged, StartRect) {

        obj.PadMouseDrag({
            click: function () {
                var curr = "";
                DoBP();
                curr = '<li data-aspect="none">' + _localized.FreeForm + '</li>';

                $('<div id="SelectRatio"><ul>' +
                    curr +
                    '<li class="line"></li>' +
                    '<li class="sep">Quer:</li>' +
                    '<li data-aspect="3/2">3 x 2</li>' +
                    '<li data-aspect="4/3">4 x 3</li>' +
                    '<li data-aspect="16/9">16 x 9</li>' +
                    '<li class="line"></li>' +
                    '<li class="sep">Hoch:</li>' +
                    '<li data-aspect="2/3">2 x 3</li>' +
                    '<li data-aspect="3/4">3 x 4</li>' +
                    '<li data-aspect="9/16">9 x 16</li>' +
                    '<li class="line"></li>' +
                    '<li  class="sep">Quadratisch</li>' +
                    '<li  data-aspect="1/1">1 x 1</li>' +
                    '</ul>').appendTo($('body'));
                $('#SelectRatio').css({
                    'top': $('#Ratio').offset().top - 4,
                    'left': $('#Ratio').offset().left
                });
                $('#SelectRatio li').hover(function () {
                    if ($(this).data('aspect'))
                        $(this).addClass('SelectedAspect');
                }, function () {
                    $(this).removeClass('SelectedAspect');
                });
                $('#SelectRatio li').PadMouseDrag({
                    click: function (e, element) {
                        //                        alert($(e.target).data('Aspect'));
                        if ($(e.target).data('aspect')) {

                            ratioObject = $(e.target);
                            $('#Ratio').text($(e.target).text());
                            $('#SelectRatio').remove();
                            OnRatioChanged($(e.target).data('aspect'), $(e.target));
                            $('#frmt').prop("checked", true);
                        }
                    }
                });
                DoBP();
                if ($('#SelectRatio').position().top + $('#SelectRatio').height() > $(window).height()) {
                    $('#SelectRatio').css('top', parseInt($(window).height() - $('#SelectRatio').height()) + 'px');
                }


                $('#SelectRatio ul').css({ 'margin-top': '4px', padding: 0 });
                var selKillTimer = 0;
                $('#SelectRatio').hover(function () {
                    window.clearTimeout(selKillTimer);
                }, function () {
                    selKillTimer = window.setTimeout(function () {
                        $('#SelectRatio').remove();
                    }, 3000);
                });

                $('#Main').click(function () {
                    $('#SelectRatio').remove();
                    $(document).unbind('click');
                });
            }
        });
    };

    AddAspectRatioControl = function (parent, id, w, h, OnRatioChanged) {
        $('#Ratio').remove();
        /*        function position(using) {
                    $('.RU1').position(
                        {
                            of: $R('#Ratio'),
                            my: "right center",
                            at: "right center",
                            offset: "-5 0"
                        });
                }
        */
        var w1 = w;
        var h1 = h;
        if (CropRect) {
            w1 = CropRect.w;
            h1 = CropRect.h;
        }

        //        $R('#StatusInner').append('<div id="lbl"><div id="inpF"><input name="frmt" id="frmt" checked="checked" type="checkbox"/>' + _localized.Format + ':</div><div id="Ratio" class="StatusBarBtns CropStatus">' + parseInt(w1) + ' x ' + parseInt(h1) + '</div></div><div id="RatioUpDown" class="RigthUpDn RU1"></div>');

        $R('#ZoomFooter').append('<div id="Crop"><div id="lbl" class="CropStatusLine">' + _localized.AspectRatio + '<div id="Ratio" class="StatusBarBtns CropStatus">' + _localized.FreeForm + '</div><div id="RatioUpDown" class="RigthUpDn RU1"></div></div></div>');


        $('input:checkbox').checkbox({
            cls: 'jquery-safari-checkbox',
            empty: '/images/DXViewer/empty.png'
        });

        $('input:radio').checkbox({
            cls: 'jquery-safari-radiobox',
            empty: '/images/DXViewer/empty.png'
        });

        var Ratio = $R('#Ratio');

        Ratio.css({
            'padding-left': '5px'
        });

        Ratio.removeAttr('right');
        if (LastUsedRatio == null) {
            LastUsedRatio = CropRect.w + ' x ' + CropRect.h + ' px';
        }
        OnRatioChanged(LastUsedRatio);
        $('#frmt').click(function () {
            if (!$(this).is(":checked")) {
                $R('#Ratio').text(CropRect.w + ' x ' + CropRect.h + ' px');
                OnRatioChanged("");
            }
            else {
                $R('#Ratio').text(CropRect.w + ' / ' + CropRect.h);
                OnRatioChanged(CropRect.w + '/' + CropRect.h);
            }
        });
        $R('#lbl').css('padding-top', '3px');
        //        position(null);

        RatioClickHandler(Ratio, w, h, OnRatioChanged, StartRect);
        RatioClickHandler($("#RatioUpDown"), w, h, OnRatioChanged, StartRect);

    };

    alignM = function (c) {
        $R('#lnL').css({
            'left': c.x + (c.x2 - c.x) / 3,
            'top': c.y,
            'bottom': c.y2,
            'height': c.h
        });
        $R('#lnR').css({
            'left': c.x2 - (c.x2 - c.x) / 3,
            'top': c.y,
            'bottom': c.y2,
            'height': c.h
        });

        $R('#lnT').css({
            'left': c.x,
            'top': c.y + c.h / 3,
            'width': c.w
        });

        $R('#lnB').css({
            'left': c.x,
            'top': c.y + (c.h - c.h / 3),
            'width': c.w
        });
    };

    SetCropper = function (rect, parentDiv, id, ImageID, w, h, ratio, obj) {

        CurRatio = ratio;
        if (!ratio)
            ratio = "";
        if (ratio === 'none')
            ratio = "";
        if (ratio.length > 0)
            LastUsedRatio = ratio;
        if (jcrop_api)
            jcrop_api.destroy();
        if (!rect.Width && rect.w) {
            rect.Left = rect.x;
            rect.Top = rect.y;
            rect.Width = rect.w;
            rect.Height = rect.h;
        }
        if (obj)
            if (obj.data('full')) {
                rect.Left = obj.data('fullX');
                rect.Top = obj.data('fullY');;
                rect.Width = obj.data('fullWidth');
                rect.Height = obj.data('fullHeight');;
            }

        $R('#IV_ImgHolder').data('ratio', ratio);

        id.Jcrop({
            fadeTime: 0,
            animationDelay: 0,
            swingSpeed: 0,
            setSelect: [rect.Left, rect.Top, rect.Left + rect.Width, rect.Top + rect.Height],
            boxWidth: parseInt(w),
            boxHeight: parseInt(h),
            allowSelect: false,
            aspectRatio: eval(ratio),
            onSelect: function (c) {
            },
            onChange: function (cRect) {
                $('#CropApplypBtn').show();
                $('#CropResetBtn').show();
                CropRect = cRect;
                if (this.tellScaled) {
                    var c = this.tellScaled();
                    alignM(c);
                }
            }
        }, function () {
            jcrop_api = this;
            var c = jcrop_api.tellScaled();
            w = c.w;
            h = c.h;
            alignM(c);
        }
        );
        /*
        jcrop_api = $.Jcrop(id, {
            setSelect: [rect.Left, rect.Top, rect.Left + rect.Width, rect.Top + rect.Height],
            boxWidth: parseInt(w),
            boxHeight: parseInt(h),
            allowSelect: false,
            aspectRatio: eval(ratio),
            onSelect: function (c) {
            },
            onChange: function (cRect) {
                CropRect = cRect;
                if (this.tellScaled) {
                    var c = this.tellScaled();
                    alignM(c);
                    if (!$R('#frmt').is(":checked")) {
                        $R('#Ratio').text(CropRect.w + ' x ' + CropRect.h + ' px');
                    }
                }
            }
        });
        */


        //         $("#Ratio").text(jcrop_api.tellSelect().w + ' x ' + jcrop_api.tellSelect().h);
    };

    resetBtns = function () {
        $("#CropApplypBtn").remove();
        $("#CropBtn").show();
        $R('#OrigImgID').remove();
        $R('#PrintBtn').remove();
        $R('#SelectRatio').remove();
        $("#CropCancelpBtn").remove();
        $("#CropBtn").show();
        $R('#PrintBtn').remove();
        $R('#ZoomedID').css('cursor', 'progress');
    };

    HideAllStatusBarBtns = function (imgID) {
        $('.StatusBarBtns').children().each(function (index, object) {
            if ($(this).data('idd') === imgID)
                $(this).hide();
        });
    };

    ShowAllStatusBarBtns = function (imgID) {
        $('.StatusBarBtns').children().each(function (_index, object) {
            if ($(this).data('idd') === imgID)
                $(this).show();
        });
    };

    CropperInitInitial = function (id, w, h, action) {
        SLApp.UserAndInfoService.CropRectNew(id, w, h, function (rect) {
            //            $R('#infImgInf').height(h);
            StartRect = CropRect = rect;
            StartRect.w = StartRect.Width;
            StartRect.h = StartRect.Height;
            StartRect.x = StartRect.Left;
            StartRect.y = StartRect.Top;
            LastUsedRatio = ratio = "none"; //rect.Width + "/" + rect.Height;
            action();
        });
    };
    CropperInit = function (parentDiv, id, ImageID, w, h, ratio) {
        id.hide();
        $("#lnL").remove();
        $("#lnR").remove();
        $("#lnT").remove();
        $("#lnB").remove();

        $('<div id="lnL" style="z-index:1000;position:absolute;background-color:Green;width:1px;height:' + h + 'px;top:0px;left:' + parseInt(w / 3) + 'px"></div>').appendTo(parentDiv);
        $('<div id="lnR" style="z-index:1000;position:absolute;background-color:Green;width:1px;height:' + h + 'px;top:0px;left:' + parseInt(w - (w / 3)) + 'px"></div>').appendTo(parentDiv);
        $('<div id="lnT" style="z-index:1000;position:absolute;background-color:Green;height:1px;width:' + w + 'px;top:' + h / 3 + 'px;left:0px"></div>').appendTo(parentDiv);
        $('<div id="lnB" style="z-index:1000;position:absolute;background-color:Green;height:1px;width:' + w + 'px;top:' + parseInt(h - (h / 3)) + 'px;left:0px"></div>').appendTo(parentDiv);
        /*       SLApp.UserAndInfoService.CropRectNew(ImageID,w,h, function (rect) {
                   SetCropper(rect, parentDiv, id, ImageID, w, h, ratio, null)
               });
       */
    };

    IV_SetImageHotspotPosition = function (hotX, hotY) {
        var box = $R('#IV_hotspot_pointer').data("box");

        box.data('HotX', hotX);
        box.data('HotY', hotY);

        var marker = $R('#IV_hotspot_pointer');
        var left = ((box.width()) - marker.width()) * hotX;
        var top = ((box.height()) - marker.height()) * hotY;
        marker.css('left', left + 'px');
        marker.css('top', top + 'px');
        $R('#IV_hotspot_arround').css({ 'left': left - 50 + "px", 'top': top - 50 + "px" });
    };
    logEvent = function (ev) {
        //el.innerText = ev.type;
        console.log(ev.type);
    };
    BindHandlers = function (idd) {




        var myImage = document.getElementById(idd + '_theImg');
        if (myImage == null)
            return;
        if (!MaVas.Bot) {
            var mc = new Hammer.Manager(myImage);
            // create a pinch and rotate recognizer
            // these require 2 pointers
            var pinch = new Hammer.Pinch();
            var swipe = new Hammer.Swipe();
            var pan = new Hammer.Pan({ threshold: 50, pointers: 0 });
            //        var rotate = new Hammer.Rotate();

            // we want to detect both the same time
            //        pinch.recognizeWith(rotate);

            // add to the Manager
            mc.add([pan, pinch]);

            mc.on("panstart press", function (event) {
                logEvent(event);
                var idd = $(event.target).data('idd');
                if (getMobileOperatingSystem() == 'unknown') {
                    startZoomer(idd);
                    event.preventDefault();
                    event.srcEvent.stopPropagation();
                }

                /*                var obj = $('#' + idd + '_theImg');
                                var pos = obj.offset();
                                obj.data('gotpanend', false);
                                obj.data('paning', true);
                                obj.data("startx", parseInt(obj.css('margin-left')));
                                obj.data("starty", parseInt(obj.css('margin-top')));
                                obj.data("startpos", pos);
                
                                loadImgZoomed(idd);
                */

            });
            /*
                        mc.on("panmove", function (event) {
                            if ($("#IV_hotspot_pointer").length > 0)
                                $("#HotSpotBtn").click();
                            var idd = $(event.target).data('idd');
                            var obj = $('#' + idd + '_theImg');
            
                            var zoom = parseInt(obj.data('zoom'));
                            if (zoom === 100) {
                                var margin = event.deltaX + obj.data("startx");
                                if (margin > 0 && obj.data("prevImg") === false)
                                    return;
                                if (margin < 0 && obj.data("nextImg") === false)
                                    return;
            
                                obj.css('margin-left', margin);
                            }
                            else {
                                var marginL = event.deltaX + obj.data("startx");
                                var marginT = event.deltaY + obj.data("starty");
                                var pos = obj.position();
            
                                if (marginL > -pos.left)
                                    marginL = -pos.left;
            
                                if (marginT > -pos.top)
                                    marginT = -pos.top;
            
                                if (marginL < $('#' + idd + '_IV_ImgHolder').width() - obj.width() - pos.left)
                                    marginL = $('#' + idd + '_IV_ImgHolder').width() - obj.width() - pos.left;
            
                                if (marginT < $('#' + idd + '_IV_ImgHolder').height() - obj.height() - pos.top)
                                    marginT = $('#' + idd + '_IV_ImgHolder').height() - obj.height() - pos.top;
            
                                obj.css('margin-left', marginL);
                                obj.css('margin-top', marginT);
                            }
                        });
            
                        mc.on("panend", function (event) {
                            logEvent(event);
                            var idd = $(event.target).data('idd');
                            var obj = $('#' + idd + '_theImg');
            
                            var zoom = parseInt(obj.data('zoom'));
                            if (zoom === 100) {
                                if (event.deltaX > 40 && !obj.data('gotpanend') && $('#' + idd + '_IV_ImgHolder').data('prevID')) {
                                    obj.data('gotpanend', true);
                                    $('#'+idd+'_IV_btnPrev').click();
                                }
                                else if (event.deltaX < -40 && !obj.data('gotpanend') && $('#' + idd + '_IV_ImgHolder').data('nextID')) {
                                    obj.data('gotpanend', true);
                                    $('#' + idd +'_IV_btnNext').click();
                                }
                                else {
                                    obj.css('margin-left', 0);
                                }
                            }
                            event.preventDefault();
                            event.srcEvent.stopPropagation();
                        });
            
                        mc.on("pinchend", function (event) {
                        });
            */
            mc.on("pinchstart", function (event) {
                var idd = $(event.target).data('idd');
                var obj = $('#' + idd + '_theImg');
                //if (obj.data('scale') != null)
                //    event.scale = obj.data('scale');
                obj.data('pinchZoom', obj.data('zoom'));
                startZoomer(idd);
            });
            /*
                        mc.on("pinch", function (event) {
                            var idd = $(event.target).data('idd');
                            var obj = $('#' + idd + '_theImg');
            
                            var zoom = Math.max(parseInt(obj.data('pinchZoom')) * event.scale, 100);
                            if (zoom === 100) {
                                obj.css({ 'margin-left': 0, 'margin-top': 0 });
                            } else {
                                //obj.css({ 'width': $R('#theImg').data('zoom') + '%', 'height': $R('#theImg').data('zoom') + '%' });
                                obj.css({ 'width': zoom + '%', 'height': zoom + '%' });
            
                                var marginL = obj.css('margin-left');
                                var marginT = obj.css('margin-top');
                                var pos = obj.position();
            
                                if (marginL > -pos.left)
                                    marginL = -pos.left;
            
                                if (marginT > -pos.top)
                                    marginT = -pos.top;
            
                                if (marginL < $('#' + idd + '_IV_ImgHolder').width() - obj.width() - pos.left)
                                    marginL = $('#' + idd + '_IV_ImgHolder').width() - obj.width() - pos.left;
            
                                if (marginT < $('#' + idd + '_IV_ImgHolder').height() - obj.height() - pos.top)
                                    marginT = $('#' + idd + '_IV_ImgHolder').height() - obj.height() - pos.top;
            
                                obj.css('margin-left', marginL);
                                obj.css('margin-top', marginT);
                            }
            
                            obj.data('zoom', zoom);
                            loadImgZoomed(idd);
                        });
            */
            mc.add(new Hammer.Tap({ event: 'doubletap', taps: 2 }));
            mc.on('doubletap', function (event) {
                var idd = $(event.target).data('idd');
                var obj = $('#' + idd + '_theImg');

                if (screenfull.enabled) {

                    $('#' + idd + '_IV_ShowFullSreen').click();
                    return;
                }



                if (parseInt(obj.data('zoom')) !== 100)
                    obj.data('zoom', 100);
                else
                    obj.data('zoom', parseInt(obj.data('zoom')) + 50);
                obj.css({ 'width': obj.data('zoom') + '%', 'height': obj.data('zoom') + '%' });


            });
        }
    };

    var disableImgEventHandlers = function (img) {
        var events = ['onclick', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover',
            'onmouseup', 'ondblclick', 'onfocus', 'onblur'];
        var idd = $(img).data('idd');

        events.forEach(function (event) {
            img[event] = function () {
                return false;
            };
        });
        $(img).off('click');
        $RI(idd, '#IVZoom').off('click');
        $RI(idd, '#IVZoom').on('click', function (e) {
            var whatImg = $(this).data('idd');
            if (!IsImageRotated($RI(whatImg, '#theImg'))) {
                if ($RI(whatImg, "#IVSliderHolder").hasClass('notVisible')) {
                    $RI(whatImg, "#IVSliderHolder").removeClass('notVisible');
                    startZoomer(whatImg);
                    $RI(whatImg, '#ZoomBtn').addClass('IV_Zoom_selected');
                }
                else {
                    startZoomer();
                    $RI(whatImg, "#IVSliderHolder").addClass('notVisible');
                    $RI(whatImg, '#ZoomBtn').removeClass('IV_Zoom_selected');
                }
            }
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        containerToImage = function (x, y, current_zoom) {
            var coords = {
                x: x,
                y: y
            };

            return {
                x: util.descaleValue(coords.x, current_zoom),
                y: util.descaleValue(coords.y, current_zoom)
            };
        };

        /**
        * convert coordinates on the image (in original size, and zero angle) to the coordinates on the container
        *
        * @return object with fields x,y according to coordinates
        **/
        imageToContainer = function (x, y, current_zoom) {
            var coords = {
                x: util.scaleValue(x, current_zoom),
                y: util.scaleValue(y, current_zoom)
            };

            return coords;
        };



        startZoomer = function (img) {
            if (!$RI(img, '#theImg').data('gotpanend')) {
                if (!IsImageRotated($RI(img, '#theImg'))) {

                    var zoom = $RI(img, "#theImg").data('zoom');
                    var parentOffset = $(this).parent().offset();
                    var zoomOld = zoom;

                    loadScript("/JavaScript/jquery.iviewer.js", function () {
                        $('<div id="viewer2" class="viewer"></div>').insertAfter($RI(img, '#ImgView'));
                        var ImgFields = $('#' + img + '_ImgViewDlg').data('imgfields');
                        var srcMax = "/MCIMG_" + img + "_" + $RI(img, '#theImg').data("width") + "_" + $RI(img, '#theImg').data("height") + "_" + $RI(img, '#theImg').data('version') + ImgFields.ext + "?v=" + $RI(img, '#theImg').data('version');
                        var largeImg = new Image();
                        var curZoom = -1;
                        var lc = null;
                        var lockReload = false;
                        //if ($("#viewer2").length == 0)
                        //    debugger;

                        HideControlsInZoom();
                        largeImg.onload = function () {
                            if ($("viewer2").length > 0)
                                iv2.iviewer('loadImage', largeImg.src)
                            largeImg = null;
                        }
                        //                            ZoomIn(zoom, center_z, img);

                        var timerWaiting = null;
                        if (typeof $("#viewer2").iviewer != "undefined") {
                            var iv2 = $("#viewer2").iviewer(
                                {
                                    src: srcMax, //$RI(img, "#theImg").prop('src'),
                                    onClick: function () {
                                    },
                                    zoom_min: 1,
                                    ui_disabled: true,
                                    /*
                                    onDrag: function (e, coords) {
                                        var c = iv2.iviewer('info', 'coords');
                                        if (!lockReload && lc != null && c.x == lc.x) {
                                            lockReload = true;
                                            var ItemsArround = GetLoadedThumbs();
                                            var midd = $(this).data('imgID');
                                            var idx = ItemsArround.findIndex((e) => e.id == midd);
                                    
                                            if (c.x == 0) {
                                                idx--;
                                            } else {
                                                idx++
                                            }
                                            theImg = ItemsArround[idx];
                                            var srcMax = "/MCIMG_" + theImg.id + "_" + theImg.sizex + "_" + theImg.sizey + "_" + theImg.version + theImg.ext + "?v=" + theImg.version;
                                    
                                    
                                            iv2.iviewer('reloadImage', theImg.imgtmb);
                                            var w = iv2.iviewer('info', 'display_width');
                                            var h = iv2.iviewer('info', 'display_height');
                                            if ((w + 3) < $('#viewer2').width() && (h + 3) < $('#viewer2').height()) {
                                                iv2.fit();
                                            }
                                            var largeImg = new Image();
                                            largeImg.src = srcMax;
                                    
                                            if (timerWaiting != null) {
                                                window.clearTimeout(timerWaiting);
                                            }
                                            timerWaiting = window.setTimeout(function () {
                                                largeImg.src = null;
                                                largeImg = null;
                                                lockReload = false;
                                            }, 5000);
                                            largeImg.onload = function () {
                                                iv2.iviewer('reloadImage', largeImg.src);
                                                lockReload = false;
                                                largeImg = null;
                                            }
                                            $(this).data('imgID', theImg.id);
                                        }
                                    
                                        lc = c;
                                    
                                        ;
                                    },
                                    */
                                    onAfterZoom: function (newZoom) {
                                        var w = iv2.iviewer('info', 'display_width');
                                        var h = iv2.iviewer('info', 'display_height');
                                        curZoom = newZoom;
                                        if ((w + 3) < $('#viewer2').width() && (h + 3) < $('#viewer2').height()) {
                                            var newID = $("#viewer2").data('imgID');
                                            $("#viewer2").remove();
                                            ShowControlsInZoom();
                                            if (largeImg)
                                                largeImg.src = "";
                                            if (newID != img) {
                                                ShowDetailView(newID, GetLoadedThumbs(), ParentView, true, false);
                                            }

                                        }
                                    }



                                }).data('imgID', img);
                            /*                              
                                                        window.setTimeout(function(){
                                                            iv2.iviewer('loadImage', srcMax);
                                                            iv2.bind('ivieweronfinishload', function(ev, src) { 
                                                            })
                            */


                            $RI(img, '#ZoomBtn').addClass('IV_Zoom_selected');
                            iv2.bind('ivieweronfinishload', function (ev, src) {
                                largeImg.src = srcMax;
                                iv2.unbind('ivieweronfinishload');
                                if (curZoom !== -1)
                                    iv2.iviewer('set_zoom', curZoom);

                            })
                            //                            loadImgZoomed(img);                        
                        }
                    });
                }
            }

        }

        $RI(idd, '#theImg').on('click', function (e) {
            var img = $(this).data('idd');
            if (getMobileOperatingSystem() == 'unknown') {
                startZoomer(img);
                e.preventDefault();
                e.stopPropagation();
            }
            return false;
        });

    };
    var HideControlsInZoom = function () {
        $('.TopImageBk').hide();
        $('#TV_thms').hide();
        $('.ZoomStatusLineIV').hide();
    }

    var ShowControlsInZoom = function () {
        if ($('.TopImageBk').length > 0)
            $('.TopImageBk').show();
        if ($('#TV_thms').length > 0)
            $('#TV_thms').show();
        if ($('.ZoomStatusLineIV').length > 0)
            $('.ZoomStatusLineIV').show();
    }

    var ResizeThumbs = function (id) {

        image = $R('#IV_Tmb' + id);
        for (var cbI = 0; cbI < 370; cbI += 90)
            image.removeClass("theImgrotate" + cbI);


        var rotateAngle = GetRotation(id);
        image.removeClass("theIamgeRotate*");
        image.addClass("theImgrotate" + rotateAngle);
        image.data("rotangle", "" + rotateAngle);


        $("#SLIMG_" + id).data("ltrotate", rotateAngle);
        return rotateAngle;
        /*
                return;       
        
        
        
        
        
                SLApp.UserAndInfoService.GetThumbLink(id, 200, true, function (lnk) {
                    var tmbSize = getCookie("thumbSize");
                    var obj = jQuery.parseJSON(lnk);
        
                    var objImg = $R('#SLIMG_' + id);
                    objImg.data({
                        "scale": obj.scale,
                        "sizex": obj.sizeX,
                        "sizey": obj.sizeY,
                        "imgtmb": obj.src
                    });
                    var scale = GetImageScaleFactor(obj.sizeX, obj.sizeY, tmbSize, tmbSize);
                    var w = scale * obj.sizeX;
                    var h = scale * obj.sizeY;
        
                    ImgObj = $R('#SLI_' + id + '_IMG');
                    ImgObj.css({
                        'width': w,
                        'margin-top': (nThumbSize - h) / 2 + 'px',
                        'margin-left': (nThumbSize - w) / 2 + 'px'
        
                    });
                    $R('#Tmb_' + id).height(h);
                    $R('#Tmb_' + id).width(w);
                    $R('#Tmb_' + id).attr('src', obj.src);
                    $R('#th_i_' + id).attr('src',"" );
        
                    var height = $R('#IV_Tmb' + id).height();
                    var width = $R('#IV_Tmb' + id).width();
                    height = width * obj.scale;
                    if (height < $R('#IV_Tmb' + id).height()) {
                        height = $R('#IV_Tmb' + id).height();
                        width = height / obj.scale;
                    }
        
                    var Element = $R('#IV_TmbIn_' + item.id);
        
                    Element.width(w);
                    Element.height(h);
        
        
                });
        */
    };

    GetRotation = function (id) {
        var rotateAngle = 0;
        var image = $RI(id, '#theImg').get(0);
        if (image) {
            rotateAngle = (Number(image.getAttribute("rotangle")));
        }
        return rotateAngle;
    };
    var RotBlocked = false;
    ApplyRotate = function (id) {
        var upd = setInterval(function (id) {
            var ImgFields = $('#' + id + '_ImgViewDlg').data('imgfields');
            if (ImgFields) {
                var newAngle = GetRotation(ImgFields.ID);
                newAngle += Number($RI(ImgFields.ID, '#theImg').data('ImageRotate'));
                if (!RotBlocked) {
                    RotBlocked = true;
                    SLApp.UserAndInfoService.RotateImage(ImgFields.ID, newAngle, function () {
                        RotBlocked = false;
                        clearInterval(upd);
                    }, function () {
                        RotBlocked = false;
                    });
                }
            }
        }, 1000, id);
    };
    ZoomIn = function (zoom, zoom_center, whatImg) {
        //        $R('#theImg').css({ 'width': parseInt($R('#theImg').data('width') * zoom / 100) + 'px' });
        if (typeof whatImg === "undefined") {
            whatImg = idd;
            //debugger;
        }
        logToConsole(zoom_center);
        var panImg = $RI(whatImg, '#theImg');
        var imhH = $RI(whatImg, '#theImgH');


        var old_x, old_y;
        var panWrapper = $RI(whatImg, "#IV_ImgHolder");


        let ZoomBefore = panImg.data('zoom');


        panImg.css({
            'width': parseInt($RI(whatImg, '#theImgH').width() * zoom / 100) + 'px',
            'height': parseInt($RI(whatImg, '#theImgH').height() * zoom / 100) + 'px'
        });
        var leftOffs = 0;
        var topOffs = 0;

        if ($RI(whatImg, '#IV_ImgHolder').width() < $(window).width()) {
            leftOffs = $(window).width() - imhH.width() / 2;
            topOffs = $RI(whatImg, '#IV_ImgHolder').height() - imhH.height() / 2;

            var w = Math.min($(window).width(), $RI(whatImg, '#theImg').width());
            $RI(whatImg, '#IV_ImgHolder').data('width_nozoom', $RI(whatImg, '#IV_ImgHolder').width());
            $RI(whatImg, '#IV_ImgHolder').width(w);
            let wi = imhH.width();
            imhH.width(w);
            var z = parseInt(panImg.data('width')) / parseInt(panImg.data('height'));
            let hi = imhH.height();
            imhH.height(w / z);
            leftOffs -= $(window).width() - imhH.width() / 2;
            topOffs -= $RI(whatImg, '#IV_ImgHolder').height() - imhH.height() / 2;


        } else {
            //            $RI(whatImg, '#IV_ImgHolder').width($RI(whatImg, '#IV_ImgHolder').data('width_nozoom'));

        }
        old_x = - parseInt(panImg.css('margin-left')) + zoom_center.x;
        old_y = - parseInt(panImg.css('margin-top')) + zoom_center.y;
        /*
                $RI(whatImg, '#theImg').css({
                    'width': parseInt($RI(whatImg, '#theImg').data('width') * zoom / 100) + 'px' ,
                    'height': parseInt($RI(whatImg,'#theImg').data('height') * zoom / 100) + 'px' });
        */
        panImg.data('zoom', zoom);
        if (zoom === 100) {
            panImg.data('zoomCenterX', .5);
            panImg.data('zoomCenterY', .5);

            panImg.offset({ left: 0, top: 0 });
            panImg.css({ 'margin-left': 0, 'margin-top': 0 });
            panImg.css({ 'left': 0, 'top': 0 });
            SizeImage(whatImg);
        } else {
            //            var mL = (e.offsetX - (e.offsetX * zoom / 100));
            //            var mT = (e.offsetY - (e.offsetY * zoom / 100));
            //                $R('#theImg').css({ 'margin-left': mL, 'margin-top': mT });
            $(".theImgMaxSizer").css('margin', 0);


            //            old_y += topOffs;
            //            old_x += leftOffs;

            var new_x = util.scaleValue(util.descaleValue(old_x, ZoomBefore), zoom);
            var new_y = util.scaleValue(util.descaleValue(old_y, ZoomBefore), zoom);

            new_x = zoom_center.x - new_x;
            new_y = zoom_center.y - new_y;
            logToConsole("lo " + leftOffs + ",to " + topOffs);





            new_x = Math.floor(new_x);
            new_y = Math.floor(new_y);



            //            panImg.css('margin-left', zoom_center.x - leftOffs -xOffs + "px");
            //            panImg.css('margin-top', zoom_center.y + topOffs -yOffs + "px");


            /*            if (new_x < $('#' + idd + '_IV_ImgHolder').width() - panImg.width() )
                            new_x = $('#' + idd + '_IV_ImgHolder').width() - panImg.width() ;
            
                        if (new_y < $('#' + idd + '_IV_ImgHolder').height() - panImg.height())
                            new_y = $('#' + idd + '_IV_ImgHolder').height() - panImg.height();
            */
            panImg.css('margin-left', new_x + "px");
            panImg.css('margin-top', new_y + "px");




            /*
                        if (panImg.length > 0) {
                            var panWrapper = $RI(whatImg, "#IV_ImgHolder");
                            if (panImg.offset().left + panImg.width() < panWrapper.width()) {
                                panImg.css('margin-left', panWrapper.width() - panImg.width() + "px");
                            }
                            if (panImg.offset().top + panImg.height() <= panWrapper.height()) {
                               panImg.css('margin-top', panWrapper.height() - panImg.height() + "px");
                            }
                                
                        }
            */

            //           panInit(mouse_pos,ZoomBefore,zoom,whatImg);
            //                $R('#theImg').css({ 'margin-left': (event.offsetX - $R('#theImg').width()/2) , 'margin-top': (event.offsetY - $R('#theImg').height()/2)  });
        }
        $R('#IV_ZoomSlider').slider('option', 'value', zoom - 100);
    };
    SetSliderZoom = function (value) {

    };
    preCalcContainerHeigt = function (id) {
        //        if (getMobileOperatingSystem() === 'unknown')
        $('#' + id + '_ImgView').data('scroller',
            MyScrollBar = new PerfectScrollbar($('#' + id + '_ImgView')[0], {
                suppressScrollX: true, minScrollbarLength: 40
            }));


    }

    DetailViewReady = function (whatImg) {
        var ImgFields = $('#' + whatImg + '_ImgViewDlg').data('imgfields');


        if ($RI(whatImg, "#RotateBtnCW").length > 0) {
            SLApp.UserAndInfoService.GetImageRotation(ImgFields.ID, function (rot) {
                $RI(ImgFields.ID, '#theImg').data('ImageRotate', rot);
            });
        }
        replaceDTVSVGs(whatImg);

        var offsetBottom = 19;
        /*if (!$R('#MenuDownload').hasClass('HiddenMenu')) {
            $R('#MenuDownload').addClass('HiddenMenu');
            DVDowloadMenuShow = true;
        }*/

        if (ImgFields.AllowDownload === 'true') {
            $RI(whatImg, '#MenuDownloadSingle').removeClass('HiddenMenu');
        }

        if (ImgFields.AllowPrint === 'true') {
            $RI(whatImg, '#MenuPrintSingle').removeClass('HiddenMenu');
        }

        if (ImgFields.AllowEdit === 'true') {


            $RI(whatImg, "#theImgH").data('HotX', ImgFields.HotX);
            $RI(whatImg, "#theImgH").data('HotY', ImgFields.HotY);
            StartImg(whatImg);
            $RI(whatImg, "#RotateBtnCW").click(function () {
                $RI(whatImg, '#theImg').data("zoom", 100);
                $RI(whatImg, '#theImg').offset({ left: 0, top: 0 });
                $RI(whatImg, '#theImg').css({ 'margin-left': 0, 'margin-top': 0 });
                $RI(whatImg, '#theImg').css({ 'left': 0, 'top': 0 });

                var newAngle = rotateCW($RI(whatImg, '#theImg')[0]);
                w = $RI(whatImg, '#theImg').data("width");
                $RI(whatImg, '#theImg').data("width", $RI(whatImg, '#theImg').data("height"));
                $RI(whatImg, '#theImg').data("height", w);
                $RI(whatImg, '#ZoomBtn').addClass('IV_Zoom_disabled');

                SizeImage(whatImg);

                UpdateImg();
                ResizeThumbs(ImgFields.ID);
                ApplyRotate(ImgFields.ID);
                /*
                                SLApp.UserAndInfoService.RotateImageR(ImgFields.ID, function (ok) {
                                    StopVids();
                                    StopImgLoading();
                                    var displIgnore = 0;
                                    for (var i = 0; i < ItemsArroundCurrentImage.length; i++) {
                                        if (ItemsArroundCurrentImage[i]) {
                                            switch (ItemsArroundCurrentImage[i].type) {
                                                case "dir":
                                                    displIgnore++;
                                                    break;
                                            }
                                        }
                                    }
                                    UpdateImg();
                                    ResizeThumbs(ImgFields.ID);
                                    clearTimeouts();
                                    ShowDetailView($('#ImageDlg').data('ItemsArround')[ImgIndex + displIgnore].id, ItemsArroundCurrentImage, $('#ImageDlg').data('parentView'), true);
                                    //            $($('#IV_TmbSlide').children()[Field(ImgIndex) + 1]).data('id')
                                });
                */

            });
            $RI(whatImg, "#RotateBtnCCW").click(function () {
                $RI(whatImg, '#theImg').data("zoom", 100);
                var newAngle = rotateCCW($RI(whatImg, '#theImg')[0]);
                w = $RI(whatImg, '#theImg').data("width");
                $RI(whatImg, '#theImg').data("width", $RI(whatImg, '#theImg').data("height"));
                $RI(whatImg, '#theImg').data("height", w);
                SizeImage(whatImg);
                UpdateImg();
                ResizeThumbs(ImgFields.ID);
                ApplyRotate(ImgFields.ID);
                $RI(whatImg, '#ZoomBtn').addClass('IV_Zoom_disabled');


                /*
                                SLApp.UserAndInfoService.RotateImageL(ImgFields.ID, function (ok) {
                                    StopVids();
                                    StopImgLoading();
                                    var displIgnore = 0;
                                    for (var i = 0; i < ItemsArroundCurrentImage.length; i++) {
                                        if (ItemsArroundCurrentImage[i]) {
                                            switch (ItemsArroundCurrentImage[i].type) {
                                                case "dir":
                                                    displIgnore++;
                                                    break;
                                            }
                                        }
                                    }
                                    UpdateImg();
                                    ResizeThumbs(ImgFields.ID);
                                    clearTimeouts();
                                    ShowDetailView($('#ImageDlg').data('ItemsArround')[ImgIndex + displIgnore].id, ItemsArroundCurrentImage, $('#ImageDlg').data('parentView'), true);
                                });
                */
            });
            $RI(whatImg, "#CropBtn").click(function () {
                var imgID = $(this).data('idd');
                var whatImg = imgID;
                var ImgFields = $('#' + whatImg + '_ImgViewDlg').data('imgfields');
                HideAllStatusBarBtns(imgID);
                var zImage = new Image();
                $(".Status").each(function () {
                    $(this).addClass("Hide");
                });

                zImage.onload = function (e) {
                    $('<div id="' + whatImg + '_CropHolder" class="theImgMaxSizer"></div>').appendTo($RI(whatImg, "#IV_ImgHolder"));
                    var zImageD = $('<img id="' + whatImg + '_OrigImgID_IV" style="visibility:visible;position:absolute;top:0;left:0" />');
                    zImageD.attr('src', zImage.src);
                    zImageD.appendTo($('#' + whatImg + '_CropHolder'));
                    $RI(whatImg, '#Images_IV').hide();
                    $('#TV_thms').data('noshow', true);
                    if (zImage.Rotation) {
                        $(zImageD).addClass('rotate' + zImage.Rotation);
                    }
                    var w = this.width;
                    var h = this.height;

                    $RI(whatImg, '#theImg').data('width', w);
                    $RI(whatImg, '#theImg').data('height', h);

                    $RI(whatImg, '#CropHolder').width(w);
                    $RI(whatImg, '#CropHolder').height(h);

                    SizeImage(whatImg);

                    //                        assert(09);
                    $("#RotateBtn").remove();
                    $("#RotateBtn2").remove();
                    var iWidth = $RI(whatImg, '#IV_ImgHolder').innerWidth();
                    var scale = w / iWidth;

                    CropperInitInitial(imgID, w, h, function () {
                        AddAspectRatioControl($("#ZoomFooter"), imgID, w, h, function (ratio, obj) {
                            SetCropper(CropRect, $RI(whatImg, '#CropHolder'), $RI(whatImg, '#OrigImgID_IV'), imgID, $RI(whatImg, '#IV_ImgHolder').width(), $RI(whatImg, '#IV_ImgHolder').height(), ratio, obj);
                        });
                        $RI(whatImg, "#CropBtn").hide();
                        $RI(whatImg, "#PrintBtn").hide();


                        $('#Crop').append('<div id="CropButtons"></div>');
                        $("#CropButtons").append('<div id="CropApplypBtn" class="StatusBarBtns CropStatus CropStatusBtn OnHover">' + _localized.Apply + '</div > ');
                        $("#CropButtons").append('<div id="CropCancelpBtn" class="StatusBarBtns CropStatus CropStatusBtn OnHover">' + _localized.Cancel + '</div>');
                        $("#CropButtons").append('<div id="CropResetBtn" class="StatusBarBtns CropStatus CropStatusBtn OnHover">' + _localized.Reset + '</div>');
                        if (CropRect.x === 0 && CropRect.y === 0 && CropRect.w === $RI(whatImg, '#theImg').data('width') && CropRect.h === $RI(whatImg, '#theImg').data('height')) {
                            $('#CropApplypBtn').hide();
                            $('#CropResetBtn').hide();
                        }
                        $("#CropApplypBtn").click(function (e) {
                            if (CropRect) {
                                $RI(whatImg, '#OrigImgID').Jcrop('destroy');
                                $RI(whatImg, "#CropApplypBtn").remove();
                                $RI(whatImg, '#OrigImgID').remove();
                                resetBtns();

                                SLApp.UserAndInfoService.CropImageNew(imgID, parseInt(CropRect.x), parseInt(CropRect.y), parseInt(CropRect.w), parseInt(CropRect.h),
                                    $RI(whatImg, '#OrigImgID_IV').width(), $RI(whatImg, '#OrigImgID_IV').height(), function (ok) {
                                        StopVids();
                                        StopImgLoading();
                                        var displIgnore = 0;
                                        for (var i = 0; i < ItemsArroundCurrentImage.length; i++) {
                                            switch (ItemsArroundCurrentImage[i].type) {
                                                case "dir":
                                                    displIgnore++;
                                                    break;
                                            }
                                        }
                                        ShowAllStatusBarBtns(ImgFields.ID);
                                        UpdateImg();
                                        SLApp.UserAndInfoService.GetThumbLink(ImgFields.ID, 200, true, function (lnk) {
                                            var obj = jQuery.parseJSON(lnk);
                                            $RI(whatImg, '#Tmb_' + ImgFields.ID).attr('src', obj.src);
                                            $RI(whatImg, '#Tmb_' + ImgFields.ID).height(obj.sizeY);
                                            $RI(whatImg, '#Tmb_' + ImgFields.ID).width(obj.sizeX);
                                        });
                                        clearTimeouts();
                                        ShowDetailView(ImgFields.ID, ItemsArroundCurrentImage, $('#ImageDlg').data('parentView'), true);
                                    });
                            }
                        });
                        $("#CropCancelpBtn").click(function (e) {
                            resetBtns();
                            StopVids();
                            StopImgLoading();
                            var displIgnore = 0;
                            for (var i = 0; i < ItemsArroundCurrentImage.length; i++) {
                                switch (ItemsArroundCurrentImage[i].type) {
                                    case "dir":
                                        displIgnore++;
                                        break;
                                }
                            }
                            UpdateImg();
                            clearTimeouts();
                            ShowAllStatusBarBtns($('#ImageDlg').data('ItemsArround')[ImgIndex + displIgnore].id);
                            ShowDetailView($('#ImageDlg').data('ItemsArround')[ImgIndex + displIgnore].id, ItemsArroundCurrentImage, $('#ImageDlg').data('parentView'), true);

                        });
                        $("#CropResetBtn").click(function (e) {
                            CropRect.x = CropRect.y = 0;
                            CropRect.w = $RI(whatImg, '#theImg').data('width');
                            CropRect.h = $RI(whatImg, '#theImg').data('height');
                            SetCropper(CropRect, $RI(whatImg, '#CropHolder'), $RI(whatImg, '#OrigImgID_IV'), -1, $RI(whatImg, '#IV_ImgHolder').width(), $RI(whatImg, '#IV_ImgHolder').height(), $RI(whatImg, '#IV_ImgHolder').data('ratio'), null);
                        });
                        var ws = w / scale;
                        var hs = h / scale;
                        var sc = ws / hs;
                        var InfoWidth = 0;
                        if (ws + InfoWidth > $(window).width() - 30) {
                            ws = $(window).width() - 30 - InfoWidth;
                            hs *= sc;
                        }
                        if (hs > $(window).height() - 180) {
                            hs = $(window).height() - 180;
                            ws *= sc;
                        }
                        CropperInit($RI(whatImg, '#CropHolder')[0], $RI(whatImg, '#OrigImgID_IV'), imgID, $RI(whatImg, '#IV_ImgHolder').width(), $RI(whatImg, '#IV_ImgHolder').height(), ratio);

                    });

                };
                SLApp.UserAndInfoService.GetRotation(ImgFields.ID, function (angle) {
                    $RI(whatImg, '#theImg').attr("src", "/MCIMGORIGR_" + ImgFields.ID + "_w60000_h60000_v" + ImgFields.Version + ImgFields.ext + "?V=" + ImgFields.Version + "&Rot=true");
                    zImage.src = "/MCIMGORIGR_" + ImgFields.ID + "_w60000_h60000_v" + ImgFields.Version + ImgFields.ext + "?V=" + ImgFields.Version + "&Rot=true";
                }, function () {
                    alert("Fehler in Crop Initialisierung")
                });
            });
            $RI(whatImg, '#HotSpotBtn').click(function () {

                if ($RI(whatImg, '#IV_hotspot_pointer').length === 0) {
                    var box = $("#theImgH");
                    var marker = $('<img id="IV_hotspot_pointer"  src="/images/Maintainer/hotspot-pointer.png" alt="" />').appendTo(box);
                    $('<div id="IV_hotspot_arround"></div>').appendTo(box);
                    $RI(whatImg, '#IV_hotspot_pointer').data("box", box);
                    if (box.data('HotX') === 0 && box.data('HotY') === 0) {
                        box.data('HotX', .5);
                        box.data('HotY', .5);
                    }
                    IV_SetImageHotspotPosition(box.data('HotX'), box.data('HotY'));

                    box.click(function (e) {
                        var marker = $RI(whatImg, '#IV_hotspot_pointer');
                        var hotX = (e.pageX - $(this).offset().left - (marker.width() / 2)) / $(this).width();
                        var hotY = (e.pageY - $(this).offset().top - (marker.height() / 2)) / $(this).height();
                        IV_SetImageHotspotPosition(hotX, hotY);
                        e.stopPropagation();
                        e.preventDefault();
                    });
                    marker.draggable({
                        start: function () {
                            $('#TV_thms').data('noshow', true);

                        },
                        containment: "parent",
                        drag: function (event, ui) {
                            var hotX = ($(this).offset().left - box.offset().left) / (box.width() - $(this).width());
                            var hotY = ($(this).offset().top - box.offset().top) / (box.height() - $(this).height());
                            IV_SetImageHotspotPosition(hotX, hotY);
                        },
                        stop: function (event, ui) {
                            var box = $RI(whatImg, '#Images_IV');
                            var hotX = ($(this).offset().left - box.offset().left) / (box.width() - $(this).width());
                            var hotY = ($(this).offset().top - box.offset().top) / (box.height() - $(this).height());
                            IV_SetImageHotspotPosition(hotX, hotY);
                            $('#TV_thms').data('noshow', false);

                        }
                    });
                } else {
                    $RI(whatImg, '#IV_hotspot_pointer').remove();
                    $RI(whatImg, '#IV_hotspot_arround').remove();
                }
            });
        }
        if ($RI(whatImg, "#IV_ZoomSlider").length > 0) {
            $RI(whatImg, "#IV_ZoomSlider").slider({
                slide: function (event, ui) {
                    //debugger
                    startZoomer(ui.value + 100);
                    console.log("Zoomslider " + ui.value);
                }

            });
        }


        $RI(whatImg, '#IVZoomClose').click(function (e) {
            ZoomIn(100, null, whatImg);
            $("#IVSliderHolder").addClass('notVisible');
            $RI(whatImg, '#ZoomBtn').removeClass('IV_Zoom_selected');
        });
        if (ImgFields.IsVideo === 'false') {

            $RI(whatImg, '#IV_UpDown').addClass('IV_UpDown_Open');
            setTimeout(function () {
                if (getCookie('ivslider') !== 'down') {
                    $('#IV_UpDown').removeClass('IV_UpDown_Open');
                    $('#TV_thms').removeClass('IV_ThmbsSmall');
                    $('#TV_thumbsBack').slideDown(1000, function () {
                    });
                }
            }, 3000);
        }
        else
            $RI(whatImg, '#IV_UpDown').addClass('IV_UpDown_Open');





        $(".autoExpandH").on('keyup', function () { AnimateTextarea($(this)); });
        $(".autoExpandH").on('keydown', function () { AnimateTextarea($(this)); });
        $RI(whatImg, '#ImgView').on('scroll', function (e) {
            ImgViewScrollPos = $RI(whatImg, '#ImgView').scrollTop();
            if ($RI(whatImg, '#ImgView').scrollTop() > 0)
                $RI(whatImg, "#IV_ShowInfo").addClass('rotate180');
            else
                $RI(whatImg, "#IV_ShowInfo").removeClass('rotate180');
            $RI(whatImg, '#IV_LeftRightHolder').offset({
                left: 0, top: $RI(whatImg, '#IV_PlaceHolder_Desc').offset().top
            });
            $RI(whatImg, '#ZoomFooter').offset({ top: 0 });
            $('.TopImageBk').offset({ top: 0 });
        });

        $("#ImgView").keydown(function (e) {
            var currentFoc = $(document.activeElement);
            if (!currentFoc.is('textarea') && !currentFoc.is('input')) {
                switch (event.which) {
                    case 37:
                        $RI(whatImg, '#IV_btnPrev').click();
                        break;
                    case 39:
                        $RI(whatImg, '#IV_btnNext').click();
                        break;

                    case 38:
                        $RI(whatImg, "#IV_ShowInfo").removeClass('rotate180');
                        $RI(whatImg, '#ImgView').scrollTop(0);
                        $RI(whatImg, '#ImgView').data('scroller').update();
                        break;
                    case 40:
                        $RI(whatImg, '#ImgView').scrollTop(1300);
                        $RI(whatImg, '#ImgView').data('scroller').update();
                        $RI(whatImg, "#IV_ShowInfo").addClass('rotate180');
                }
            }
        });
        $("#ImgView").focus();



        hideAddressBar(true);
        $.contextMenu({
            selector: '.imgselect',
            zIndex: 50000,
            callback: function (key, options) {

            },
            build: function ($triggerElement, event) {
                if (ImgFields.CopyRight.length == 0)
                    return false;

                return {
                    items: {
                        "Copyright": { name: ImgFields.CopyRightText }
                    }
                }
            }
        });
        function printPDF() {
            if (navigator.appName === 'Microsoft Internet Explorer') {

                //Wait until PDF is ready to print
                if (typeof document.getElementById("DetailImage").print === 'undefined') {

                    setTimeout(function () { printPDF("DetailImage"); }, 1000);

                } else {

                    var x = document.getElementById("DetailImage");
                    x.print();
                }

            } else {

                PDFIframeLoad();  // for chrome
            }
        }

        //for Chrome
        function PDFIframeLoad() {
            var iframe = document.getElementById('DetailImage');
            if (iframe.src) {
                var frm = iframe.contentWindow;

                frm.focus();// focus on contentWindow is needed on some ie versions
                frm.print();
                return false;
            }
        }
        function DoHoverOnItems(obj) {
            obj.hover(function (e) {
                AllowHide = false;
            }, function (l) {
                AllowHide = true;
            });
        };

        doDownLoad = function (id) {
            //debugger
            var downloadWithCopyright = "False";
            SLApp.DownloadHandler.PrepareFileDownload('&&Type=zip&Variables=embed&sub=yes&imgID=' + id + '&Copyright=' + downloadWithCopyright + '&l=' + _locStrings.LanguageCode, function (result) {
                var array = [result];
                setCookie('downloads', JSON.stringify(array), 180);
                showDownloadInfo(result);
            }, function (err) {
                HideSpinner();
                displayErrorMesssage(err.get_message(), _localized.Error);
            });
        };

        $R('#ImgView').height($('#ImageDlg').height());

        DoHoverOnItems($R('#IV_btnPrev'));
        DoHoverOnItems($R('#IV_btnNext'));
        //        DoHoverOnItems($('#TV_thms'));

        /*        $R('#ImgViewDlg').mousedown(function (e) {
                    mousedown = true;
                }).mouseup(function (e) {
                    mousedown = false;
                }).mouseout(function (e) {
                    mousedown = false;
                });
        */
        if (ImgFields.IsVideo === 'false') {
            try {
                //                window.external.WriteToLog("MC ImageViewer started")

                $R('#IV_ImgCont').PadMouseDrag({

                    click: function (e) {

                        //                        e.preventDefault();
                        if (event.clientX != undefined) {
                            var x = event.clientX, y = event.clientY;
                            var elementMouseIsOver = document.elementFromPoint(x, y);
                            if (!$(elementMouseIsOver).hasClass('leftrightclicker'))
                                return;
                        }
                        if (e.data._endMoveX != undefined) {
                            if ((!e.data._endMoveX && !e.data._endMoveY) || (Math.abs(e.data._startMoveX - e.data._endMoveX) < 10 && Math.abs(e.data._startMoveY - e.data._endMoveY) < 10)) {

                                var Elem = document.elementFromPoint(e.data._startMoveX, e.data._startMoveY);
                                if ($(Elem).hasClass('leftrightclicker')) {
                                    var displIgnore = 0;
                                    if (e.pageX < $(window).width() / 2) {
                                        StopVids();
                                        StopImgLoading();
                                        if ($R('#IV_btnPrev').is(':visible')) {
                                            for (var i = 0; i < ItemsArroundCurrentImage.length; i++) {
                                                switch (ItemsArroundCurrentImage[i].type) {
                                                    case "dir":
                                                        displIgnore++;
                                                        break;
                                                }
                                            }
                                            UpdateImg();
                                            clearTimeouts();
                                            ShowDetailView($('#ImageDlg').data('ItemsArround')[ImgIndex + displIgnore - 1].id, ItemsArroundCurrentImage, $('#ImageDlg').data('parentView'), true);

                                        }
                                    } else {
                                        StopVids();
                                        StopImgLoading();
                                        if ($R('#IV_btnNext').is(':visible')) {
                                            for (var i1 = 0; i1 < ItemsArroundCurrentImage.length; i1++) {
                                                switch (ItemsArroundCurrentImage[i1].type) {
                                                    case "dir":
                                                        displIgnore++;
                                                        break;
                                                }
                                            }
                                            UpdateImg();
                                            clearTimeouts();
                                            ShowDetailView($('#ImageDlg').data('ItemsArround')[ImgIndex + displIgnore + 1].id, ItemsArroundCurrentImage, $('#ImageDlg').data('parentView'), true);

                                        }
                                    };
                                }
                            }
                        }
                    }

                });
            } catch (e) { ; };

            $R('#IV_ShowInfo').show();
        }
        if ($R('#fs').length > 0) {
            $R('#fs').children().remove();
            $("#IV_ImgCont").appendTo($("#fs"));
        }

        //        SizeImage();



        if (ImgFields.OutsideSL === true) {
            if (screenfull.enabled) {
                $R('#IV_ShowFullSreen').css('display', 'block');
                $R('#IV_ShowFullSreen').click(function () {
                    if (screenfull.isFullscreen) {
                        $('body').data("FullScreen", false);
                        $("#IV_ImgCont").prependTo($("#ImgView"));
                        //                        $.fullscreen.exit();
                        //                        $.fullscreen.exit();
                        screenfull.exit();
                        $R('#fs').remove();
                        //                        BindHandlers();
                    }
                    else {
                        $('body').data("FullScreen", true);
                        $('<div id="fs"></div>)').appendTo($('body'));
                        $("#IV_ImgCont").appendTo($("#fs"));
                        screenfull.request($R('#fs')[0]);
                        //                        $.fullscreen.open($R('#fs')[0]);

                    }
                    return;
                });
                $(document).unbind("fullscreenchange MSFullscreenChange mozfullscreenchange webkitfullscreenchange");
                $(document).bind('fullscreenchange MSFullscreenChange mozfullscreenchange webkitfullscreenchange', function (e, state, elem) {

                    // if we currently in fullscreen mode
                    if (screenfull.isFullscreen) {
                        SizeImage();
                    } else {
                        // Do nothing
                        $('body').data("FullScreen", false);
                        $("#IV_ImgCont").prependTo($("#ImgView"));
                        $R('#fs').remove();
                        SizeImage();
                        $(document).unbind("fscreenchange");
                        //                        BindHandlers();
                    }
                });

            }
        }
        var ImgIndex = 0;
        if (whatImg === $('.ImgDlg .ImgViewDlg').first().data('idd')) {
            try {
                ImgIndex = parseInt(ImgFields.ImgIndex);
                if (ImgIndex === 0) {
                    $('.IV_btnPrev').hide();
                    $('#ImageDlg').data("prevImg", false);
                }
                else {
                    $('#ImageDlg').data("prevImg", true);
                    var t1 = setTimeout(function () {
                        ImgIndex = parseInt(ImgFields.ImgIndex);
                        if (ImgIndex && $('#ImageDlg').length > 0) {

                            var timg = $RI(ImgFields.ID, '#IV_ImgHolder').data('prevImg');
                            if (timg == null) {
                                var itms = $('#ImageDlg').data('ItemsArround');
                                for (var i = 0; i < itms.length && typeof timg == "undefined"; i++) {
                                    if (itms[i].id === ImgFields.ID)
                                        timg = itms[i];
                                }
                            }
                            if (timg) {
                                $R('#imgBefore').attr("src", timg.imgtmb);
                                $R('#imgBefore').css({ "max-height": timg.sizey + "px", "max-width": timg.sizex + "px" });
                                $R('#imgBefore').data('info', $('#ImageDlg').data('ItemsArround')[ImgIndex - 1]);
                                if (timg && timg.sizex > timg.sizey) {
                                    $R('#imgBefore').width('100%');
                                } else {
                                    $R('#imgBefore').height('100%');
                                }
                            }
                        }
                    }, 1000);
                    $R('#ImgViewDlg').data('timer1', t1);
                }

                if (!$R('#IV_ImgHolder').data('nextID')) {
                    $('#ImageDlg').data("nextImg", false);
                    $('.IV_btnNext').hide();
                }
                else {
                    $('#ImageDlg').data("nextImg", true);
                }
            } catch (e) { ; };
        }
        $R('#IV_Right').click(function (e) {
            if ($R('#IV_btnNext').length)
                $R('#IV_btnNext').click();
        });
        $R('#IV_Left').click(function (e) {
            $R('#IV_btnPrev').click();
        });
        function disableFwd() {
            $("#IVTmbs_right").prop("disabled", true);
            $("#IVTmbs_left").prop("disabled", true);
        }
        function enableFwd() {
            $("#IVTmbs_right").prop("disabled", false);
            $("#IVTmbs_left").prop("disabled", false);

        }

        function CheckPosRedBdr(lr) {
            var pos = { left: $(window).width() / 2, top: 0 };//$R('#ShowImage').position();

            if (parseInt($("#IV_TmbSlide").css('margin-left')) > pos.left)
                $('#IV_TmbSlide').animate({ "left": pos.left }, 10, function () {
                });
            var last = $('.IV_imageThumbs div').last();
            if (last.position().left < pos.left - last.width() / 2)
                $('#IV_TmbSlide').animate({ "left": ($("#IV_TmbSlide").width() - pos.left * 1.5) * -1 }, 10, function () {
                });

            var w = $(".IV_Tmb").width();
            if (pos != null && pos != undefined) {
                var found = false;
                $('.IV_imageThumbs div').each(function () {
                    if ($(this).data('id') != null) {
                        if ($(this).position().left >= pos.left - w / 3 && $(this).position().left <= pos.left + w) {
                            $('.IV_imageThumbs div').removeClass('redBorder');
                            $(this).addClass('redBorder');
                            currentImg = $(this);
                            StartNewImageInAWhile(currentImg.data('id'));
                            found = true;
                            var theThumb = $R('#IV_Tmb' + $(this).data('id'));
                            if (theThumb.length) {
                                var itemdata = theThumb.data('item');

                                var ItemsArround = $('#TV_thms').data("ItemsArround");
                                disableFwd();
                                GetThumbData(itemdata.index, ItemsArround, function (Data, hasNewData) {
                                    enableFwd();

                                    if (hasNewData) {

                                        $('#TV_thms').data("ItemsArround", ItemsArround);
                                        var newIdx = 0;
                                        var loop = 0;
                                        $(Data).each(function (idx, item) {
                                            if (item && parseInt(item.id) === parseInt(itemdata.id)) {
                                                newIdx = item.index;
                                            }
                                            loop++;
                                        });
                                        BuildThumbSlider(Data, -1, itemdata.id, true);
                                        //                                        currentImg

                                        $(".IV_Tmb").each(function (idx, element) {
                                            var item = $(this).data('item');
                                            $('#th_i_' + item.id).attr('src', '/SLOAIMGTMB_' + item.id + '_' + item.dir + '_' + item.version + '.jpg?w=200&f=l');
                                        });
                                        StartNewImageInAWhile(itemdata.id, Data, null, true);
                                        ItemsArround = Data;
                                    }
                                }, function () {
                                    enableFwd();
                                });

                            }

                            return false;
                        }
                    }
                });
                /*
                if (!found) {
                    var item = $('.IV_imageThumbs div').first();
                    if (lr === 'right')
                        item = $('.IV_imageThumbs div').last();
                    var diff = $(item).position().left - pos.left;

                    $('#IV_TmbSlide').animate({ "margin-left": "+=" + diff }, "slow", function () {
                        $('.IV_imageThumbs div').each(function () {
                            if ($(this).data('id') != null) {
                                if ($(this).position().left >= pos.left - 30 && $(this).position().left <= pos.left + 90) {
                                    $('.IV_imageThumbs div').removeClass('redBorder');
                                    $(this).addClass('redBorder');
                                    currentImg = $(this);
                                    StartNewImageInAWhile();
                                    found = true;
                                    return true;
                                }
                            }
                        });
                    });
                }
                */
                return false;
            }
        }
        $('.IV_btnNext').click(function (e) {
            if ($("#ImageDlg_next").length > 0) {

                if ($('#ImageDlg_next').children('.ImgViewDlg').first().data('idd') == undefined) {
                    console.log('Next detail view not fully initialized - click ignored!');
                    e.preventDefault();
                    return;
                }

                $(this).data('clickTimeout', 0);
                ShowControlsInZoom();
                $("#viewer2").remove();

                var midd = idd = $('.ImgDlg .ImgViewDlg').first().data('idd');
                StopVids();
                UpdateImg(midd);
                $('#' + idd + '_ImgView').off('ps-scroll-y');
                if (tiScroller !== null)
                    clearTimeout(tiScroller);
                tiScroller = null;

                clearTimeouts();
                $('#ImageDlg_prev').remove();
                var ItemsArround = GetLoadedThumbs();
                var ParentView = $('#ImageDlg').data('ParentView');

                $('#ImageDlg').attr("id", "ImageDlg_prev");
                $('#ImageDlg_prev').addClass("imgDlgPrev newImage");
                $('#ImageDlg_prev').removeClass("ImgDlg");
                $("#ImageDlg_next").attr("id", "ImageDlg");
                //$('#ImageDlg').css('top', 0);
                $('#ImageDlg').addClass('ImgDlg newImage');
                $('#ImageDlg').removeClass('imgDlgNext');

                $('.displayeditem').each(function () {
                    $(this).css('margin-left', '');
                });

                midd = idd = $('.ImgDlg .ImgViewDlg').first().data('idd');
                if (typeof midd !== 'undefined')
                    $('#TV_thms').css('bottom', $(window).height() - $('#' + midd + '_IV_DescrInner').offset().top);

                $('#ImageDlg').data('ParentView', ParentView);
                $('#ImageDlg').data('ItemsArround', ItemsArround);
                if (idd) {
                    SetPrevNextID(idd);
                    preCalcContainerHeigt(idd);
                    loadNextImage(idd);
                    loadPrevImage(idd);
                    StartImg(idd);
                    var CurrentTmb = BuildThumbSlider(ItemsArround, -1, midd);
                }
                try {

                    $('.ImgDlg video').each(function () {
                        this.play();
                        $(this).bind('ended', function (e) {
                            var ImgFields = $('#' + midd + '_ImgViewDlg').data('imgfields');
                            this.setAttribute('poster', '/MCIMG_' + ImgFields.ID + '_' + ImgFields.SizeX + '_' + ImgFields.SizeY + ImgFields.OrigExt + '.jpg');
                            this.load();
                        });
                    });

                } catch (e) {
                    ;
                }
                //                replaceDTVSVGs(midd);
                ShowAllStatusBarBtns(midd);
            }
            e.preventDefault();
        });
        $('.IV_btnPrev').click(function (e) {
            if ($("#ImageDlg_prev").length > 0) {

                if ($('#ImageDlg_prev').children('.ImgViewDlg').first().data('idd') == undefined) {
                    console.log('Previous detail view not fully initialized - click ignored!');
                    e.preventDefault();
                    return;
                }

                $(this).data('clickTimeout', 0);
                $("#viewer2").remove();
                ShowControlsInZoom();

                StopVids();
                UpdateImg();
                clearTimeouts();
                $('#' + idd + '_ImgView').off('ps-scroll-y');
                if (tiScroller !== null)
                    clearTimeout(tiScroller);
                tiScroller = null;


                $('#ImageDlg_next').remove();
                $('.displayeditem').each(function () {
                    $(this).css('margin-left', '');
                });

                var ItemsArround = GetLoadedThumbs();
                var ParentView = $('#ImageDlg').data('ParentView');

                $('#ImageDlg').attr("id", "ImageDlg_next");
                $('#ImageDlg_next').addClass("imgDlgNext newImage");
                $('#ImageDlg_next').removeClass("ImgDlg");

                $("#ImageDlg_prev").attr("id", "ImageDlg");
                //$('#ImageDlg').css('top', 0);
                $('#ImageDlg').addClass('ImgDlg newImage');
                $('#ImageDlg').removeClass('imgDlgPrev');

                idd = $('.ImgDlg .ImgViewDlg').first().data('idd');
                $('#ImageDlg').data('ParentView', ParentView);
                $('#ImageDlg').data('ItemsArround', ItemsArround);
                var midd = $('.ImgDlg .ImgViewDlg').first().data('idd');
                try {
                    if(midd != null)
                        $('#TV_thms').css('bottom', $(window).height() - $('#' + midd + '_IV_DescrInner').offset().top);
                } catch (e) { };
                StartImg(idd);

                SetPrevNextID(idd);
                preCalcContainerHeigt(idd);

                loadNextImage(idd);
                loadPrevImage(idd);
                var CrurrentTmb = BuildThumbSlider(ItemsArround, -1, midd);

                e.preventDefault();
                try {
                    $('.ImgDlg video').each(function () {
                        this.play();
                        $(this).bind('ended', function (e) {
                            var ImgFields = $('#' + midd + '_ImgViewDlg').data('imgfields');
                            this.setAttribute('poster', '/MCIMG_' + ImgFields.ID + '_' + ImgFields.SizeX + '_' + ImgFields.SizeY + ImgFields.OrigExt + '.jpg');
                            this.load();
                        });
                    });
                } catch (e) {
                    ;
                }
                replaceDTVSVGs(midd);
                ShowAllStatusBarBtns(idd);
            }
            e.preventDefault();
        });
        $('#IVTmbs_right').off('click');
        $('#IVTmbs_left').off('click');

        $('#IVTmbs_right').click(function () {
            var middlePos = $('#TV_thms').width() / 2;
            items = parseInt(middlePos / 92) * 92;
            var posBefore = $('#IV_TmbSlide').position().left;
            if (CheckMaxTmbSlidePos(posBefore - items)) {
                $('#IV_TmbSlide').animate({ "left": "-=" + items }, "slow", function (e) {
                    var pos = $('.IV_Tmb').last().outerWidth() * $('.IV_Tmb').last().index();
                    var l = $('#IV_TmbSlide').position().left + pos;
                    if (l > $(window).width() && l < $(window).width() * 2)
                        GetMoreThumbs();
                    if (l < 0) {
                        $('#IV_TmbSlide').animate({ "left": "+=" + items }, "fast");
                    }

                });
            }
        });

        $('#IVTmbs_left').click(function () {
            var middlePos = $('#TV_thms').width() / 2;
            items = (parseInt(middlePos / 92)) * 92;
            var itemFirst = $('.IV_Tmb').first();
            var move = false;
            if ($(itemFirst).data('item').index === 0) {
                var pos = itemFirst.offset();
                if (pos.left < $(window).width() / 2)
                    move = true;
            } else {
                move = true;
            }
            if (move) {

                $('#IV_TmbSlide').animate({ "left": "+=" + items }, "slow", function () {
                    var pos = $('.IV_Tmb').first().outerWidth() * $('.IV_Tmb').first().index();
                    var l = $('#IV_TmbSlide').position().left + pos;

                    //                var pos =  $('.IV_Tmb').first().position();
                    if (l > -$(window).width() && l < $(window).width())
                        GetMoreThumbs('left');
                });
            } else {
                $('#IV_TmbSlide').css('left', $(window).width() / 2);
            }
        });

        if ($R("#IV_ShowInfo").data('scrollId') == undefined) {
            $R("#IV_ShowInfo").data('scrollId', idd);
            $R("#IV_ShowInfo").click(function () {
                var id = $(this).data('scrollId');
                if (!$(this).hasClass('rotate180')) {
                    $(this).addClass('rotate180');
                    $RI(id, '#ImgView').scrollTop(1300);
                } else {
                    $(this).removeClass('rotate180');
                    $RI(id, '#ImgView').scrollTop(0);
                }
                if ($RI(id, '#ImgView').data('scroller'))
                    $RI(id, '#ImgView').data('scroller').update();
            });
        }

        if (ImgFields.IsVideo === 'true') {
            window.setTimeout(function () {
                try {
                    if ($('#' + ImgFields.ID + '_theImgH').find('video').length > 0) {
                        console.warn('Detail view with video ' + ImgFields.ID + ' already loaded!');
                        return;
                    }

                    if (ImgFields.theVideo != null && $('#' + ImgFields.ID + '_theImgH').data('video-loadad') === 1) {
                        try {
                            var video = ImgFields.theVideo;
                            video.unload()
                                .then(() => {
                                    video.destroy();
                                })
                                .catch((error) => {
                                    console.error("Source unload failed with error: ", error);
                                });
                        } catch (e) {
                            console.log("No video!" + e.message);
                        }
                    }

                    $('#' + ImgFields.ID + '_theImgH').data('width', ImgFields.SizeX);
                    $('#' + ImgFields.ID + '_theImgH').data('height', ImgFields.SizeY);

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
                            autoplay: $('#' + ImgFields.ID + '_theImgH').parents('.ImgDlg').length > 0
                        },
                        // Subscribe to player events
                        events: {
                            [mkplayer.MKPlayerEvent.Error]: (event) => {
                                console.log("Encountered player error: ", JSON.stringify(event));
                            }
                        }
                    };

                    ImgFields.theVideo = new mkplayer.MKPlayer(document.getElementById(ImgFields.ID + '_theImgH'), playerConfig);
                    const sourceConfig = {
                        //title: "Title for your source",
                        //description: "Brief description of your source",
                        poster: '/MCIMG_' + ImgFields.ID + '_' + ImgFields.SizeX + '_' + ImgFields.SizeY + ImgFields.OrigExt + '.jpg',
                        hls: ImgFields.VideoHLS,
                        dash: ImgFields.VideoDash
                    };

                    ImgFields.theVideo.load(sourceConfig)
                        .then(() => {
                            $('#' + ImgFields.ID + '_theImgH').data('video-loadad', 1);
                            SizeImage(ImgFields.ID);
                        })
                        .catch((error) => {
                            console.error("An error occurred while loading the source!");
                        });

                    //$('.vjs-default-skin .vjs-control-bar').addClass('IV_VideoMargins');
                    if (ImgFields.ID === $('.ImgDlg .ImgViewDlg').first().data('idd')) {
                        try {
                            $('.ImgDlg video').each(function () {
                                $(this).bind('play', function (e) {
                                    if (!$('#IV_UpDown').hasClass('IV_UpDown_Open'))
                                        $('#ID_ThumbsContainer_sliderBtn').click();
                                });
                                $(this).bind('ended', function (e) {
                                    this.setAttribute('poster', '/MCIMG_' + ImgFields.ID + '_' + ImgFields.SizeX + '_' + ImgFields.SizeY + ImgFields.OrigExt + '.jpg');
                                    this.load();
                                });

                                if (getMobileOperatingSystem() != 'iOS')
                                    this.play();
                            });
                        } catch (e) {
                            ;
                        }
                    }

                    window.setTimeout(function () {
                        $(".IV_Tmb").each(function (idx, element) {
                            var item = $(this).data('item');
                            $('#th_i_' + item.id).attr('src', '/SLOAIMGTMB_' + item.id + '_' + item.dir + '_' + item.version + '.jpg?w=200&f=l');
                        });
                    }, 300);
                } catch (e) {
                    console.log("no video?");
                };
            }, 300);
        }
        if (ImgFields.IsDocument === 'true') {
            HideAllStatusBarBtns(ImgFields.ID);
            $('<div id="DetailImage' + ImgFields.ID + '" class="DetailImgFrame" ></div>').appendTo($RI(ImgFields.ID, '#IV_ImgHolder'));

            $RI(ImgFields.ID, '#IV_ImgHolder').data('width', $(window).width());
            $RI(ImgFields.ID, '#IV_ImgHolder').data('height', $(window).height());

            loadScript("/JavaScript/pdfs/build/pdf.js", function () {
                loadScript("/JavaScript/pdfs/pdfobject.js", function () {
                    switch (ImgFields.ext.toLowerCase()) {
                        case ".pdf":
                            {

                                var options = {
                                    pdfOpenParams: {
                                        navpanes: 1,
                                        toolbar: 0,
                                        statusbar: 1,
                                        sidebar: 1,
                                        view: "FitV",
                                        pagemode: "none",
                                        page: 1
                                    },
                                    forcePDFJS: true,
                                    PDFJS_URL: "/JavaScript/pdfs/web/viewer.html",
                                    id: ImgFields.ID + '_PdfIFrame'
                                };

                                var myPDF = PDFObject.embed("/MEDIA_" + ImgFields.ID + ".pdf", "#DetailImage" + ImgFields.ID, options);
                                $RI(ImgFields.ID, "#PdfIFrame").ready(function () {
                                    var iFrameWin = $RI(ImgFields.ID, "#PdfIFrame")[0].contentWindow;
                                    setTimeout(function () {
                                        iFrameWin.postMessage("AllOff", window.location);
                                    }, 1000);
                                    if (ImgFields.AllowPrint === 'true') {
                                        setTimeout(function () {
                                            iFrameWin.postMessage("print:on", window.location);
                                        }, 4000);
                                    }
                                    if (ImgFields.AllowDownload === 'true') {
                                        setTimeout(function () {
                                            iFrameWin.postMessage("AllowDowload:on", window.location);
                                        }, 4100);
                                    }
                                    setTimeout(function () {
                                        iFrameWin.postMessage("setThumbsLink", window.location);
                                    }, 5999);

                                });


                            }
                            break;

                        default:
                            break;
                    }

                });

            });

            theImageLoadet(ImgFields.ID);

        }
        /*
                var middlePos = $('#TV_thms').width() / 2;
                var childThms = $('.IV_imageThumbs').children();
                var foundIdx = 0;
                for (var cbI = 0; cbI < childThms.length && foundIdx === 0; cbI++) {
                    if ($(childThms[cbI]).data('id') === ImgFields.ID)
                        foundIdx = cbI;
                }
                var posCurrent = foundIdx * $('.IV_Tmb').first().width();// $('.IV_TmbSlide').children().first().outerWidth();//thumbWidth;
                $('#IV_TmbSlide').css('margin-left', (posCurrent * -1) + middlePos - ($('.IV_Tmb').first().width()*1.5) + 'px');
         */
        var Width = $(window).innerWidth();
        if (Width > 3) {
            //            ShowHideThumbNails();
            window.setTimeout(function () {


                $("#ImgViewDlg").bind("mouseenter", function (event) {
                    startTmbPos = { left: event.pageX, top: event.pageY };
                });
                $("#ImgViewDlg").bind("mousemove touchstart", function (event) {
                    if (ImgFields.ext.toLowerCase() !== '.pdf') {
                        if (!startTmbPos)
                            startTmbPos = { left: event.pageX, top: event.pageY };
                        if (Math.abs(startTmbPos.left - event.pageX) > 200 || Math.abs(startTmbPos.top - event.pageY) > 200) {
                            startTmbPos = { left: event.pageX, top: event.pageY };
                            ShowHideThumbNails(event);
                        }
                    }
                });
                //                BindHandlers();
            }, 500);

        }


        SizeImage(whatImg);
        if (ImgFields.AllowEdit === 'true') {
            $R('#ImgView').scrollTop(ImgViewScrollPos);
            $('.IV_edit').on('input', function () {
                AddUndoImageInfo($(this).data('idd'));
            });
            $('.IV_editDate').on('input', function () {
                AddUndoImageInfo($(this).data('idd'));
            });
        }
        var margin = 0;
        $RI(whatImg, '#DateTakenBtn').click(function () {
            window.location.href = ImgFields.DateTakenHREF + GetViewTypesParam();

        });
        $RI(whatImg, '#DateInsertedBtn').click(function () {
            window.location.href = ImgFields.DateInsertedHREF + GetViewTypesParam();
        });
        $RI(whatImg, '#IV_ImgShare').click(function () {
            //debugger
            ShowImageShareMenu($(this), ImgFields.ID);
        });
        $RI(whatImg, "#ShareImg").click(function () {
            //debugger
            ShowImageShareMenu($(this), $(this).data('idd'));
        });



        //        BindHandlers();
        var bgPosX = 0;// -(bgWidth - width) / 2;
        var bgPosY = 0;//-(bgHeight - height) / 2;;



        $RI(whatImg, '#IV_ImgHolder').bind('mousewheel DOMMouseScroll', function (ev) {
            var e = ev.originalEvent;
            var deltaY = 0;
            var whatImg = $(this).data('idd');
            if ($RI(whatImg, "#IVSliderHolder").hasClass('notVisible'))
                return;
            e.preventDefault();

            /*            if (e.deltaY) { // FireFox 17+ (IE9+, Chrome 31+?)
                            deltaY = e.deltaY;
                        } else if (e.wheelDelta) {
                            deltaY = -e.wheelDelta;
                        }
                        var img = $RI(whatImg,'#theImg')[0];
            
                        // As far as I know, there is no good cross-browser way to get the cursor position relative to the event target.
                        // We have to calculate the target element's position relative to the document, and subtrack that from the
                        // cursor's position relative to the document.
                        if ($("#IV_hotspot_pointer").length > 0)
                            $("#HotSpotBtn").click();
            
                        var zoom = parseInt($RI(whatImg, '#theImg').data('zoom'));
                        var zoomOld = zoom;
                        var parentOffset = $(this).parent().offset();
                        if (deltaY > 0) {
            //            if (e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0) {
                            if ($RI(whatImg, '#theImg').width() < $RI(whatImg,'#theImg').data('width') * 3) {
                                if (zoom === 100) {
            
                                    $RI(whatImg,'#theImg').offset({ left: 0, top: 0 });
                                    $RI(whatImg,'#theImg').css({ 'margin-left': 0, 'margin-top': 0 });
                                    $RI(whatImg,'#theImg').css({ 'left': 0, 'top': 0 });
                                }
                                zoom -= 10;
                            }
                        }
                        else {
                            if ($RI(whatImg, '#theImg').data('width') * 2 > $RI(whatImg, '#theImg').width())
                                zoom += 10;
                        }
            
                        var center_z = {
                            x : e.pageX - parentOffset.left,
                            y : e.pageY - parentOffset.top
                        }
                        logToConsole(center_z);
            
                        ZoomIn(Math.max(100,zoom), center_z, whatImg);
            */
            e.preventDefault();
            e.stopPropagation();
            //            loadImgZoomed(whatImg);
        });
        if (ImgFields.InsideSL === 'true' || getMobileOperatingSystem() != 'unknown') {
            $RI(whatImg, '#theImg').PadMouseDrag({
                start: function (event, elem, obj) {
                    if ($("#viewer2").length === 0) {
                        $(obj).data("startx", event.pageX);
                        $(obj).data("mx", parseInt($R('#theImg').css('margin-left')));
                        $(obj).data("my", parseInt($R('#theImg').css('margin-top')));
                        elem.scOffset = elem._curPosX;
                        event.preventDefault();
                    }
                    //                    $(elem).css({ position: 'absolute' });
                },
                move: function (event, elem, theImg) {
                    if ($("#viewer2").length === 0) {
                        margin = (elem._curPosX - elem._startMoveX);
                        $(theImg).css('margin-left', margin);
                        event.preventDefault();
                    }
                },
                end: function (event, elem, theImg) {
                    if ($("#viewer2").length === 0) {
                        var idd = $(theImg).data('idd');
                        var reset = true;
                        if ((elem._curPosX - elem._startMoveX) > 40) {
                            if ($RI(idd,'#IV_btnPrev').css('display')!=='none') {
                                $RI(idd, '#IV_btnPrev').click();
                                reset = false;
                            }
                        }
                        if ((elem._curPosX - elem._startMoveX) < 40) {
                            if ($RI(idd, '#IV_btnNext').css('display')!=='none') {
                                $RI(idd, '#IV_btnNext').click();
                                reset = false;
                            }
                        }
                        if (reset === true)
                        {
                                $(theImg).css('margin-left', 0);
                        }
                        event.preventDefault();
                    }
                }

            });
        }
        if ($RI(whatImg, '#ImgView').scrollTop() > 0)
            $RI(whatImg, "#IV_ShowInfo").addClass('rotate180');


    }; // end ready


    function CreateThumb(item, thumbs, thumbsWidth) {
        if (item && item.type === "img" && $('#IV_Tmb' + item.id).length === 0) {
            if (item.itype === 1) {
                var ImgFields = $('#' + $('.ImgDlg .ImgViewDlg').first().data('idd') + '_ImgViewDlg').data('imgfields');
                item.imgtmb = "/SLOAIMGTMB_" + item.id + ImgFields.ext + "?w=300&f=l";
            }
            var thethumb = $('<div class="IV_Tmb tmbBorder" id="IV_Tmb' + item.id + '" data-id="' + item.id + '"><div id="IV_TmbIn_' + item.id + '"><img class="TmbImg" width="100%" height="100%" data-id="' + item.id + '" id="th_i_' + item.id + '" src="" alt=""/></div></div>');
            //                    if (elemlast)
            //                        thethumb.insertAfter(elemlast);
            //                    else
            thethumb.insertAfter(thumbs);


            elemlast = thethumb;

            if (item.ltrotate) {
                $("#IV_Tmb" + item.id).addClass("theImgrotate" + item.ltrotate);
            }
            $('#th_i_' + item.id).attr('src', '/SLOAIMGTMB_' + item.id + '_' + item.dir + '_' + item.version + '.jpg?w=200&f=l');

            thethumb.data('item', item);
            thethumb.data('idx', item.index);
            thethumb.data('index', item.index);

            var height = $('#IV_Tmb' + item.id).height();
            var width = thumbsWidth;

            var fact = 1;
            var maxS = width;

            /*                if (item.scale > 0)
                            width = height / item.scale;
                        else
            */
            var Element = $('#IV_Tmb' + item.id);
            var dontMove = false;
            height = width * item.scale;
            if (height < Element.height()) {
                height = Element.height();
                width = height / item.scale;
            }
            if (height > Element.height()) {
                height = Element.height() + Element.height() / 4;
                width = height / item.scale;
                $('#IV_TmbIn_' + item.id).css({ 'position': 'relative', 'left': ($('.IV_Tmb').width() - width) / 2, 'top': - Element.height() / 8 });
                dontMove = true;
            }
            Element = $('#IV_TmbIn_' + item.id);




            Element.width(width);
            Element.height(height);

            var HotY = item.hoty;
            if (!dontMove) {
                var offs = Element.height() * HotY / 100;
                var Steps = Element.height() / 3;
                if (HotY > 0) {
                    if (offs < Steps) {
                        Element.css('top', 0 + 'px');
                    }
                    else
                        if (offs < Steps * 2) {
                            Element.css('top', ((maxS / fact) - maxS) / 2 * -1 + 'px');
                        }
                        else
                            if (offs < Steps * 3) {
                                Element.css('top', ((maxS / fact) - maxS) * -1 + 'px');
                            }
                }
                else
                    Element.css('top', ((maxS / fact) - maxS) * -1 + 'px');

                var HotX = item.hotx;
                if (HotX > 0) {
                    offs = Element.width() * HotX / 100;
                    Steps = Element.width() / 3;

                    if (offs < Steps) {
                        Element.css('left', 0 + 'px');
                    }
                    else
                        if (offs < Steps * 2) {
                            Element.css('left', ((maxS / fact) - maxS) / 2 + 'px');
                        }
                        else
                            if (offs < Steps * 3) {
                                Element.css('left', ((maxS / fact) - maxS) + 'px');
                            }
                }
                else
                    Element.css('left', parseInt((maxS - maxS * fact) / 2) + 'px');
            }
            return thethumb;
        }
    }

    function GetMoreThumbs(direction, onReady) {
        var currentImg = $('.IV_Tmb').last().data('item');
        if (typeof currentImg === 'undefined') {
            if (typeof onReady !== 'undefined')
                onReady(0);
            return;
        }
        var index = currentImg.index + 1;
        var insertThumb = $('#IV_Tmb' + currentImg.id);
        var amount = 25;
        var thumbWidth = $('.IV_Tmb').outerWidth();
        if (direction === 'left') {
            currentImg = $('.IV_Tmb').first().data('item');
            if (currentImg.index !== 0) {
                index = currentImg.index - amount;
                if (index < 0) {
                    amount -= index;
                    index = 0;
                }

                $('<div id="tmbStart"></div>').prependTo($('#IV_TmbSlide'));
                insertThumb = $('#tmbStart');
            } else {
                if (typeof onReady !== 'undefined')
                    onReady(0);
                return;
            }
        }

        GetThumbData(index, amount, function (Data, hasNewData) {
            if (hasNewData) {
                var posBefore = $('#IV_TmbSlide').position();
                $(Data).each(function (idx, item) {
                    insertThumb = CreateThumb(item, insertThumb, thumbWidth);
                });

                $('#IV_TmbSlide').width(($('.IV_Tmb').last().index() + 1) * thumbWidth);
                if (direction === 'left') {
                    currentImg = $('.IV_Tmb').first().data('item');
                    $('#IV_TmbSlide').position({ left: -(thumbWidth * Data.length) });

                }
            }
            $('#tmbStart').remove();
            if (typeof onReady !== 'undefined')
                onReady(Data.length);
        });
    }
    function GetLoadedThumbs() {
        var Alltms = [];
        $('.IV_Tmb').each(function () {
            Alltms.push($(this).data('item'));
        });
        return Alltms;
    }

    function BuildThumbSlider(ItemsArround, displIndex, ImgID, noSmoothAnim) {
        var imgFidx = -1;
        var insertThumb = null;
        /*        for (var cbI = 0; cbI < ItemsArround.length && imgFidx === -1 && cbI < 20; cbI++) {
                    if (parseInt(ItemsArround[cbI].id) === parseInt(ImgID))
                        imgFidx = cbI+1;
                }
        */
        if (imgFidx > 0) {
            $('<div id="tmbStart"></div>').prependTo($('#IV_TmbSlide'));
            insertThumb = $('#tmbStart');
            $(ItemsArround).each(function (idx, item) {
                insertThumb = CreateThumb(item, insertThumb);
            });
            $('#tmbStart').remove();
            GetMoreThumbs('left', function () {
                return BuildThumbSliderInner(GetLoadedThumbs(), displIndex, ImgID, noSmoothAnim);
            });
        }
        else
            return BuildThumbSliderInner(ItemsArround, displIndex, ImgID, noSmoothAnim);
    }

    function BuildThumbSliderInner(ItemsArround, displIndex, ImgID, noSmoothAnim) {
        var thumbs = $('#IV_TmbSlide');

        var bIsFirstImg = true;
        var cbCnt = 0;
        var currentImg = null;
        var thumbWidth = 0;
        var IndexBefore = 0;
        var tmbOffs = null;
        var ImgFields = $('#' + ImgID + '_ImgViewDlg').data('imgfields');
        if (typeof ImgFields === 'undefined') {
            ImgFields = {
                ext: '.jpg'
            };
        }

        if (displIndex === -1) {
            displIndex = ImgFields.ImgIndex;
        }


        $('#TV_thms').data('ItemsArround', ItemsArround);




        var elemlast = null;

        if (ItemsArround != null) {
            ItemsArround.forEach(function (item, idx) {
                //            var item = ItemsArround[cbI];
                if ($('#IV_Tmb' + item.id).length === 0) {
                    if (item && item.type === "img") {
                        if (item.itype === 1) {
                            item.imgtmb = "/SLOAIMGTMB_" + item.id + ImgFields.ext + "?w=300&f=l";
                        }
                        var thethumb = $('<div class="IV_Tmb tmbBorder" id="IV_Tmb' + item.id + '" data-id="' + item.id + '"><div id="IV_TmbIn_' + item.id + '"><img class="TmbImg" width="100%" height="100%" data-id="' + item.id + '" id="th_i_' + item.id + '" src="" alt=""/></div></div>');
                        thethumb.appendTo(thumbs);

                        elemlast = thethumb;

                        if (item.ltrotate) {
                            $("#IV_Tmb" + item.id).addClass("theImgrotate" + item.ltrotate);
                        }
                        if (idx > displIndex - 3 && idx < displIndex + 3) {
                            $('#th_i_' + item.id).attr('src', '/SLOAIMGTMB_' + item.id + '_' + item.dir + '_' + item.version + '.jpg?w=200&f=l');
                        }

                        if (parseInt(item.id) === parseInt(ImgID)) {
                            currentImg = thethumb;
                            thethumb.addClass("redBorder");
                        }

                        //                    thethumb.fadeOut(0);
                        thethumb.data('item', item);
                        if (bIsFirstImg === true) {
                            thumbWidth = $R('#IV_Tmb' + item.id).outerWidth();
                            $("#IV_TmbSlide").width(thumbWidth * ItemsArround.length);
                            bIsFirstImg = false;
                        }

                        var height = $('#IV_Tmb' + item.id).height();
                        var width = $('#IV_Tmb' + item.id).width();

                        var fact = 1;
                        var maxS = width;

                        /*                if (item.scale > 0)
                                        width = height / item.scale;
                                    else
                        */
                        var Element = $('#IV_Tmb' + item.id);
                        var dontMove = false;
                        height = width * item.scale;
                        if (height < Element.height()) {
                            height = Element.height();
                            width = height / item.scale;
                        }
                        if (height > Element.height()) {
                            height = Element.height() + Element.height() / 4;
                            width = height / item.scale;
                            $('#IV_TmbIn_' + item.id).css({ 'position': 'relative', 'left': ($('.IV_Tmb').width() - width) / 2, 'top': - Element.height() / 8 });
                            dontMove = true;
                        }
                        Element = $('#IV_TmbIn_' + item.id);




                        Element.width(width);
                        Element.height(height);

                        var HotY = item.hoty;
                        var offs = Element.height() * HotY / 100;
                        var Steps = Element.height() / 3;
                        if (!dontMove) {
                            if (HotY > 0) {

                                if (offs < Steps) {
                                    Element.css('top', 0 + 'px');
                                }
                                else
                                    if (offs < Steps * 2) {
                                        Element.css('top', ((maxS / fact) - maxS) / 2 * -1 + 'px');
                                    }
                                    else
                                        if (offs < Steps * 3) {
                                            Element.css('top', ((maxS / fact) - maxS) * -1 + 'px');
                                        }
                            }
                            else
                                Element.css('top', ((maxS / fact) - maxS) * -1 + 'px');

                            var HotX = item.hotx;
                            if (HotX > 0) {
                                offs = Element.width() * HotX / 100;
                                Steps = Element.width() / 3;
                                if (offs < Steps) {
                                    Element.css('left', 0 + 'px');
                                }
                                else
                                    if (offs < Steps * 2) {
                                        Element.css('left', ((maxS / fact) - maxS) / 2 + 'px');
                                    }
                                    else
                                        if (offs < Steps * 3) {
                                            Element.css('left', ((maxS / fact) - maxS) + 'px');
                                        }
                            }
                            else
                                Element.css('left', parseInt((maxS - maxS * fact) / 2) + 'px');
                        }

                        if (parseInt(item.itype) == 1)
                            $('#IV_Tmb' + item.id).append('<div class="tmbVideoIcon" data-id="' + item.id + '"><svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"> <circle style="fill:#DC0811;" cx="256" cy="256" r="256" data-id="' + item.id + '" /> <polygon style="fill:#FFFFFF;" points="193.93,148.48 380.16,256 193.93,363.52 " data-id="' + item.id + '" /></svg></div>');
                    }
                } else {
                    $('#IV_Tmb' + item.id).data('remove', false);
                    thethumb = $('#IV_Tmb' + item.id);
                    if (parseInt(item.id) === parseInt(ImgID)) {
                        currentImg = thethumb;
                        thethumb.addClass("redBorder");
                    } else {
                        thethumb.removeClass("redBorder");
                    }
                }
            });
        }
        $('.IV_Tmb').each(function () {
            if ($('this').data('remove') === true)
                $('this').remove();
        });
        thumbWidth = $('#IV_Tmb' + ImgID).outerWidth();
        var middlePos = $('#TV_thms').width() / 2;
        if (currentImg) {
            displIndex = currentImg.index();
            $('#TV_thms').data('undefCurrent', false);
            $('#IV_SliderTxt').text(1 + currentImg.data('item').index + '/' + $('#TheImgViewer').data('items'));
        } else {
            $('#TV_thms').data('undefCurrent', true);
            $('#TV_thms').hide();
            $('#IV_SliderTxt').text('1' + '/' + '1');
        }
        var posCurrent = displIndex * thumbWidth;
        if (displIndex === -1) {
            $('#IV_TmbSlide').css('left', $('#IV_TmbSlide').css('left') - (IndexBefore - (currentImg.index()) * currentImg.outerWidth()));
        } else {

            if (noSmoothAnim)
                $('#IV_TmbSlide').css({ "left": (posCurrent * -1) + middlePos });
            $('#IV_TmbSlide').animate({ "left": (posCurrent * -1) + middlePos }, 400, function () {
            });
        };
        if (!$('#TV_thms').data('undefCurrent'))
            $('#TV_thms').fadeIn(2000);
        $('#IV_TmbSlide').width(thumbWidth * ($('.IV_Tmb').last().index() + 1));
        if (ItemsArround != null && ItemsArround.length - displIndex < 15)
            GetMoreThumbs('right');
        return currentImg;
    }


    PreDetailView = function (ImgID, ItemsArround, ParentView, addHistory, refreshOnExit, items, OnClose, OnIntialized) {

        discardPendingImages(1);
        logToConsole("Opening DV");
        var ScrollPos = $(window).scrollTop();
        switch (ParentView) {
            case "DateViewItem":
            case '#DateTimeContainer':
                $R('#DateTimeContainer').css('display', 'none');
                break;
            case 'AlbumsView':
            case 'FolderViewItem':
                $R('#AlbumsView').css('display', 'none');
                break;
        }

        var index = -1;
        var cbI = 0;
        var displIndex = 0;
        if (ItemsArround.length > 0)
            ItemsArround[0].index;
        var displIgnore = 0;

        $(ItemsArround).each(function (idx, item) {
            if (item) {
                if (parseInt(item.id) === parseInt(ImgID)) {
                    displIndex = item.index - displIgnore;
                    index = cbI;
                }
                switch (item.type) {
                    case "img":
                        cbI++;
                        break;
                    case "dir":
                        displIgnore++;
                        break;
                }
            }
        });
        if (items)
            cbI = items;
        else {
            if (ItemsArround != undefined)
                cbI = ItemsArround.length - displIgnore;
        }
        if (CurrentView) {
            CurrentView.CurrentImageID = ImgID;
            OnChangePage('DetailView');
        }
        var hrefBev = getLocElementsExcept("i", window.location.pathname);
        if (addHistory)
            window.history.pushState("Image", "Image", SetUrlParam(hrefBev, 'i', ImgID));

        $('video').each(function () { this.pause(); });

        logToConsole("CommunitySrerviceCall");
        return { displIndex: displIndex, cbI: cbI, hrefBef: hrefBev };
    };

    var tiScroller = null;
    SetPrevNextID = function (ImgID) {
        var dlg = $('#ImageDlg');
        var ItemsArround = dlg.data("ItemsArround");
        $(ItemsArround).each(function (idx, item) {
            if (parseInt(item.id) === parseInt(ImgID)) {
                if (idx > 0) {
                    $('#' + ImgID + '_IV_ImgHolder').data('prevID', ItemsArround[idx - 1].id);
                    $('#' + ImgID + '_IV_ImgHolder').data('prevImg', ItemsArround[idx - 1]);

                }
                if (idx < ItemsArround.length - 1) {
                    $('#' + ImgID + '_IV_ImgHolder').data('nextID', ItemsArround[idx + 1].id);
                    $('#' + ImgID + '_IV_ImgHolder').data('nextImg', ItemsArround[idx + 1]);
                }
            }
        });
        var idd = $('.ImgDlg .ImgViewDlg').first().data('idd');

        $('#' + idd + '_ImgView').off('ps-scroll-y');
        $('#' + idd + '_ImgView').on('ps-scroll-y', function () {
            var pt = $(window).height() - $('#' + idd + '_IV_DescrInner').offset().top;
            $('#TV_thms').css('bottom', pt);
            if (tiScroller !== null)
                clearTimeout(tiScroller);
            tiScroller = setTimeout(function () {
                var c = $('#TV_thms').collidesWith('.IV_btnPrev');
                if (c.length > 0) {
                    $('#TV_thms').css('left', '30px');
                    if (!$('#TV_thms').hasClass('IV_ThmbsSmall'))
                        $('#TV_thms').css('right', '40px');
                }
                else {
                    $('#TV_thms').css('left', 0);
                    if (!$('#TV_thms').hasClass('IV_ThmbsSmall'))
                        $('#TV_thms').css('right', '10px');
                }
            }, 300);
        });

    };
    initThumbs = function () {
        var margin = 0;
        $('#IV_TmbSlide').off();
        if (typeof RemoveRefreshImageHandler !== "undefined") {
            RemoveRefreshImageHandler("CheckImageThumbs");
            RemoveRefreshImageHandler("CheckImageDisplay");
            AddRefreshImgHandler("CheckImageThumbs", ThumbImageChanged);
            AddRefreshImgHandler("CheckImageDisplay", DisplayedImageChanged);
        }

        $('#IV_TmbSlide').PadMouseDrag({
            start: function (event, elem, obj) {
                elem.scOffset = elem._curPosX;
                marginBev = parseInt($('#IV_TmbSlide').css('left'));
                $('#IV_TmbSlide').data('inslide', true);
                event.preventDefault();
                $('<div id="ShowImage"></div>').appendTo($('#TV_thms'));
                //                    $(elem).css({ position: 'absolute' });
            },
            move: function (event, elem, obj) {
                //                    $(elem).scrollTop((elem._startMoveY - elem._curPosY));
                //                        $R('#infScroll').scrollTop($R('#infScroll').scrollTop() + elem._curPosY - elem._startMoveY);
                var marginBef = $('#IV_TmbSlide').css('left');
                var MargS = margin = (elem._curPosX - elem._startMoveX);
                margin = marginBev + MargS;
                var itemFirst = $('.IV_Tmb').first();
                var itemLast = $('.IV_Tmb').last();
                var pos = itemFirst.offset();
                logToConsole("first x-offset:" + pos.left + 'top ' + pos.top);
                var move = true;
                if ($(itemFirst).data('item').index === 0) {
                    if (pos.left < ($(window).width() / 2))
                        if (MargS > -1)
                            move = false;
                }
                pos = itemLast.offset();
                logToConsole("last x-offset:" + pos.left + 'top ' + pos.top);
                logToConsole("margS:" + MargS);

                if (itemLast.data('item').index === $('#TheImgViewer').data('items') - 1) {
                    if (pos.left < ($(window).width() / 2))
                        if (MargS < 0)
                            move = false;

                }



                if (move) {
                    $('#IV_TmbSlide').css('left', margin);
                }



                //                $('#TV_thms').scrollLeft(elem._curPosY + elem.scOffset);

                //                        indicateScroll();

                pos = $('.IV_Tmb').last().position();
                if (pos.left > 0 && pos.left < $(window).width())
                    GetMoreThumbs();

                pos = itemFirst.offset();
                if (pos.left > 0 && pos.left < $('.IV_Tmb').first().width() + 1) {
                    GetMoreThumbs('left');
                }

                event.preventDefault();
            },
            click: function (event, elem, obj) {
                if (!elem._curPosX || Math.abs(elem._startMoveX - elem._endMoveX) < 10) {
                    var elemCli = null;
                    if (event.clientX != undefined)
                        elemCli = document.elementFromPoint(event.clientX, event.clientY);
                    else if (elem._endMoveX != undefined)
                        elemCli = document.elementFromPoint(elem._endMoveX, elem._endMoveY);

                    if (elemCli != null && $(event.target)) {
                        var id = $(elemCli).data('id');
                        if (id == undefined)
                            id = $(elemCli).parent().data('id')

                        if ($('#' + id + '_theImgH').find('video').length > 0)
                            $('#' + id + '_theImgH').find('video')[0].pause();

                        if (!$('#FrameSpace').length) {
                            UpdateImg();
                            ShowImageAndBuildArray(id);
                        }
                        else {
                            var itemdata = $(elemCli).parent().data('item');
                            //var itemdata = $('#IV_Tmb' + $(elemCli).data('id')).data('item');
                            ShowDetailView(itemdata.id, GetLoadedThumbs(), ParentView, true, false, itemdata.ItemsInView);
                            //                            fillThumbsAndShowDetailView(itemdata, theThumb.data('index'), $('#TV_thms').data('ItemsArround'), ParentView);
                        }

                    }
                }
                event.preventDefault();
            },
            end: function (event, elem, obj) {
                $('#IV_TmbSlide').data('inslide', false);
                if (Math.abs(elem._startMoveX - elem._endMoveX) > 10) {
                    var pos = $('.IV_Tmb').last().position();
                    if (pos.left > 0 && pos.left < $(window).width())
                        GetMoreThumbs();

                    pos = $('.IV_Tmb').first().position();
                    if (pos.left > 0 && pos.left < $(window).width())
                        GetMoreThumbs();
                }
                event.preventDefault();
            }
        });

        $('#IV_TmbSlide').on('DOMMouseScroll mousewheel', function (e) {
            //            alert(e.originalEvent.wheelDelta);
            if (CheckMaxTmbSlidePos(parseInt($('#IV_TmbSlide').css('left')) + e.originalEvent.wheelDelta)) {
                $('#IV_TmbSlide').css('left', parseInt($('#IV_TmbSlide').css('left')) + e.originalEvent.wheelDelta);
            }
        });
        $('#ID_ThumbsContainer_sliderBtn').click(function (e) {
            if (!$('#IV_UpDown').hasClass('IV_UpDown_Open')) {
                $('#IV_UpDown').addClass('IV_UpDown_Open');
                $('#TV_thumbsBack').slideUp(1000, function () {
                    $('#TV_thms').addClass('IV_ThmbsSmall');
                });
                setCookie('ivslider', 'down', 180);
            } else {
                $('#IV_UpDown').removeClass('IV_UpDown_Open');
                $('#TV_thms').removeClass('IV_ThmbsSmall');
                $('#TV_thumbsBack').slideDown(1000, function () {
                });
                setCookie('ivslider', 'up', 180);
            }
            return true;
        });

        /*        $('.IV_Tmb').off();
                        $('.IV_Tmb').click(function () {
                            ShowImage($(this).data('id'), ItemsArround, ParentView);
                        })
                */
    };

    var hrefOnCloseDetailView = '';
    var CloseFuncs = [];

    GotImageView = function (ImgID, OnIntialized, ItemsArround, ParentView, refreshOnExit, displIndex, hrefBev, OnClose) {
        if (OnClose)
            CloseFuncs.push(OnClose);

        SetPrevNextID(ImgID);
        //        AddThumbsElements(ItemsArround);
        //var thumbs = $('#IV_TmbSlide');
        ItemsArroundCurrentImage = ItemsArround;
        ParentViewCurrentImage = ParentView;
        /*
        var currentImg = null;
        var thumbWidth = 0;
        var bIsFirstImg = true;
        var cbCnt = 0;
        var oldWindowWidth = $(window).width();
        */

        if (hrefBev != null && hrefBev != '')
            hrefOnCloseDetailView = hrefBev;

        $('.ImgViewClose').off();
        $('.ImgViewClose').click(function () {
            $('#PageContent').show();

            $('#TheImgViewer video').each(function () {
                this.pause();
                //this.src = '';
            });
            if ($RV(ImgID, '#SearchPlaceUnder').data('mustShow') === 1) {
                $RV(ImgID, '#SearchPlaceUnder').show();
                $RV(ImgID, '#SearchPlaceUnder').data('mustShow', 0);
            }
            $('.CommunityMenuContent').removeClass('HideTopMenu');
            $('#ImageDlg').removeClass('MoveTopZero');

            if (DVDowloadMenuShow === true) {
                $R('#MenuDownload').removeClass('HiddenMenu');
            }
            $R('#MenuDownloadSingle').addClass('HiddenMenu');
            $R('#MenuPrintSingle').addClass('HiddenMenu');

            $('#ImageDlg').remove();
            $('#TheImgViewer').remove();
            $('#TV_thms').remove();
            switch (ParentView) {
                case '#DateTimeContainer':
                case 'DateViewItem':
                    $('#DateTimeContainer').css('display', 'block');
                    OnChangePage('TimeLine');
                    ImagesScrolled(true);

                    if (!UseOwnScrollbar()) {
                        window.setTimeout(function () {
                            if ($('#id_' + ImgID).length)
                                $(window).scrollTop($('#id_' + ImgID).offset().top);
                        }, 2000);
                    }
                    break;
                case 'FolderViewItem':
                case 'AlbumsView':
                    $('#AlbumsView').css('display', 'block');
                    if (CurrentView) {

                        var DirID = CurrentView.DirId;
                        if (refreshOnExit) {
                            CurrentView.DirId = 0;
                            $R('#AlbumsView').remove();
                        }
                        ResizeGridsImgs();
                        if ($R('#FordersAndImages').length > 0)
                            $R('#FordersAndImages').hmLayout('layoutRecalc');
                        OnChangePage('Folder');
                        OpenFolderAndScrollToItem(ImgID, DirID, true);
                    }
                    break;
            }

            window.history.pushState("Images", "View", hrefOnCloseDetailView);
            if (CurrentView) {
                CurrentView.CurrentImageID = 0;
                //            if (oldWindowWidth !== $(window).width())
                {
                    $('.dategrid').each(function (index, grid) {
                        ResizeGridsImgs();
                        $(grid).hmLayout('layout');
                        LoadImages($(grid));
                    })
                }
            }
            /*            if ($R('#id_' + ImgID).length > 0){
                            $(window).scrollTop(0);
                            var posT = $R('#id_' + ImgID).offset().top;
                            $(window).scrollTop(posT);
                        }
            */
            while (CloseFuncs.length) {
                var f = CloseFuncs.pop();
                f();
            }

        });
        if (MaVas.DirId)
            CheckFolderProtection(MaVas.DirId, ImgID);
        if (OnIntialized)
            OnIntialized();



    };

    ShowDetailView = function (ImgID, ItemsArround, ParentView, addHistory, refreshOnExit, items, OnClose, OnIntialized, type) {


        if (typeof ScrollInfoOff !== "undefined")
            ScrollInfoOff();
        if (ParentView === 'DateViewItem') {
            SLApp.UserAndInfoService.GetImageIndexInCurrentView(ImgID, parseInt($("#DateTimeContainer").data('root')), true, CurrentView.SortField, function (index) {
                GetThumbData(Math.max(0, index - 25), 50, function (Data, hasNewData, Count) {
                    ShowDetailViewIntern(ImgID, Data, ParentView, addHistory, refreshOnExit, Count, OnClose, OnIntialized, type);
                });
            });


        } else {
            ShowDetailViewIntern(ImgID, ItemsArround, ParentView, addHistory, refreshOnExit, items, OnClose, OnIntialized, type);
        }
    };



    ThumbImageChanged = function (imgObj) {
        ID = imgObj.ID;
        var fSizeX = imgObj.SizeX;
        var fSizeY = imgObj.SizeY;
        Version = imgObj.version;
        if ($('#IV_TmbIn_' + ID).length > 0) {
            var height = $('#IV_Tmb' + ID).height();
            var width = 180; // thumbsWidth;

            var fact = 1;
            var maxS = width;
            var scale = imgObj.SizeY / imgObj.SizeX;

            /*                if (item.scale > 0)
                            width = height / item.scale;
                        else
            */
            var Element = $('#IV_Tmb' + ID);
            var dontMove = false;
            height = width * scale;
            if (height < Element.height()) {
                height = Element.height();
                width = height / scale;
            }
            if (height > Element.height()) {
                height = Element.height() + Element.height() / 4;
                if (height) {
                    width = height / scale;
                    if ($('#IV_TmbIn_' + ID).length && $('.IV_Tmb').width() && Element.length)
                        $('#IV_TmbIn_' + ID).css({ 'position': 'relative', 'left': ($('.IV_Tmb').width() - width) / 2, 'top': - Element.height() / 8 });
                }
                dontMove = true;
            }
            Element = $('#IV_TmbIn_' + ID);




            Element.width(width);
            Element.height(height);

            var HotY = imgObj.hoty;
            var offs = Element.height() * HotY / 100;
            var Steps = Element.height() / 3;
            if (!dontMove) {
                if (HotY > 0) {

                    if (offs < Steps) {
                        Element.css('top', 0 + 'px');
                    }
                    else
                        if (offs < Steps * 2) {
                            Element.css('top', ((maxS / fact) - maxS) / 2 * -1 + 'px');
                        }
                        else
                            if (offs < Steps * 3) {
                                Element.css('top', ((maxS / fact) - maxS) * -1 + 'px');
                            }
                }
                else
                    Element.css('top', ((maxS / fact) - maxS) * -1 + 'px');

                var HotX = imgObj.hotx;
                if (HotX > 0) {
                    offs = Element.width() * HotX / 100;
                    Steps = Element.width() / 3;

                    if (offs < Steps) {
                        Element.css('left', 0 + 'px');
                    }
                    else
                        if (offs < Steps * 2) {
                            Element.css('left', ((maxS / fact) - maxS) / 2 + 'px');
                        }
                        else
                            if (offs < Steps * 3) {
                                Element.css('left', ((maxS / fact) - maxS) + 'px');
                            }
                }
                else
                    Element.css('left', parseInt((maxS - maxS * fact) / 2) + 'px');
            }
            DeleteRotation($('#th_i_' + ID));
            $('#th_i_' + ID).attr('src', '/SLOAIMGTMB_' + ID + '_' + imgObj.DirID + '_' + Version + '.jpg?w=200&f=l');
            $('#th_i_' + ID).removeClass('theImgrotate180');
        }

    };

    ShowDetailViewIntern = function (ImgID, ItemsArround, ParentView, addHistory, refreshOnExit, items, OnClose, OnIntialized, type) {
        idd = ImgID;
        $R('#frameNavigation').hide();
        var disp = PreDetailView(ImgID, ItemsArround, ParentView, addHistory, refreshOnExit, items, OnClose, OnIntialized);
        if (!CurrentView)
            CurrentView = jQuery.extend({}, MaVas);
        SLApp.UserAndInfoService.GetHTMLSnipp("ThumbsContainer", "", function (snipp) {
            $('.newImage').remove();
            if (!$('#ImageDlg').length) {
                $('#TheImgViewer').remove();
                var mainFrame = 'body';
                if ($('#FrameSpace').length)
                    mainFrame = '#FrameSpace';
                $('<div id="TheImgViewer"><div id="ImageDlg_prev" class="imgDlgPrev newImage"></div> <div id="ImageDlg" class="ImgDlg newImage"></div><div id="ImageDlg_next" class="imgDlgNext newImage"></div><div>').appendTo($(mainFrame));
                if ($('#TV_thms').length === 0) {
                    $(mainFrame).append($(snipp));
                    initThumbs();
                }

                $('#PageContent').hide();
            }
            if (items === null || items === 0 || typeof items === "undefined")
                items = ItemsArround.length;
            $('#TheImgViewer').data('items', items);
            theView = jQuery.extend({}, CurrentView);
            if (type === 'edit') {
                theView.DetailViewOffset += 180;
            }
            GetImageView(JSON.stringify(theView), ImgID, disp.displIndex, disp.cbI, CurrentView.Lang, $('#FrameSpace').length ? false : true, function (code) {
                logToConsole("CommunitySrerviceCall finished");
                idd = ImgID;
                //            $("#overlay").show();
                //            $("#overlay").css('top', $('#ImageDlg').offset().top);
                idd = ImgID;
                $("#ImageDlg").off();
                domRemove("#ImgViewDlg");
                $R('#ImgViewDlg').remove();

                var dlg = $('#ImageDlg');
                dlg.data("parentView", ParentView);
                dlg.data('id', ImgID);
                if (getQueryParam('menu') === 'off') {
                    $('#ImageDlg').css('top', '0px');
                }



                var script = parseScript(code);
                $(code).appendTo(dlg);



                var style = document.styleSheets[0];
                dlg.find('*').each(function () {
                    if (this.id !== '')
                        $SR(this.id, style);
                });
                $('#ImageDlg').data('ParentView', ParentView);
                $('#ImageDlg').data('ItemsArround', ItemsArround);
                SetPrevNextID(ImgID);
                preCalcContainerHeigt(ImgID);
                GotImageView(ImgID, OnIntialized, ItemsArround, ParentView, disp.displIndex, refreshOnExit, disp.hrefBef, OnClose);

            });
        });
    };


    function StartNewImageInAWhile(id, ItemsArround, ParentView) {
        var dh = $R('#ImgView');
        if (id != undefined) {
            dh.data('sdvID', id);
            dh.data('sdvItemsArround', $('#ImageDlg').data('ItemsArround'));
            if (ParentView)
                dh.data('sdvParentView', ParentView);
            else
                dh.data('sdvParentView', $('#ImageDlg').data("parentView"));
        } else {
            //            debugger;
        }
        window.clearTimeout(dh.data('sdvTimer'));
        if (dh.data('sdvID') != null) {
            dh.data('sdvTimer', window.setTimeout(function () {

                if ($('#TV_thumbsBack').is(':hover')) {
                    StartNewImageInAWhile();
                    return;
                }

                var dh = $R('#ImgView');
                if (dh.data('sdvID') != undefined && dh.data('sdvItemsArround') != undefined)
                    ShowDetailView(dh.data('sdvID'), dh.data('sdvItemsArround'), dh.data('sdvParentView'), true);
            }, 3000));
        }
    }

    function showOverlay(speed) {
        if ($("#overlay").length > 0)
            $("#overlay").fadeIn(speed);
        else {
            var intVal = window.setInterval(function () {
                if ($("#overlay").length > 0) {
                    $("#overlay").fadeIn(speed);
                    window.clearInterval(intVal);
                }
            }, 100);
        }

    }


    var ImageViewRequests = [];
    var InImageViewRequests = false;

    GetImageView = function (jsonMaVas, ImgID, displIndex, cbI, Lang, editFields, OnSuccess) {
        if (ImgID == undefined || ImgID < 2)
            displayErrorMesssage("wrong Call", "Error");
        InImageViewRequests = true;
        var request = SLApp.CommunityService._staticInstance.GetImageView(jsonMaVas, ImgID, displIndex, cbI, Lang, editFields, function (code) {
            InImageViewRequests = false;
            OnSuccess(code);
        }, function (err) {
            if (err.get_statusCode() !== -1 /*only if not aborted*/)
                displayErrorMesssage(err.get_message(), _localized.Error);
        });
        ImageViewRequests.push(request);
    };
    function AbortAllPendingGetImageViewRequests() {
        for (var i = 0; i < ImageViewRequests.length; i++) {
            var request = ImageViewRequests[i];
            var executor = request.get_executor();
            try {
                if (executor.get_started())
                    if (!executor.get_aborted())
                        executor.abort();
            } catch (e) {
                ;
            }
        }
        ImageViewRequests.slice(0, ImageViewRequests.length);
    }

    replaceDTVSVGs = function (whatImg) {

        logToConsole("replaceDTVSVGs:" + whatImg);
        if ($('#' + whatImg + '_ZoomBtn').length > 0)
            replaceSVG($('#' + whatImg + '_ZoomBtn'), null, false);
        replaceSVG($('#' + whatImg + '_zz'), null, false);
        replaceSVG($('#' + whatImg + '_zc'), null, false);
        replaceSVG($('#' + whatImg + '_zr'), null, false);
        replaceSVG($('#' + whatImg + '_zl'), null, false);
        replaceSVG($RI(whatImg, '#UndoImg'), function () { }, false);
        replaceSVG($RI(whatImg, '#RedoImg'), function () { }, false);

    }
})(jQuery);

function LoadLastDayContent(OnDone) {
    var gridName = $("#LastDate").data('gridname');
    var $gridlst = $('#' + gridName).hmLayout({
        // options
        itemSelector: '.item'
    });
    $("#LastDate").data('gridobj', $gridlst);

    var strDate = $("#LastDate").data('dateNewest');
    if (strDate == undefined || strDate == '') {
        QueryMoreImagesFiltered(window.location.search, MaVas.RootDirId, 0, 1, MaVas.RootDirId, MaVas.RootDirId, MaVas.DisplayDirs, "so=" + SortField + " DESC ", GetViewTypes(), '*', '', '', '', 220, 160, 400, 300, false, function (xml) {
            var newest = new Date();

            var imgList = xml.getElementsByTagName('Image');
            if (imgList != null && imgList.length > 0) {
                var d = imgList[0].getAttribute('RAWDateInserted').split('/');
                newest = new Date(d[2], d[0] - 1, d[1]);
            }

            newest.setDate(newest.getDate() - parseInt(1));
            $("#LastDate").data('dateNewest', (newest.getMonth() + 1) + "/" + parseInt(newest.getDate()) + "/" + newest.getFullYear());
            LoadLastDayContent(OnDone);

        });
        return;
    }

    var filter = "WHERE " + SortField + " > Convert(Date,'" + strDate + "',101)";
    GetNewestImages(filter, "#LastDate", 0, 50, 'd', null, function () {
        OnDone();
    });
}

function SndSlidemove(event, player, id, pos) {
    if (player.sliderDown) {
        var x = event.clientX || event.touches[0].clientX;
        CalcSliterPos(player, id, x);
    }
}
function CalcSliterPos(player, id, x) {

    x = x - $('#volume_' + id).position().left;
    var startX = $('#volume_' + id).width() * 0.05;
    var layerX = x - startX;
    var per = Math.min(1, Math.max(0, layerX / parseFloat($('#barEmpty_' + id)[0].scrollWidth)));
    console.log('volume:' + per);
    player.volume(per);

}
var util = {
    scaleValue: function (value, toZoom) {
        return value * toZoom / 100;
    },

    descaleValue: function (value, fromZoom) {
        return value * 100 / fromZoom;
    }
};
