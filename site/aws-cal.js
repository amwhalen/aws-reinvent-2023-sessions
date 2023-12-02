
var aws_sessions = [];

var configuration = {
  searchableFields: ['title', 'description', 'thirdPartyID'],
  sortings: {
    id_desc: {
      field: 'title',
      order: 'asc'
    }
  },
  aggregations: {
    my_favorites: {
      title: 'Favorites',
      size: 2,
      conjunction: true,
    },
    aws_tag_day: {
      title: 'Day',
      size: 10,
      conjunction: true,
    },
    startTimeNice: {
      title: 'Start Time',
      size: 100,
      conjunction: true,
    },
    venueName: {
      title: 'Venue',
      size: 100,
      conjunction: true,
    },
    trackName: {
      title: 'Session Type',
      size: 10,
      conjunction: true,
    },
    // startDateTime: {
    //   title: 'Start Date Time',
    //   size: 10,
    //   conjunction: true,
    // },
    aws_tag_topic: {
      title: 'Topic',
      size: 100,
      // conjunctive facet (AND)
      conjunction: true,
    },
    aws_tag_areas_of_interest: {
      title: 'Area of Interest',
      size: 100,
      conjunction: true,
    },
    aws_tag_level: {
      title: 'Level',
      size: 100,
      conjunction: true,
    },
    aws_tag_role: {
      title: 'Role',
      size: 100,
      conjunction: true,
    },
    aws_tag_services: {
      title: 'Services',
      size: 100,
      conjunction: true,
    }
  }
}

function timeConverter(UNIX_timestamp) {
  var three_hours = 3 * 60 * 60;
  var a = new Date((UNIX_timestamp-three_hours) * 1000);
  var year = a.getFullYear();
  var m = ('0' + (a.getMonth()+1)).slice(-2);
  var d = ('0' + a.getDate()).slice(-2);
  var date = a.getDate();
  var hour = ('0' + a.getHours()).slice(-2);
  var min = ('0' + a.getMinutes()).slice(-2);
  var sec = ('0' + a.getSeconds()).slice(-2);
  // Desired output: 2023-11-27T09:00:00
  var dt = year + '-' + m + '-' + d + 'T' + hour + ':' + min + ':' + sec;
  return dt;
}

function startTimeConverter(UNIX_timestamp) {
  var three_hours = 3 * 60 * 60;
  var a = new Date((UNIX_timestamp-three_hours) * 1000);
  var hour = a.getHours();
  var min = ('0' + a.getMinutes()).slice(-2);

  var h = (hour > 12) ? (hour-12) : hour;
  var h = (h == 0) ? 12 : h;
  var suffix = (hour >= 12) ? 'pm' : 'am';
  
  var dt = h + suffix;
  
  // Desired output: 1pm
  return dt;
}

Vue.component('paginate', VuejsPaginate);
const router = new VueRouter();

