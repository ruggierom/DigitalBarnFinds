var printItLoaded = false;
$(document).ready(function () {

});

var printIt = {

    PrintWithPDF : function (Img) {
        loadScript('/JavaScript/html2canvas.js', function () {
            loadScript('/JavaScript/jspdf.min.js', function () {
                loadScript('/JavaScript/jquery-ui-1.12.1.js', function () {
                    GetPrintDialog = function (OnSuccess) {
                        var param = { Snipped: 'PrintDialog', Version: '1' };
                        $.ajax({
                            url: '/UserAndInfoService.asmx/GetHTMLSnippTrans',
                            data: JSON.stringify(param),
                            dataType: 'json',
                            type: 'POST',
                            contentType: 'application/json; charset=utf-8',
                            dataFilter: function (data) { return data; },
                            success: function (data) {
                                if (printItLoaded)
                                    OnSuccess(data.d)
                                else
                                    alert("PrintPDF not available!");
                            },
                            error: function (XMLHttpRequest, textStatus, errorThrown) {
                                ;
                            }
                        });
                        printItLoaded = true;
                    }
                    GetPrintDialog(function (html) {
                        let rotate = '';
                        let scale = parseInt(Img.SizeY) / parseInt(Img.SizeX);
                        if (Img.SizeX > Img.SizeY) {
                            rotate = '&Rot=3';
                        }
                        $('body').append($(html));
                        var language = navigator.languages && navigator.languages[0] || // Chrome / Firefox
                            navigator.language ||   // All browsers
                            navigator.userLanguage; // IE <= 10

                        var param = { cult: language };
                        $.ajax({
                            url: '/UserAndInfoService.asmx/GetStandardPaperSize',
                            data: JSON.stringify(param),
                            dataType: 'json',
                            type: 'POST',
                            contentType: 'application/json; charset=utf-8',
                            dataFilter: function (data) { return data; },
                            success: function (data) {
                                var allOptions = $('#papsize')[0].options;
                                for (let cbI = 0; cbI < allOptions.length; cbI++) {
                                    if (allOptions[cbI].text === data.d)
                                        $('#papsize').prop('selectedIndex', cbI).trigger("change");
                                }
                            },
                            error: function (XMLHttpRequest, textStatus, errorThrown) {
                                ;
                            }
                        });

                        var dlg = $("#print-form").dialog({
                            /*height: 270,*/
                            width: 350,
                            modal: true,
                            /*classes:
                            {
                                "ui-dialog": "ui-corner-all whiteDialog PrintDlg" ,
                                "ui-dialog-titlebar": "grayHeader",
                                "ui-widget-content": "whiteDialog darkColor"
                            },*/
                            buttons: {
                                "Print": function () {
                                    //                                doc.autoPrint({ variant: 'javascript' });
                                    //                                doc.save('sample-document.pdf');
                                    Img.PrintSize = $('#papsize').val();
                                    Img.Orientation = $('#Orientation').val();
                                    doPrintStuff(Img);
                                    $("#print-form").dialog("close");
                                    $("#print-form").remove();
                                },
                                Cancel: function () {
                                    $("#print-form").dialog("close");
                                    $("#print-form").remove();
                                }
                            },
                            close: function () {
                                //                            form[0].reset();
                                //                            allFields.removeClass("ui-state-error");
                            }
                        });

                    });
                });
            });
        });
        getImageFromUrl= function (url, callback) {
            var img = new Image();

            img.onError = function () {
                alert('Cannot load image: "' + url + '"');
            };
            img.onload = function () {
                callback(img);
            };
            img.src = url;
        }
        var doPrintStuff = function (Img) {
            try {
                var ps = Img.PrintSize.split(',');
                printJS({ printable: '/Print_me.pdf?id=' + Img.ID + '&ps=' + ps[2] + '&or=' + Img.Orientation, type: 'pdf', showModal: true });
            }
            catch (e) {
                console.log('Error while creating print PDF');
            }
            return;
            var doc = new jsPDF({
                format: ps,
                unit: 'mm',
                orientation: Img.Orientation
            });

            doc.setFontSize(10);
            doc.setFont("OpenSans-Regular");

            let imgID = Img.ID;
            let scale = parseInt(Img.SizeY) / parseInt(Img.SizeX);
            let imgSize = ps[1];
            let width = imgSize;
            let height = imgSize * scale;
            let rotate = '';
            if (Img.Orientation != 'portrait') {
                width = imgSize * scale;
                height = imgSize;
                if (Img.SizeX < Img.SizeY) {
                    rotate = '&Rot=3';
                } else {
                }
            } else {
                width = imgSize;
                height = imgSize * scale;
                if (Img.SizeX > Img.SizeY) {
                    rotate = '&Rot=3';
                } else {
                    width = imgSize / scale;
                    height = imgSize;

                }
            }


            let src = "/MCIMG_" + Img.ID + "_" + Img.SizeX + "_" + Img.SizeY + Img.ext + "?v=" + Img.ver + rotate;
            width -= 40;
            height -= 40;
            getImageFromUrl(src, function (imgData) {
                debugger;
                printJS({
                    printable: imgData.src,
                    type: 'image',
                    style: 'img { width:' + width + 'mm;' + 'height:' + height + 'mm;}'
               
                });



                doc.addImage({
                    imageData: imgData,
                    x: (doc.internal.pageSize.getWidth() - width) / 2,
                    y: (doc.internal.pageSize.getHeight() - height) / 2,
                    w: width,
                    h: height
                });
                doc.autoPrint();
//                window.open(doc.output('bloburl'), '_blank');
//                doc.output('dataurlnewwindow');
                if ('printPdfSL' in window.external) {

                    window.external.printPdfSL(doc.output());
                } else {
                    printJS(doc.output('bloburl'));
//                    doc.output('pdfobjectnewwindow');
//                    doc.output('bloburl')
//                    doc.save();
                }

            });

        }





    }
}