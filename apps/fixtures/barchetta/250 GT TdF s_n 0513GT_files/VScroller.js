
(function ($) {
    if (typeof HMMC_$ === 'undefined') {
        HMMC_$ = $;
    }

    var settings =
    {
        containment: "parent",
        axis: 'y',
        scrollcontainer: '',
        drag: function (event, ui) {
            methods.dragit(ui.position.top);
            /*
            var h = HMMC_$(this).parent().height();
            var sch = HMMC_$(settings.scrollcontainer).attr("scrollHeight") - HMMC_$(settings.scrollcontainer).height();
            var p = (ui.position.top) * 100 / h;
            if (p > 50)
            p = (ui.position.top + HMMC_$(this).height()) * 100 / h;
            var np = sch * p / 100;
            HMMC_$(settings.scrollcontainer).scrollTop(np);
            //        	    treeWidth = ui.offset.left;

            //        	    ContentResize();
            */
        },
        obj: null
    };

    var methods = {
        init: function (options) {
            if (options) {
                HMMC_$.extend(settings, options);
            }
            this.draggable(settings);

            _element = this;
            var container = HMMC_$(settings.scrollcontainer);
            //            container.css('background', 'Green');
            /*            this.parent().wresize(function () {
            methods.reposition(_element);
            });
            */
            container.mousewheel(function (e, delta) {

                newY = _element.position().top;
                newY -= (delta*100);
                newY = Math.max(0, newY);
                if (newY > container.height() - _element.height()/2 -10)
                    newY = container.height() - _element.height()/2 -10;
                _element.css('top', newY + 'px');
                methods.dragit(newY);
            });
            methods.reposition(_element);
            try {
                _element.on('touchstart', function (e) {
                    _startMove = e.targetTouches[0].clientY;
                    _startThumbY = _element.position().top;

                    _element.on('touchmove', function (e) {
                        try {
                            //                            alert("moved " + e.clientY);
                            //                            alert(e.targetTouches[0].clientY);
                            var y = e.targetTouches[0].clientY - _startMove;
                            var newY = _startThumbY;
                            newY -= y;

                            HMMC_$("#DirName").text('pos:' + newY);
                            if (newY > 0 && newY < container.height()) {
                                _element.css('top', newY + 'px');
                                methods.dragit(newY);
                            }

                        } catch (err) {
                            alert("error on moving" + e + ' ' + err.message);
                        }
                        e.preventDefault();
                    });
                    _element.on('touchend', function (e) {
                        _element.off('touchmove');
                    });
                });

                container.on('touchstart', function (e) {
                    _startMove = e.targetTouches[0].clientY;
                    _startThumbY = _element.position().top;
                    container.on('touchmove', function (e) {
                        try {
                            //                            alert("moved " + e.clientY);
                            //                            alert(e.targetTouches[0].clientY);
                            var y = e.targetTouches[0].clientY - _startMove;
                            var newY = _startThumbY;
                            newY += y;
                            //                            HMMC_$("#DirName").text('pos:' + newY);
                            if (newY > 0 && newY < container.height()) {
                                _element.css('top', newY + 'px');
                                methods.dragit(newY);
                            }

                        } catch (err) {
                            alert("error on moving" + e + ' ' + err.message);
                        }
                        e.preventDefault();
                    });
                    on.bind('touchend', function (e) {
                        container.off('touchmove');
                    });
                });

            } catch (e) {
                //                alert("error on adding handler" + e.message);
            };
        },
        destroy: function () {

            return this.each(function () {
                HMMC_$(window).unbind('.tooltip');
            });

        },
        dragit: function (TopPos) {
            var h = _element.parent().height();
            var sc = HMMC_$(settings.scrollcontainer)[0].scrollHeight;
            var sch = sc - HMMC_$(settings.scrollcontainer).height();
            var p = (TopPos) * 100 / h;
            if (p > 50)
                p = (TopPos + _element.height()) * 100 / h;
            var np = sch * p / 100;
            HMMC_$(settings.scrollcontainer).scrollTop(np);
        },
        reposition: function (elem) {
            //            elem.width(elem.parent().width());
            //            elem.height(_element.drag.height());
            //            _element.drag.css('left', (elem.parent().width() - _element.drag.width()) / 2 + 'px');
        },
        show: function () { },
        hide: function () { },
        update: function (content) { }
    };

    HMMC_$.fn.VScrollBar = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            HMMC_$.error('Method ' + method + ' does not exist on jQuery.tooltip');
        }


    };
})(jQuery);

