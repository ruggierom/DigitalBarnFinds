$(document).ready(function () {

    $('#main-menu').smartmenus({
        mainMenuSubOffsetX: 0,
        mainMenuSubOffsetY: 0,
        subMenusSubOffsetX: -6,
        subMenusSubOffsetY: 0,
        subMenusMaxWidth: '25em'
    });

    $('#main-menu').on('click.smapi', function (e, item) {
        if ($(window).width() < 768) {
            if (e.namespace === 'smapi')
                if (!$(item).data("main")) {
                    $('#main-menu-state').click();
                }
                    
        }
        if(typeof item != 'undefined'){
            if (!$(item).hasClass('checker') && $('.main-menu-btn').css('top') > 0)
                $.SmartMenus.hideAll();
            if ($(item).data('donthide'))
                return false;
        }
    });
    $('#main-menu').on('beforeshow.smapi', function (e, menu) {
        if ($(window).width() < 768)
            ;//            $('#MenuHome a').css('font-size', '26px');
        //                
        else
            $('#MenuHome a').css('font-size', '');;

    });
    $('#main-menu').on('beforehide.smapi', function (e, menu) {
        return true;
    });
    MenuDontHide = function(menu) {
        $('#' + menu).data('donthide', true);
    };

    BurgerMenuHidden = function ($menu) {
        $('#MenuHome a').css('font-size', '');
        $('#MenuMenuItems_Home').css('display', 'block');
        $('.SubMenuHL').css('background-color', '');
    };

    BurgerMenuShown = function ($menu) {
        $('#MenuHome a').css('font-size', '15px');
        $('#MenuHome a').css('max-width', $(window).width()-20);
        $('#MenuMenuItems_Home').css('display', 'none');
        $('.SubMenuHL').css('background-color', '#f0f0f0');
    };

    if ($('#main-menu-state').length) {
        // animate mobile menu
        $('#main-menu-state').change(function (e) {
            var $menu = $('#main-menu');

            if (this.checked) {
                BurgerMenuShown();
                $menu.hide().slideDown(250, function () { $menu.css('display', ''); });
            } else {

                $menu.show().slideUp(250, function () {
                    $menu.css('display', 'none');
                    BurgerMenuHidden();
                    //$('#MenuHome').removeClass('noDisplay');
                });
                
            }
        });
        // hide mobile menu beforeunload
        $(window).on('beforeunload unload', function () {
            if ($('#main-menu-state')[0].checked) {
                $('#main-menu-state')[0].click();
            }
        });
        if ($(window).width() < 768) {
            $('#main-menu-state')[0].checked = true;
            $('#main-menu-state')[0].click();
        }
        else {
            BurgerMenuHidden();
        }
    }
    /*
    if(!$("#BurgerMenueHolder").is(':visible'))
    {
        $('#MenuHome').removeClass('noDisplay');
    }
    */  
    $('#MenuHome').css('max-height', $(window).height() - 70 + "px");
    $(window).resize(function () {
        
        var $menu = $('#main-menu');
        if ($(window).width() < 768) {
            var $mainMenuState = $('#main-menu-state');
            BurgerMenuShown();
            if ($mainMenuState.length > 0) {
                if ($mainMenuState[0].checked)
                    $menu.css('display', '');
                else
                    $menu.css('display', 'none');
            }
        } else {
            $menu.css('display', '');
            BurgerMenuHidden();
        }
        $('#MenuHome').css('max-height', $(window).height() - 70 + "px");
    });

    
    if (typeof MaVas !== "undefined" && MaVas !== null && MaVas.Used && MaVas.RootDirId !== undefined) {
        SLApp.CommunityService.QueryContactInfo(MaVas.UserID, MaVas.RootDirId > 0 ? MaVas.RootDirId : MaVas.DirId, function (xml) {
            if (xml) {
                var url = xml.getElementsByTagName('Info')[0];
                if (url.getAttribute('UserName') != null)
                    $('#MenuMenuItems_Home').html('<i>' + url.getAttribute('UserName').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</i>');

                $('#MenuMenuItems_Mail').data('name', url.getAttribute('UserName'));
                $('#MenuMenuItems_Mail').click(function () {
                    SendPrivateMessage(MaVas.UserID, $(this).data('name'));
                    removeMenu();
                });
                if (MaVas.UserID === -1) {
                    $('#MenuMenuItems_Mail').remove();
                    $('#MenuLogin').remove();
                    $('#MenuMenuItems_Sep1').remove();
                }
                if (url.getAttribute('Website') === '') {
                    $('#MenuMenuItems_Website').remove();
                }
                else {
                    $('#MenuMenuItems_Website').data('url', url.getAttribute('Website'));
                    $('#MenuMenuItems_Website').click(function () {
                        var website = $(this).data('url');
                        if (website.indexOf('://') < 0)
                            website = 'http://' + website;
                        var win = window.open(website);
                        if (win != null)
                            win.focus();
                        removeMenu();
                    });
                }
                if (url.getAttribute('Facebook') == '') {
                    $('#MenuMenuItems_Facebook').remove();
                }
                else {
                    $('#MenuMenuItems_Facebook').data('url', url.getAttribute('Facebook'));
                    $('#MenuMenuItems_Facebook').click(function () {
                        var win = window.open('https://www.facebook.com/' + $(this).data('url'));
                        if (win != null)
                            win.focus();
                        removeMenu();
                    });
                }
                if (url.getAttribute('Twitter') == '') {
                    $('#MenuMenuItems_Twitter').remove();
                }
                else {
                    $('#MenuMenuItems_Twitter').data('url', url.getAttribute('Twitter'));
                    $('#MenuMenuItems_Twitter').click(function () {
                        var win = window.open('https://twitter.com/' + $(this).data('url'));
                        if (win != null)
                            win.focus();
                        removeMenu();
                    });
                }
            }
        }, function () {
            $('#MenuMenuItems_Mail').remove();
            $('#MenuMenuItems_Website').remove();
            $('#MenuMenuItems_Facebook').remove();
            $('#MenuMenuItems_Twitter').remove();
        });
    }
    
        $('#MenuMenuItems_Home').click(function () {
            var home = GetShareURL();
            if (home.indexOf('?') >= 0)
                home = home.substr(0, home.indexOf('?'));
            var url = home.split('/');
            window.location.href = url[0] + '//' + url[2];

            removeMenu();
        });
    $('.MenuMenuItems_MC_Link').click(function () {
        var url = '/';
        if (MaVas.UserID > -1 || $(this)[0].id != "MenuMenuItems_MC")
            url = $(this).data('page');

        if (url.substr(0, 1) == '/') {
            window.location.href = url;
        }
        else {
            var win = window.open(url);
            if (win != null)
                win.focus();
        }

        removeMenu();
    });

    $('#MenuDownloadSingle').click(function () {
        $('#IV_Download').click();
    });
    $('#MenuPrintSingle').click(function () {
        $('#IV_Print').click();
    });

    $('#MenuShareItems_Mail').click(function () {
            removeMenu();
            ShareLinkWithMail(GetShareURL());
        });
        $('#MenuShareItems_Facebook').click(function () {
            var win = window.open('https://www.facebook.com/sharer.php?u=' + encodeURIComponent(GetShareURL()) + '&t=' + encodeURIComponent(_locStrings.ShareTitle), 'sl_facebook', 'height=450,width=700,scrollbars=1');
            if (win != null)
                win.focus();
            removeMenu();
        });
        $('#MenuShareItems_Twitter').click(function () {
            var win = window.open('https://twitter.com/share?url=' + encodeURIComponent(GetShareURL()) + '&text=' + encodeURIComponent(_locStrings.ShareTitle), 'sl_twitter', 'height=450,width=700,scrollbars=1');
            if (win != null)
                win.focus();
            removeMenu();
        });
        $('#MenuShareItems_Embed').click(function () {
            removeMenu();
        });

    $('.SubMenuSub').click(function () {
        $(this).children('ul').show();

        if ($('#BurgerMenue').is(':visible')) {
            $(this).children('ul').css({ width: '100%', top: 'auto', left: 'auto' });
        }
        else {
            var pos = $(this).position();
            if ($(this).offset().left + $(this).width() + $(this).children('ul').width() > $(window).width())
                pos.left -= $(this).children('ul').width();
            else
                pos.left += $(this).width();

            $(this).children('ul').css({ width: 'auto', top: pos.top + 'px', left: pos.left + 'px' });
            $(this).children('a').addClass('SubMenuSubActive');
        }
    });
    $('.SubMenuSub').hover(function () {
        if (!$('#BurgerMenue').is(':visible')) {
            $(this).children('ul').show();

            var pos = $(this).position();
            if ($(this).offset().left + $(this).width() + $(this).children('ul').width() > $(window).width())
                pos.left -= $(this).children('ul').width();
            else
                pos.left += $(this).width();

            $(this).children('ul').css({ width: 'auto', top: pos.top + 'px', left: pos.left + 'px' });
            $(this).children('a').addClass('SubMenuSubActive');
        }
    }, function () {
        if (!$('#BurgerMenue').is(':visible')) {
            $(this).children('ul').hide();
            $(this).children('a').removeClass('SubMenuSubActive');
        }
    });

    $('.MenuLanguageItems').click(function () {
        var lang = $(this).data('lang');
        if (lang != undefined && lang != '')
            window.location.href = SetUrlParam(window.location.href, 'l', lang);
        $('#MenuLanguageItems_View').hide();
    });

});



function GetShareURL() {
    var url = window.location.href.split('?');
    url[0] = url[0].replace(/.stage.mediacenter.pro/i, '.mediacenter.pro');
    url[0] = url[0].replace(/.stage.mediacenter.plus/i, '.mediacenter.plus');

    if (url.length >= 2) {
        var params = url[1].split(/[&;]/g);

        //reverse iteration as may be destructive
        for (var i = params.length; i-- > 0;) {
            //idiom for string.startsWith
            if (params[i].lastIndexOf('op=', 0) !== -1 || params[i].lastIndexOf('menu=', 0) !== -1 || params[i].lastIndexOf('ba=', 0) !== -1 || params[i].lastIndexOf('frame=', 0) !== -1) {
                params.splice(i, 1);
            }
        }

        if (params.length > 0)
            return url[0] + (params.length > 0 ? '?' + params.join('&') : '');
    }

    return url[0];
}

function onSendPrivateMessage(parms) {
    $('#send_pm_to').text(parms['UserName']);
    $('#send_pm_name').focus();
}
function SendPrivateMessage(id, name) {
    var parms = new Array();
    parms['UserId'] = id;
    parms['UserName'] = name;

    var dlg = new MaintainerDlg('send-pm', 450);

    dlg.SetButton(_locStrings.SendPrivateMessageOK, function () {
        if ($(this).hasClass('MaintainerDialogButtonsDisabled'))
            return;
        $(this).addClass('MaintainerDialogButtonsDisabled');

        if ($('#send_pm_name').val() == '') {
            $(this).removeClass('MaintainerDialogButtonsDisabled');
            dlg.SetErrorText(_locStrings.ShareSendMailEmptyName);
            $('#send_pm_name').focus();
            return;
        }
        if ($('#send_pm_mail').val() == '' || !ValidateEmail($('#send_pm_mail').val())) {
            $(this).removeClass('MaintainerDialogButtonsDisabled');
            dlg.SetErrorText(_locStrings.ShareSendMailErrorMail);
            $('#send_pm_mail').focus();
            return;
        }

        var dir = -1;
        if (CurrentView.DirId != undefined && CurrentView.DirId > 0)
            dir = CurrentView.DirId;

        var img = -1;
        if (CurrentView.CurrentImageID != undefined && CurrentView.CurrentImageID > 0)
            img = CurrentView.CurrentImageID;

        var btnOK = $(this);
        SLApp.CommunityService.SendPrivateMessage($('#send_pm_name').val(), $('#send_pm_mail').val(), $('#send_pm_msg').val(), img, dir, true, function (res) {
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

    dlg.Open(onSendPrivateMessage, parms);
}

function onReportFile(parms) {
    $('#report_file_url').val(window.location.href);
    $('#report_file_url').data('ImgID', parms['ImgID']);
    $('#report_file_url').on("focus", function () {
        $('#report_file_reason').focus();
    });
}
function ReportFile(id) {
    var parms = new Array();
    parms['ImgID'] = id;

    var dlg = new MaintainerDlg('report-file', 450);

    dlg.SetButton(_locStrings.ReportImageButton, function () {
        if ($(this).hasClass('MaintainerDialogButtonsDisabled'))
            return;
        $(this).addClass('MaintainerDialogButtonsDisabled');

        if ($('#report_file_name').val() == '') {
            $(this).removeClass('MaintainerDialogButtonsDisabled');
            dlg.SetErrorText(_locStrings.ShareSendMailEmptyName);
            $('#report_file_name').focus();
            return;
        }
        if ($('#report_file_mail').val() == '' || !ValidateEmail($('#report_file_mail').val())) {
            $(this).removeClass('MaintainerDialogButtonsDisabled');
            dlg.SetErrorText(_locStrings.ShareSendMailErrorMail);
            $('#report_file_mail').focus();
            return;
        }

        var btnOK = $(this);
        SLApp.CommunityService.ReportImage($('#report_file_name').val(), $('#report_file_mail').val(), $('#report_file_reason').val(), $('#report_file_url').data('ImgID'), function (res) {
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

    dlg.Open(onReportFile, parms);
}


function SetSearchType(typeNew) {
    var typeOld = $('#SearchType').val();
    if (typeOld == '')
        typeOld = 'normal';

    if (typeOld == typeNew)
        return false;

    setCookie('SearchType', typeNew);
    $('#SearchType').val(typeNew);

    if ($('#SearchEdit').val() == '')
        return false;

    var text = $('#SearchEdit').val();
    if (text.length > 1) {
        if (text.charAt(0) == '"' && text.charAt(text.length - 1) == '"')
            text = text.substr(1, text.length - 2);
        $('#SearchEdit').val(text.replace(/ OR /ig, ' '));
    }
    text = $('#SearchEdit1').val();
    if (text.length > 1) {
        if (text.charAt(0) == '"' && text.charAt(text.length - 1) == '"')
            text = text.substr(1, text.length - 2);
        $('#SearchEdit1').val(text.replace(/ OR /ig, ' '));
    }
    return true;
}


function ShowSearchScopeMenu(btn) {
    $('#SearchScopeMenu').remove();

    var menu = $('<ul id="SearchScopeMenu"></ul>').appendTo($('body'));
    menu.mouseleave(function () {
        HideSearchScopeMenu();
    });

    var all = $('<li><div class="SearchScopeInactive"></div>' + _locStrings.SearchScopeAll + '</li>').appendTo(menu);
    all.click(function () {
        setCookie('SearchScope', 'all');
        UpdateSearchInfo();
        HideSearchScopeMenu();

        if ($('#SearchEdit').val() != '')
            $('#Searcher').click();
    });

    var folder = $('<li><div class="SearchScopeInactive"></div>' + _locStrings.SearchScopeFolder + '</li>').appendTo(menu);
    folder.click(function () {
        setCookie('SearchScope', 'folder');
        UpdateSearchInfo();
        HideSearchScopeMenu();

        if ($('#SearchEdit').val() != '')
            $('#Searcher').click();
    });

    $('<li class="SearchScopeSeparator"><hr></li>').appendTo(menu);

    var normal = $('<li><div class="SearchScopeInactive"></div>' + _locStrings.SearchAdvancedNormal + '</li>').appendTo(menu);
    normal.click(function () {
        HideSearchScopeMenu();
        if (SetSearchType('normal'))
            $('#Searcher').click();
    });

    var any = $('<li><div class="SearchScopeInactive"></div>' + _locStrings.SearchAdvancedAny + '</li>').appendTo(menu);
    any.click(function () {
        HideSearchScopeMenu();
        if (SetSearchType('any'))
            $('#Searcher').click();
    });

    var exact = $('<li><div class="SearchScopeInactive"></div>' + _locStrings.SearchAdvancedExact + '</li>').appendTo(menu);
    exact.click(function () {
        HideSearchScopeMenu();
        if (SetSearchType('exact'))
            $('#Searcher').click();
    });

    $('<li class="SearchScopeSeparator"><hr></li>').appendTo(menu);

    var advanced = $('<li><div class="SearchScopeInactive"></div>' + _locStrings.SearchAdvanced + '</li>').appendTo(menu);
    advanced.click(function () {
        ShowAdvancedSearch();
    });

    switch ($('#Searcher').data('scope')) {
        case 'all':
            all.children('.SearchScopeInactive').addClass('SearchScopeActive');
            break;
        case 'folder':
            folder.children('.SearchScopeInactive').addClass('SearchScopeActive');
            break;
    }
    switch (getCookie('SearchType')) {
        case 'any':
            any.children('.SearchScopeInactive').addClass('SearchScopeActive');
            break;
        case 'exact':
            exact.children('.SearchScopeInactive').addClass('SearchScopeActive');
            break;
        default:
            normal.children('.SearchScopeInactive').addClass('SearchScopeActive');
            break;
    }

    var t = 0;
    var l = 0;
    if (menu.css('width') == '100%') {
        // Mobile view
        t = btn.parent().parent().offset().top + btn.parent().parent().outerHeight();
    }
    else {
        // Desktop view
        t = btn.offset().top + btn.outerHeight();
        l = Math.min(btn.offset().left -20, $(window).width() - menu.outerWidth());
    }
    menu.css({ top: t, left: l });
}

function HideSearchScopeMenu() {
    $('#SearchScopeMenu').fadeOut('fast', function () { $(this).remove(); });
}
