/********************* Hover div for thumbs *********************/
var currentHoverThumb = '';


$(document).ready(function () {
    $(document).mousemove(function (e) {
        if (currentHoverThumb != '') {
            var thumb = $('#' + currentHoverThumb);
            if (thumb.length > 0) {
                var mouseX = e.pageX;
                var mouseY = e.pageY;
                if (   mouseX < thumb.offset().left
                    || mouseX >= thumb.offset().left + thumb.width()
                    || mouseY < thumb.offset().top
                    || mouseY >= thumb.offset().top + thumb.height()) {
                    currentHoverThumb = '';
                    $('#ThumbHover').removeShadow();
                    $('#ThumbHover').remove();
                }
            }
        }
    });
});


function InitHover(selector) {
    $(selector).on('mouseenter', function () {
        if (currentHoverThumb != $(this)[0].id || $('#ThumbHover').length === 0) {
            currentHoverThumb = $(this)[0].id;
            ThumbHover(currentHoverThumb);
        }
    });
    /*
    $(selector).live('mouseleave', function () {
        $('#ThumbHover').removeShadow();
        $('#ThumbHover').remove();
    });
    */
}
function InitHoverFolder(selector) {
    $(selector).on('mouseenter', function () {
        if (currentHoverThumb != $(this)[0].id || $('#ThumbHover').length == 0) {
            currentHoverThumb = $(this)[0].id;
            ThumbHoverFolder(currentHoverThumb);
        }
    });
}


function ThumbHover(tmb, color, bkcolor) {
    var thumb = $('#' + tmb);
    if (thumb.length == 0)
        return;

    var iid = thumb.data('hoverId');
    if (iid == undefined || iid.length == 0)
        return;

    var imgW = parseInt(thumb.data('hoverWidth'));
    var imgH = parseInt(thumb.data('hoverHeight'));
    var title = thumb.data('hoverTitle');
    var description = thumb.data('hoverDescription');

    var divW = Math.max(imgW, 100);
    var imgL = (divW - imgW) / 2;

    var hover = $('#ThumbHover');
    if (hover.length > 0) {
        hover.removeShadow();
        hover.remove();
    }

    if (color == undefined)
        color = '';
    else
        color = ';color:' + color;

    if (bkcolor == undefined)
        bkcolor = '';
    else
        bkcolor = ';background-color:' + bkcolor;

    hover = $('<div id="ThumbHover" style="width:' + divW + 'px' + color + bkcolor + '"></div>').appendTo('body');
    hover.append('<div id="ThumbHoverImgBox" style="height:' + imgH + 'px"><img id="ThumbHoverTmp" src="/SLOAIMGTMB_' + iid + '.jpg" style="left:' + imgL + 'px;width:' + imgW + 'px;height:' + imgH + 'px;" alt="" title=""/><img id="ThumbHoverImg" style="left:' + imgL + 'px;width:' + imgW + 'px;height:' + imgH + 'px;display:none" alt="" title=""/></div>');

    if (title != undefined && title.length > 0) {
        if (title.length > 100)
            title = title.substr(0, 100) + '...';
        hover.append('<div id="ThumbHoverTitle">' + title + '</div>');
    }
    if (description != undefined && description.length > 0) {
        if (description.length > 200)
            description = description.substr(0, 200) + '...';
        hover.append('<div id="ThumbHoverDescription">' + description + '</div>');
    }

    $('#ThumbHoverImg').on('load', function() {
        $('#ThumbHoverImg').fadeIn('fast', function () { $('#ThumbHoverTmp').remove(); });
    });
    $('#ThumbHoverImg').attr('src', '/MCIMG_' + iid + '_' + imgW + '_' + imgH + '.jpg');

    var w = $(window);

    var posX = thumb.offset().left + thumb.width() + 3;
    var posY = thumb.offset().top - (imgH - thumb.height()) / 2;

    if (posX > w.scrollLeft() + w.width() - hover.width() - parseInt(hover.css('padding-left')) - parseInt(hover.css('padding-right')) - 5)
        posX = thumb.offset().left - hover.width() - parseInt(hover.css('padding-left')) - parseInt(hover.css('padding-right')) - 5;
    if (posX < w.scrollLeft())
        posX = w.scrollLeft();

    if (posY > w.scrollTop() + w.height() - hover.height() - parseInt(hover.css('padding-top')) - parseInt(hover.css('padding-bottom')) - 5)
        posY = w.scrollTop() + w.height() - hover.height() - parseInt(hover.css('padding-top')) - parseInt(hover.css('padding-bottom')) - 5;
    if (posY < w.scrollTop())
        posY = w.scrollTop();

    hover.css({ 'left': posX + 'px', 'top': posY + 'px' });
    hover.fadeIn('fast', function () {
        $(this).dropShadow({ left: 2, top: 2, opacity: 0.95, blur: 1 });
    });
}
var ThmbCallBefore=null;