(function ($) {
    if (typeof HMMC_$ === 'undefined') {
        HMMC_$ = $;
    }
    var methods = {
        log : function (str)
        {
            if(HMMC_$("#logWnd").length)
                HMMC_$("#logWnd").text(str+" | " +HMMC_$("#logWnd").text());
        },

         init: function (options) {

            var settings =
            {
                drag:   function (event, ui) {
                },
                move:   function (event, ui) {
                },
                end:    function (event, ui) {
                },
                click:  function (event, ui) {
                },
                start: function (event, ui) {
                },
                lastEvent:""
            };
             if (options) {
                HMMC_$.extend(settings, options);
            }
            if(HMMC_$("#logWnd").length==0)
            {
//                HMMC_$('<div id ="logWnd" style="position:absolute;top:0px;left:0px;width:266px;height:100px;background-color:White;overflow:scroll;z-index:8000"></div>').appendTo(HMMC_$('body'));
//                HMMC_$("#logWnd").scrollTop(10000);
            }
// Do mouse stuff
            if (this.length > 0) {
                this[0].settings = new Array();
                HMMC_$.extend(this[0].settings, settings);
                this[0].settings.self = this;
                settings.obj = this;

                HMMC_$(this).on('mousedown', this[0].settings, function (e) {

                    try {
                        if (typeof this.setCapture != 'undefined')
                            this.setCapture();
                    } catch (e) {
                    };

                    methods.log("mouse down");
                    var CurrSettings = e.data;
                    CurrSettings._startMoveX = e.pageX;
                    CurrSettings._startMoveY = e.pageY;
                    CurrSettings.lastEvent = "mousedown";
                    
                    CurrSettings.start(e, CurrSettings, CurrSettings.self);

                    HMMC_$(document).on('mousemove.vscroller', CurrSettings, function (e) {
                        CurrSettings = e.data;
                        CurrSettings.object = this;
                        CurrSettings._curPosX = e.pageX;
                        CurrSettings._curPosY = e.pageY;
                        CurrSettings.move(e, CurrSettings, CurrSettings.self);
                        CurrSettings.lastEvent = "mousemove";
                        if (e.buttons & 1 || (e.buttons === undefined && e.which == 1)) {

                        } else {
                            // released mousekey out of frame
                            HMMC_$(document).off('mousemove.vscroller');
                            HMMC_$(document).off('mouseup.vscroller');
                            e.preventDefault();
                            try {
                                this.releaseCapture();
                            } catch (e) {

                            };
                            try {
                                HMMC_$(this).click(CurrSettings);
                            } catch (e) {

                            }
                        }

                    });

                    HMMC_$(document).on('mouseup.vscroller',CurrSettings, function (e) {
                        //                    CurrSettings= HMMC_$(this).settings();
                        try {
                            this.releaseCapture();
                        } catch (e) {

                        };

                        CurrSettings = e.data;
                        CurrSettings.lastEvent = "mouseup";
                        CurrSettings._endMoveX = e.pageX;
                        CurrSettings._endMoveY = e.pageY;
                        CurrSettings.object = this;
                        if (Math.abs(CurrSettings._endMoveX - CurrSettings._startMoveX) < 5) {
                            if (Math.abs(CurrSettings._endMoveY - CurrSettings._startMoveY) < 5) {
                                CurrSettings.click(e, CurrSettings, CurrSettings.self);
                            }
                        }else
                            CurrSettings.end(e, CurrSettings, CurrSettings.self);
                        HMMC_$(document).off('mousemove.vscroller');
                        HMMC_$(document).off('mouseup.vscroller');
                        e.preventDefault();
                    });


                });


            this.click(this[0].settings,function (e) {
                CurrSettings=e.data;
                methods.log("Click" +"-->" + CurrSettings.lastEvent);
                CurrSettings.object = this;
                if(CurrSettings.lastEvent !== "mouseup" && CurrSettings.lastEvent != "touchend")
                    CurrSettings.click(e,CurrSettings);

                CurrSettings.lastEvent = "click";
            });


            this.on('touchstart',settings, function (e) {
                methods.log("start control ");
                var CurrSettings = e.data;
                CurrSettings.object = this;
                CurrSettings.lastEvent = "touchstart";
                CurrSettings.object = this;
                e.data.self = this;


                HMMC_$(document).on('touchend',CurrSettings, function (e) {
                    CurrSettings=e.data;
                    CurrSettings.object = this;
                    CurrSettings.lastEvent = "touchend";

                    methods.log("\ntouchend control ");
                    HMMC_$(document).unbind('touchend');
                    HMMC_$(CurrSettings.self).unbind('touchmove');

                    CurrSettings._endMoveX= CurrSettings._curPosX;
                    CurrSettings._endMoveY = CurrSettings._curPosY;

                    if(Math.abs(CurrSettings._endMoveX -CurrSettings._startMoveX) < 5)
                    {
                        if(Math.abs(CurrSettings._endMoveY -CurrSettings._startMoveY) < 5)    
                        {
                            methods.log("touchend control click");

                            CurrSettings.click(e, CurrSettings, CurrSettings.self);
                            return;
                        }
                    }

                    CurrSettings.end(e, CurrSettings, CurrSettings.self);
                    
                });

                CurrSettings._curPosX= CurrSettings._startMoveX= e.originalEvent.targetTouches[0].clientX;
                CurrSettings._curPosY=CurrSettings._startMoveY = e.originalEvent.targetTouches[0].clientY;

                CurrSettings.start(e, CurrSettings, CurrSettings.self);
                HMMC_$(this).on('touchmove', CurrSettings, function (e) {
                    if (typeof e.originalEvent.targetTouches != "undefined") {
                        CurrSettings = e.data;
                        CurrSettings.object = this;
                        CurrSettings.lastEvent = "touchmove";
                        CurrSettings.object = this;
                        methods.log("touchmove " + CurrSettings._curPosY);
                        CurrSettings._curPosX = e.originalEvent.targetTouches[0].clientX;
                        CurrSettings._curPosY = e.originalEvent.targetTouches[0].clientY;
                        CurrSettings.move(e, CurrSettings, CurrSettings.self);
                    }
//                    HMMC_$('#InfoTxtBtn').text('move '+ elem[0].id + ' ('+CurrSettings.self._curPosX +','+CurrSettings.self._curPosY+')');
                });
                
                e.preventDefault();

            });

            }

        }
     }

    HMMC_$.fn.PadMouseDrag = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            HMMC_$.error('Method ' + method + ' does not exist on jQuery.tooltip');
        }
    };
})(jQuery);

