(function($) {

    $.eventReport = function(selector, root) {

        var result = [];
        var dom = [];



        var eventsList = {
            name: null,
            on:[]
        }

        var onList = {
            value: []
        }


        $(selector || '*', root).addBack().each(function() {

            var pageEvents = $._data(this, 'events');

            if(!pageEvents) return;

            result.push(this.tagName);
            var data = {
                tag: null,
                id: null,
                events:[]
            };
            data.tag = this.tagName;

            if(this.id) {
                result.push('#', this.id);
                data.id = "#" + this.id;
            }

            if(this.className) {
                result.push('.', this.className.replace(/ +/g, '.'));
                data.id += "." + this.className.replace(/ +/g, '.');
            }

            //var c = 0;
            for(var typeEvent in pageEvents) {

                var eventlist = {
                    name: null,
                    on:[]
                }

                var r = pageEvents[typeEvent],
                    h = r.length - r.delegateCount;

                if(h){
                    result.push('\n', h, ' ', typeEvent, ' handler', h > 1 ? 'result' : '');
                    eventlist.name = typeEvent;
                }


                if(r.delegateCount) {
                    for(var q = 0; q < r.length; q++){
                        if(r[q].selector) {
                            result.push('\n', typeEvent, ' for ', r[q].selector);

                            var onlist = {
                                value: []
                            }
                            onlist.value = r[q].selector;
                            eventlist.name = typeEvent;
                            eventlist.on.push(onlist);


                        }
                    }
                }

                data.events.push(eventlist);

                //c++;
            }

            result.push('\n\n');
            dom.push(data);
        });

        //return result.join('');
        return dom;
    }

    $.fn.eventReport = function(selector) {
        return $.eventReport(selector, this);
    }
})(jQuery);



// all events
//console.log($.eventReport());

// just events on inputs
//console.log($.eventReport('input'));

// just events assigned to this element
//console.log($.eventReport('#myelement'));

// events assigned to inputs in this element
//console.log($.eventReport('input', '#myelement'));
//console.log($('#myelement').eventReport('input')); // same result

// just events assigned to this element's children
//console.log($('#myelement').eventReport());
//console.log($.eventReport('*', '#myelement'); // same result