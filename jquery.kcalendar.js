/**
* K Calendar
*
* Charles Brown
*
* Known issues
*   Refactoring of many methods
*   Reduce the number of css classes required
*   Replace the fc buttons entirely
*   Method for changing date via public api
*/

(function ($, undefined) {

    var fc = $.kCalendar = { version: "0.2.3" };
    var defaults = {

        maxEvents: 2

    };

    $.fn.kCalendar = function (options) {
        // method calls
        if (typeof options == 'string') {
            var args = Array.prototype.slice.call(arguments, 1);

            // for every instance, retrieve the calendar object and perform the method
            this.each(function (i, _element) {
                var calendar = $.data(this, 'kcalendar');
                if (calendar && $.isFunction(calendar[options])) {
                    var r = calendar[options].apply(calendar, args);
                }
            });

            return this;
        }

        // extend the default options
        options = $.extend(true, {}, defaults, options);

        // plugin pattern
        return this.each(function (i, _element) {
            var element = $(_element);
            var calendar = new kCalendar(element, options);
            element.data('kcalendar', calendar);
            calendar.render();
        });
    };

})(jQuery);

var kCalendar = function (element, options) {

    var self = this;

    this.element = element;
    this.options = options;
    this.month = Date.today().getMonth();
    this.year = Date.today().getFullYear();
    this.day = Date.today().getDate();
    this.refreshData = true;
    this.view = 'month';

    // show a specific month
    this.showMonth = function (month, year) {
        self.show(self.day, month, year, 'month');
    };

    // show a specific day
    this.showDay = function (day, month, year) {
        self.show(day, month, year, 'day');
    };

    this.show = function (day, month, year, view) {
        // set refresh if month changes
        self.refreshData = self.month !== month;

        self.view = view;
        self.day = day;
        self.month = month;
        self.year = year;
        self.render();
    };

    // next month
    this.next = function () {
        self.change(1);
    };

    // prev month
    this.prev = function () {
        self.change(-1);
    };

    // increment the day a given number
    this.change = function (value) {
        if (typeof value === 'number') {
            // TODO: refactor
            if (self.view === 'month') {
                var calendarDate = new Date(self.year, self.month, 1);
                calendarDate = calendarDate.addMonths(value);
                self.showMonth(calendarDate.getMonth(), calendarDate.getFullYear());
            }
            else if (self.view === 'day') {
                var calendarDate = new Date(self.year, self.month, self.day);
                calendarDate = calendarDate.addDays(value);
                self.showDay(calendarDate.getDate(), calendarDate.getMonth(), calendarDate.getFullYear());
            }
        }
        // TODO: date
    };

    // main render
    this.render = function () {

        // trigger refresh of data if needed
        // only render the header and month when the actual month changes
        if (self.refreshData) {
            self.element.empty();
            renderHeader();
            renderMonthView();

            if (self.options.getEvents && typeof self.options.getEvents === 'function') {
                self.options.getEvents(
                    self.getDate().moveToFirstDayOfMonth(),
                    self.getDate().moveToLastDayOfMonth()
                    );
                self.refreshData = false;
            }

            // bind click events
            self.element.find('td[id^="kcalendar-date-"]').click(function () {
                var d = $(this).attr('id').replace('kcalendar-date-', '').split('-');
                self.showDay(d[1], (d[0] - 1), d[2]);
            });

            // TODO: refactor to use id's
            self.element.find('.fc-button-prev').click(function () {
                self.prev();
            });
            self.element.find('.fc-button-next').click(function () {
                self.next();
            });
            self.element.find('.fc-button-day').click(function () {
                self.showDay(self.day, self.month, self.year);
            });
            self.element.find('.fc-button-month').click(function () {
                self.showMonth(self.month, self.year);
            });

            self.element.find('.fc-button-cal').click(function () {
                self.showMonth($("#datepicker").datepicker('getDate').getMonth(), $("#datepicker").datepicker('getDate').getFullYear());
            });
        }

        // always render currently selected day
        renderDayView();

        // show the appropriate view
        self.changeView(self.view);
    };

    // public method for changing view
    this.changeView = function (view) {
        this.view = view;

        // TODO: refactor common elements without breaking readability
        var caption;
        if (self.view === 'month') {
            caption = self.getDate().toString('MMMM yyyy');
            $('div.kcalendar-monthview', self.element).show();
            $('div.kcalendar-dayview', self.element).hide();

            // buttons
            this.element.find('.fc-button-month').addClass('fc-state-selected');
            this.element.find('.fc-button-day').removeClass('fc-state-selected');
        }
        else if (self.view === "day") {
            caption = self.getDate().toString('dddd, MMMM d, yyyy');
            $('div.kcalendar-monthview', self.element).hide();
            $('div.kcalendar-dayview', self.element).show();

            // buttons
            this.element.find('.fc-button-month').removeClass('fc-state-selected');
            this.element.find('.fc-button-day').addClass('fc-state-selected');
        }

        // change header caption
        this.element.find('.kcalendar-header h2').text(caption);
    };

    // add an event to the calendar
    this.addEvent = function (event) {
        // find the date
        var cellDate = event.start.toString("M-d-yyyy");
        var list = $('#kcalendar-date-' + cellDate + ' div.kcalendar-day-content>ul');

        // check max render for monthview
        var total = $(list).children('li').length;
        if (total < self.options.maxEvents) {
            // render event normally
            renderEvent(list, event, true);
        }
        else {
            // render 'more' link if not added already
            if ($(list).find('li.morelink').length === 0) {
                $('<li class="morelink"><a href="#" onclick="return false;">more</a></li>')
                    .appendTo(list)
                    .click(function () {
                        self.showDay(event.start.getDate(), event.start.getMonth(), event.start.getFullYear());
                    });
            }

            // render event hidden
            renderEvent(list, event, false);
        }
    };

    // get the calendar date
    this.getDate = function () {
        return new Date(self.year, self.month, self.day);
    };

    // remove all events and call getevents method
    this.reload = function () {
        self.refreshData = true;
        self.render();
    };

    var renderHeader = function () {
        var k = '<div class="kcalendar-header">';
        k += '<table class="kcalendar-table">';
        k += '<thead>';
        k += '<tr class="header">';
        k += '<th class="buttons-left">';
        k += '<span class="fc-button fc-button-prev fc-state-default fc-corner-left"><span class="fc-button-inner"><span class="fc-button-content">&nbsp;◄&nbsp;</span><span class="fc-button-effect"><span></span></span></span></span>';
        k += '<span class="fc-button fc-button-next fc-state-default fc-corner-right"><span class="fc-button-inner"><span class="fc-button-content">&nbsp;►&nbsp;</span><span class="fc-button-effect"><span></span></span></span></span>';
        k += '</th>';
        k += '<th><h2></h2></th>';
        k += '<th class="buttons-right">';
        k += '<span class="fc-button fc-button-month fc-state-default fc-corner-left"><span class="fc-button-inner"><span class="fc-button-content">Month</span><span class="fc-button-effect"><span></span></span></span></span>';
        k += '<span class="fc-button fc-button-day fc-state-default fc-corner-right"><span class="fc-button-inner"><span class="fc-button-content">Day</span><span class="fc-button-effect"><span></span></span></span></span>';
        k += '<span style="padding-right:100px;">&nbsp;</span>';
        k += '<span class="fc-button fc-button-cal fc-state-default fc-corner-left"><span class="fc-button-inner"><span class="fc-button-content">Goto Selected Month</span><span class="fc-button-effect"><span></span></span></span></span>';
        k += '</th></tr></thead><tbody></tbody></table></div>';

        self.element.append(k);
    };

    var renderMonthView = function () {
        // get the first day of the month
        var currentDay = new Date(self.year, self.month, 1);
        var firstDayOfWeek = currentDay.getDay();

        // offset to start the first cell
        currentDay = currentDay.addDays(-firstDayOfWeek);

        var k = '<div class="kcalendar-monthview">';
        k += '<table class="kcalendar-table">';
        k += '<thead>';
        k += '<tr class="col-header"><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>';
        k += '</thead>';

        // build the layout
        k += '<tbody>';
        for (var i = 0; i < 6; i++) {
            k += '<tr class="kcalendar-week-' + (i + 1) + '">';
            for (var j = 0; j < 7; j++) {
                k += '<td class="kcalendar-weekday-' + (j + 1) + '" id="kcalendar-date-' + (currentDay.getMonth() + 1) + '-' + currentDay.getDate() + '-' + currentDay.getFullYear() + '">';
                k += '<div class="kcalendar-day">';
                if (currentDay.getMonth() === self.month) {
                    k += '<div class="kcalendar-day-number">' + currentDay.getDate() + '</div>';
                }
                else {
                    k += '<div class="kcalendar-day-number kcalendar-other-month">' + currentDay.getDate() + '</div>';
                }
                k += '<div class="kcalendar-day-content"><ul></ul></div>';
                k += '</div>';
                k += '</td>';

                currentDay = currentDay.addDays(1);
            }
            k += '</tr>';
        }
        k += '</tbody></table></div>';

        self.element.append(k);
    };

    var renderDayView = function () {
        // find the day element or create if not found
        var dayElement = self.element.find('div.kcalendar-dayview');
        if (dayElement.length === 0) {
            dayElement = $('<div class="kcalendar-dayview" style="display:none;"><div class="kcalendar-eventlist"><ul></ul></div></div>').appendTo(element);
        }

        // add our day data
        var cellDate = '' + (self.month + 1) + '-' + self.day + '-' + self.year;
        var list = self.element.find('#kcalendar-date-' + cellDate + ' div.kcalendar-day-content>ul>li').not('.morelink').clone();
        $('ul', dayElement).empty().append(list);
    };

    var renderEvent = function (list, event, showEvent) {
        var k = '<li' + (showEvent ? '' : ' class="day-view-only"') + '>';
        k += '<span class="cal-icon-toggle ui-icon ui-icon-circle-plus day-view-only" onclick="$(this).siblings(\'ul.expandedview\').toggle();$(this).toggleClass(\'ui-icon-circle-plus ui-icon-circle-minus\');"/>';
        k += '<span class="cal-icon-' + event.icon + '">' + event.title + '</span>';
        k += '<div class="clear">&nbsp;</div>';
        k += '<ul class="expandedview day-view-only" style="display:none;">' + event.data + '</ul>';
        k += '</li>';

        // add to dom
        var element = $(k).appendTo(list);

        // enable mouseover tooltip
        $('span', element).qtip({
            content: $(event.data).addClass('quickview'),
            style: {
                classes: 'ui-tooltip-rounded ui-tooltip-tipsy month-view-only'
            },
            position: {
                my: 'top left',
                at: 'bottom right',
                adjust: {
                    x: 0,
                    y: 0
                },
                viewport: $('#calendar')
            }
        });

    };

};