function ThumbHoverFolder(tmb, color, bkcolor) {
    var thumb = $('#' + tmb);
    if (thumb.length == 0)
        return;

    var iid = thumb.data('hoverId');
    if (iid == undefined || iid.length == 0)
        return;

    var imgW = parseInt(500);
    var imgH = parseInt(250);
    var title = thumb.data('hoverTitle');
    var description = thumb.data('hoverDescription');

    var divW = Math.max(imgW, 100);

    var hover = $('#ThumbHover');
    if (hover.length > 0) {
        hover.removeShadow();
        hover.remove();
    }

    if (color == undefined)
        color = '';
    else
        color = ';color:' + color;

    if (bkcolor == undefined)
        bkcolor = '';
    else
        bkcolor = ';background-color:' + bkcolor;
    hover = $('<div id="ThumbHover" style="width:' + divW + 'px' + color + bkcolor + ' "></div>').appendTo('body');
    hover.append('<div><span class="ThumbHoverHeader">Folder: ' + title + '</span></div>');

    var thIId = "ThumbHoverDirImgBox_" + iid;

    hover.append('<div class="ThumbHoverDirImgBoxC" id="'+thIId+'" style="height:' + imgH + 'px"></div>');
    
    thIId = "#ThumbHoverDirImgBox_" + iid;
    $('#ThumbHover').css('padding-right', '6px');

    if (title != undefined && title.length > 0) {
        if (title.length > 100)
            title = title.substr(0, 100) + '...';
        hover.append('<div id="ThumbHoverTitle">' + title + '</div>');
    }
    if (description != undefined && description.length > 0) {
        if (description.length > 200)
            description = description.substr(0, 200) + '...';
        hover.append('<div id="ThumbHoverDescription">' + description + '</div>');
    }
    var ItemHeight = 50;
    var aborted;
    try {
        if (ThmbCallBefore != null){
            var executor = ThmbCallBefore.get_executor();

            if (executor.get_started()){
                executor.abort();
            }
        }
    }
    catch (e) {
        aborted=true;
    };
    ThmbCallBefore = SLApp.CommunityService._staticInstance.FirstImagesInfolderTmbListAndInfo(thumb.data('dirId'), 'a', 30, 50, 300, function (XML) {
        var Element = XML.getElementsByTagName('DirCode')[0];
        var scriptStr = Element.getAttribute('Code');
        if ($(thIId).length == 0)
            return;
        $(thIId).append(scriptStr);
        var nMaxX = 0;
        var nMaxY = 0;
        $(thIId + ' img').each(function (e, i) {
            if ($(this).position().top < 50)
                nMaxX = Math.max(nMaxX, $(this).position().left + $(this).width());
            nMaxY = Math.max(nMaxY, $(this).position().top + $(this).height());
        });
        //$(thIId).width(nMaxX);
        nMaxY = Math.min(nMaxY, 270);
        nMaxY = Math.max(nMaxY, 170);
        nMaxX = Math.max(nMaxX, 300);
        $(thIId).height(nMaxY - ItemHeight + $('#ThumbHoverTitle').height() + parseInt($('#ThumbHoverTitle').css('padding-top')) + parseInt($('#ThumbHoverTitle').css('padding-bottom')) + $(thIId).position().top); // Add Paddings

        $(thIId).css('text-align', 'justify');
        hover.width(nMaxX);
        $("#ThumbHoverTitle").css('float', 'right');
        var strText = "Images: " + Element.getAttribute('AllImages');
        if (parseInt(Element.getAttribute('AllVideos')) > 0)
            strText += " Videos: " + Element.getAttribute('AllVideos');

        if (parseInt(Element.getAttribute('AllAssets')) > 0)
            strText += " Misc.: " + Element.getAttribute('AllAssets');


        $("#ThumbHoverTitle").text(strText);

        var w = $(window);

        var posX = thumb.offset().left + thumb.width() + 3;
        var posY = thumb.offset().top - (imgH - thumb.height()) / 2;

        if (posX > w.scrollLeft() + w.width() - hover.width() - parseInt(hover.css('padding-left')) - parseInt(hover.css('padding-right')) - 5) {
            posX = thumb.offset().left - hover.width() - parseInt(hover.css('padding-left')) - parseInt(hover.css('padding-right')) - 5;
            if (posX < w.scrollLeft())
                posX = w.scrollLeft();
            if (posX < thumb.offset().left && hover.width() + posX > thumb.offset().left + thumb.width()) {
                posX = thumb.offset().left + thumb.width() + 3;
                hover.width(w.width() - posX - 40);
                $(thIId).width(w.width() - posX - 40);

            }
        }
        if (posX < w.scrollLeft())
            posX = w.scrollLeft();

        if (posY > w.scrollTop() + w.height() - hover.height() - parseInt(hover.css('padding-top')) - parseInt(hover.css('padding-bottom')) - 5)
            posY = w.scrollTop() + w.height() - hover.height() - parseInt(hover.css('padding-top')) - parseInt(hover.css('padding-bottom')) - 5;
        if (posY < w.scrollTop())
            posY = w.scrollTop();

        hover.css({ 'left': posX + 'px', 'top': posY + 'px' });
        hover.fadeIn('fast', function () {
            $(this).dropShadow({ left: 2, top: 2, opacity: 0.95, blur: 1 });
        });
    });

}