var vm = new Vue({
  el: '#aws-reinvent-app',
  router: router,
  data: function () {

    // adding default filter selections
    var filters = {};
    Object.keys(configuration.aggregations).map(function(v) {
      filters[v] = [];
    });

    // adding pagination variables
    var page = this.page || 1;
    var per_page = this.per_page || 30;
    var rows = this.rows || null;
    var db = this.db || null;
    var isLoaded = this.isLoaded || false;
    var viewMode = this.viewMode || 'wide';
    var lastChanged = this.lastChanged || Date.now();
    var generated_datetime = this.generated_datetime || null;
    var information = this.information || null;
    var calendar = this.calendar || null;
    var hiddenFacets = this.hiddenFacets || [];
    var config = configuration;

    return {
      query: '',
      filters: filters,
      page: page,
      per_page: per_page,
      generated_datetime: generated_datetime,
      information: information,
      rows: rows,
      db: db,
      isLoaded: isLoaded,
      viewMode: viewMode,
      lastChanged: lastChanged,
      hiddenFacets: hiddenFacets,
      calendar: calendar,
      config: config
    }
  },
  created() {

    var v = this;

    // Router
    var parameters = this.$route.query;
    this.setParamsFromURL(parameters);

    $.ajax({
        // data originally from:
        // https://hub.reinvent.awsevents.com/attendee-portal-api/public-catalog/
        //url: 'api.php',
        url: '/sessions.json',
        method: 'GET',
        contentType: 'application/json; charset=utf-8'
      }).done(function (result) {

        // Success.
        v.generated_datetime = result.meta.generated_datetime;
        v.rows = result.data;

        // Set app information
        v.information = 'Favorites are stored in your browser\'s local storage.';
        v.information += ' The download button allows you to download your favorites as CSV.';
        v.information += ' AWS session data last refreshed on ' + v.generated_datetime + ' UTC.';
        v.information += ' More info at https://github.com/amwhalen/aws-reinvent-2023-sessions.';

        
        v.rows.map(function(row) {
          
          // pull in any favorites stored in local storage
          key = "favorite_"+row.thirdPartyID;
          if (localStorage.getItem(key) !== null && localStorage.getItem(key) == 'Yes') {
            row.my_favorites = 'Yes';
          }
          
          // A bunch of other engineering of the data to make it nice
          if (row.startDateTime != '') {
            row.start = timeConverter(row.startDateTime);
            row.startTimeNice = startTimeConverter(row.startDateTime);
            row.endTimeNice = startTimeConverter(row.endDateTime);
          }
          if (row.endDateTime != '') {
            row.end = timeConverter(row.endDateTime);
          }
          if ('aws_tag_day' in row && row.aws_tag_day.length > 0) {
            row.day = row.aws_tag_day.join(', ');
          } else {
            row.day = '';
          }
          row.wide_title = row.title;
          
          var venueInitials;
          if (row.venueName != '') {
            venueInitials = row.venueName.split(" ").map((n)=>n[0]).join("");
          } else {
            venueInitials = 'TBD';
          }
          row.title = venueInitials + ': ' + row.title;
          
          // set event background color based on location:
          var venueColors = {
            'MGM Grand': '#198754',
            'Wynn': '#0d6efd',
            'Caesars Forum': '#dc3545',
            'Mandalay Bay': '#e4ab00',
            'Venetian': '#7f1a8c',
          };
          if (row.venueName != '' && row.venueName in venueColors) {
            row.backgroundColor = venueColors[row.venueName]; 
          } else {
            row.backgroundColor = '#666666';
          }
          
          return row;
        });

        // set the Items JS database with the rows and config
        v.db = itemsjs(v.rows, configuration);
        v.isLoaded = true;

        if (v.viewMode == 'grid') {
          v.setViewModeGrid();
        } else {
          v.setViewModeWide();
        }

      }).fail(function (jqXHR, textStatus) {
        v.isLoaded = true;
        console.log(jqXHR, textStatus);
        // Error.
        //var error = JSON.parse(jqXHR.responseText);
        //var error_message = error.error;
      });

  },
  methods: {
    setViewModeGrid: function() {
      
      var v = this;
      
      v.viewMode = 'grid';
      
      // show only favorites in calendar view
      var cal_events = v.db.search({
        per_page: 2000,
        sort: 'id_desc',
        filters: {
          'my_favorites': ['Yes']
        }
      });
        
      // calendar view
      var calendarEl = document.getElementById('calendar');
      //console.log('calendarEl', document.getElementById('calendar'));
      v.calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'timeGridFourDay',
        views: {
          timeGridFourDay: {
            type: 'timeGrid',
            duration: { days: 5 }
          }
        },
        initialDate: '2023-11-27',
        slotMinTime: '07:00:00',
        slotMaxTime: '20:00:00',
        height: 'auto',
        contentHeight: 'auto',
        events: cal_events.data.items,
        displayEventEnd: false,
        displayEventTime: false,
        headerToolbar: {
          left: '',
          center: '',
          right: ''
        },
        eventTimeFormat: {
          // DayGrid views. '7p'
          hour: 'numeric',
          minute: '2-digit',
          omitZeroMinute: true,
          meridiem: 'narrow'
        },
        eventClick: function(info) {
          // TODO: add popup of event info
          //alert('Event: ' + info.event.cal_title);
          // change the border color just for fun
          //info.el.style.borderColor = 'red';
        },
        eventDidMount: function(info) {
          // var tooltip = new Tooltip(info.el, {
          //   title: info.event.extendedProps.description,
          //   placement: 'top',
          //   trigger: 'hover',
          //   container: 'body'
          // });
          console.log('extendedProps', info.event.extendedProps);
          $(info.el).popover({
            'title': info.event.extendedProps.wide_title,
            'content': '<strong>' + info.event.extendedProps.startTimeNice + ' @ '+info.event.extendedProps.venueName+'</strong><p>'+info.event.extendedProps.description+'</p>',
            'html': true,
            'placement': 'top',
          });
        },
        // events: [
        //   {
        //     title: 'Event',
        //     start: '2023-11-27T09:00:00',
        //     end: '2023-11-27T10:00:00'
        //   },
        //   {
        //     title: 'Long Event',
        //     start: '2023-11-27T10:00:00',
        //     end: '2023-11-27T11:00:00'
        //   },
        //   {
        //     title: 'Another Event',
        //     start: '2023-11-27T16:00:00',
        //     end: '2023-11-27T17:00:00'
        //   },
        //   {
        //     title: 'Another Event Conflict',
        //     start: '2023-11-27T16:00:00',
        //     end: '2023-11-27T16:30:00'
        //   },
        //   {
        //     title: 'Another Event 3',
        //     start: '2023-11-28T16:00:00',
        //     end: '2023-11-28T17:00:00'
        //   },
        // ]
      });
      v.calendar.render();

      // Enable bootstrap popovers
      var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
      var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl)
      });
      
    },
    setViewModeWide: function() {
      var v = this;
      v.viewMode = 'wide';
      
      // delete calendar
      v.calendar = null;
      //console.log('calendar to delete', document.getElementById('calendar'));
      document.getElementById('calendar').remove();
      
      // create new container for calendar
      var innerDiv = document.createElement('div');
      innerDiv.setAttribute('id', 'calendar');
      document.getElementById('calendar-container').appendChild(innerDiv);
      
      //console.log('calendar recreated', document.getElementById('calendar'));
    },
    // Clear all search filters.
    reset: function () {
      var filters = {};
      Object.keys(configuration.aggregations).map(function(v) {
        filters[v] = [];
      })

      this.filters = filters;
      this.page = 1;
      this.query = '';
      this.lastChanged = Date.now();

      this.goToPage(this.page);
    },
    // Sets the current filters based on the query string.
    setParamsFromURL(params) {
  
      var v = this;

      var newFilters = {};
      Object.keys(v.filters).map(function(filterV) {
        var filterVWithBrackets = filterV + '[]';
        var val = undefined;
        if (filterV in params) {
          var val = params[filterV];
        } else if (filterVWithBrackets in params) {
          var val = params[filterVWithBrackets];
        }

        if (val !== undefined) {
          if (Array.isArray(val)) {
            newFilters[filterV] = val;
          } else {
            newFilters[filterV] = [val];
          }
        } else {
          newFilters[filterV] = [];
        }

      });

      v.filters = newFilters;

      // Set the search query
      if ('query' in params) {
        this.query = params['query'];
      }

      // Set the grid/wide viewMode
      if ('viewMode' in params) {
        if (['grid', 'wide'].includes(params['viewMode'])) {
          this.viewMode = params['viewMode'];
        }
      }

    },
    // Set the pagination to the given page and scroll to the top.
    goToPage: function (page) {
      this.page = page;
      window.scrollTo(0,0);
      return page;
    },
    // Show or hide a facet.
    toggleFacet: function(e) {
      e.preventDefault();
      var facetName = e.currentTarget.getAttribute('data-facet');
      if (this.hiddenFacets.includes(facetName)) {
        this.hiddenFacets.splice(this.hiddenFacets.indexOf(facetName), 1);
      } else {
        this.hiddenFacets.push(facetName);
      }
    },
    // Set a favorite item.
    favorite: function(e) {
      var favorited_id = e.currentTarget.getAttribute('data-id');
      this.changeFavorite(favorited_id, 'Yes');
    },
    // Remove a favorite items.
    unfavorite: function(e) {
      var favorited_id = e.currentTarget.getAttribute('data-id');
      this.changeFavorite(favorited_id, 'No');
    },
    updateQueryString: function() {

      var v = this;

      var query = {};

      query['viewMode'] = v.viewMode;

      // filters
      Object.keys(v.filters).map(function(filterV) {
        if (v.filters[filterV].length > 0) {
          query[filterV + '[]'] = v.filters[filterV];
        }
      });

      // search query
      if (this.query != null && this.query != '') {
        query['query'] = this.query;
      }

      this.$router.push({query: query});

    },
    // Remove a selected filter.
    removeFilter: function(filterId, itemId) {

      var v = this;

      var newFilters = {};
      Object.keys(configuration.aggregations).map(function(fId) {
        if (fId == filterId) {
          // exclude the given itemId
          newFilters[fId] = v.filters[fId].filter(function(fItem) {
            return fItem != itemId;
          });
        } else {
          newFilters[fId] = v.filters[fId];
        }
      });

      this.filters = newFilters;
    },
    // Download favorites as CSV
    downloadFavoritesCSV() {

      var v = this;

      var csv_rows = [
        ['ID','Day','Start Time','End Time','Venue','Location','Type','Title','Description']
      ];
      v.rows.forEach(function(row) {
        if (row.my_favorites == 'Yes') {
          csv_rows.push([
            row.thirdPartyID,
            row.aws_tag_day,
            row.startTimeNice,
            row.endTimeNice,
            row.venueName,
            row.locationName,
            row.trackName,
            '"' + row.wide_title + '"',
            '"' + row.description + '"'
          ]);
        }
      });
      
      let csvContent = "data:text/csv;charset=utf-8,";
      
      csv_rows.forEach(function(rowArray) {
          let row = rowArray.join(",");
          csvContent += row + "\r\n";
      });

      var encodedUri = encodeURI(csvContent);
      window.open(encodedUri);

    },
    // Handle saving the state of the favorited item.
    changeFavorite(favorited_id, is_favorite) {

      var v = this;

      // find this item in the rows data and change it to a favorite
      var changedFavorite = false;
      var newRows = v.rows.map(function(row) {
        if (row.thirdPartyID == favorited_id) {
          changedFavorite = true;
          row.my_favorites = is_favorite;
          // save in browser local storage
          if (is_favorite == 'Yes') {
            localStorage.setItem("favorite_"+row.thirdPartyID, is_favorite);
          } else {
            localStorage.removeItem("favorite_"+row.thirdPartyID);
          }
          return row;
        } else {
          return row;
        }
      });

      if (changedFavorite) {
        v.db.reindex(newRows);
        // force recompute of searchResult to update facet counts
        v.lastChanged = Date.now();
      }

    }
  },
  computed: {
    // Calculate the item number we're showing first.
    showingStart: function() {
      if (this.searchResult) {
        if (this.searchResult.data.items.length == 0) {
          return 0;
        } else {
          return (this.searchResult.pagination.page - 1) * this.searchResult.pagination.per_page + 1;
        }
      } else {
        return 0;
      }
    },
    // Calculate the final item number we're showing.
    showingEnd: function() {
      if (this.searchResult) {
        return (this.showingStart == 0) ? 0 : this.showingStart + this.searchResult.data.items.length - 1;
      } else {
        return 0;
      }
    },
    // Summary of active filters
    filterSummary: function() {
      var v = this;

      // Add normal filters.
      var filterSummary = [];
      Object.keys(this.filters).map(function(val) {
        if (v.filters[val].length > 0) {
          v.filters[val].map(function(filterName) {

            var filterSummaryTitle = '';

            var item = {
              'id': val + filterName,
              'val': val,
              'name': filterName,
              'summary': filterSummaryTitle + filterName
            };
            filterSummary.push(item);
          });
        }
      })

      return filterSummary;
    },
    // Search the "DB" for the given filters.
    searchResult: function() {

      var v = this;

      // make searchResult depend on lastChanged so it can recompute when itemsjs is reindexed manually
      var lastChanged = v.lastChanged;

      var searchConfig = {
        query: this.query,
        page: this.page,
        per_page: this.per_page,
        filters: this.filters,
        sort: 'id_desc',
      };

      if (this.db !== null) {
        var result = this.db.search(searchConfig);

        // Filter out facets that don't have any "buckets" with count greater than zero.
        // result.data.aggregations is an object, not an array, so we turn it into an array.
        var facetsAsArray = Object.entries(result.data.aggregations);
        var nonEmptyFacets = facetsAsArray.filter(([key, facet]) => {
          var nonEmptyBuckets = facet.buckets.filter((b) => b.doc_count > 0);
          return nonEmptyBuckets.length > 0;
        });
        // Turn the nonEmptyFacets back into an object.
        result.data.aggregations = Object.fromEntries(nonEmptyFacets);
        
        // TODO: update calendar if in that view mode
        // if (v.viewMode == 'grid') {
        //   document.getElementById('calendar').innerHTML = "";
        //   v.setViewModeGrid();
        // }

      } else {
        var result = false;
      }

      return result;
    }
  },
  watch: {
    filters: {
      deep: true,
      handler(newFilters, oldFilters) {
        this.updateQueryString();
      }
    },
    viewMode: function() {
      this.updateQueryString();
    },
    query: function() {
      this.updateQueryString();
    },
  }
});

// Enable bootstrap popovers
var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
  return new bootstrap.Popover(popoverTriggerEl)
});
