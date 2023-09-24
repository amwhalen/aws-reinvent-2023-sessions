
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
      trackName: {
        title: 'Session Type',
        size: 10,
        conjunction: true,
      },
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
      var maxCost = this.maxCost || null;
      var maxBillableCost = this.maxBillableCost || null;
      var maxCostInput = this.maxCostInput || null;
      var maxBillableCostInput = this.maxBillableCostInput || null;
      var minCost = this.minCost || null;
      var minBillableCost = this.minBillableCost || null;
      var minCostInput = this.minCostInput || null;
      var minBillableCostInput = this.minBillableCostInput || null;
      var hiddenFacets = this.hiddenFacets || [];
      var config = configuration;
  
      return {
        query: '',
        filters: filters,
        page: page,
        per_page: per_page,
        minCost: minCost,
        maxCost: maxCost,
        maxBillableCost: maxBillableCost,
        maxCostInput: maxCostInput,
        maxBillableCostInput: maxBillableCostInput,
        minCost: minCost,
        minCostInput: minCostInput,
        minBillableCost: minBillableCost,
        minBillableCostInput: minBillableCostInput,
        generated_datetime: generated_datetime,
        information: information,
        rows: rows,
        db: db,
        isLoaded: isLoaded,
        viewMode: viewMode,
        lastChanged: lastChanged,
        hiddenFacets: hiddenFacets,
        config: config
      }
    },
    created() {
  
      var v = this;
  
      // Router
      var parameters = this.$route.query;
      //this.setParamsFromURL(parameters);
  
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

          // pull in any favorites stored in local storage
          v.rows.map(function(row) {
            key = "favorite_"+row.thirdPartyID;
            if (localStorage.getItem(key) !== null && localStorage.getItem(key) == 'Yes') {
              row.my_favorites = 'Yes';
            }
            return row;
          });

          // set the Items JS database with the rows and config
          v.db = itemsjs(v.rows, configuration);
          v.isLoaded = true;

        }).fail(function (jqXHR, textStatus) {
          v.isLoaded = true;
          // Error.
          //var error = JSON.parse(jqXHR.responseText);
          //var error_message = error.error;
        });
  
    },
    methods: {
      // Clear all search filters.
      reset: function () {
        var filters = {};
        Object.keys(configuration.aggregations).map(function(v) {
          filters[v] = [];
        })
  
        this.filters = filters;
        this.page = 1;
        this.query = '';
        this.maxCost = null;
        this.maxCostInput = null;
        this.maxBillableCost = null;
        this.maxBillableCostInput = null;
        this.minCost = null;
        this.minCostInput = null;
        this.minBillableCost = null;
        this.minBillableCostInput = null;
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
          if (params.hasOwnProperty(filterV)) {
            var val = params[filterV];
          } else if (params.hasOwnProperty(filterVWithBrackets)) {
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
  
        // Set the billable/total cost filters
        if (params.hasOwnProperty('minCost')) {
          this.minCost = this.minCostInput = params['minCost'];
  
        }
        if (params.hasOwnProperty('maxCost')) {
          this.maxCost = this.maxCostInput = params['maxCost'];
        }
        if (params.hasOwnProperty('minBillableCost')) {
          this.minBillableCost = this.minBillableCostInput = params['minBillableCost'];
        }
        if (params.hasOwnProperty('maxBillableCost')) {
          this.maxBillableCost = this.maxBillableCostInput = params['maxBillableCost'];
        }
  
        // Set the search query
        if (params.hasOwnProperty('query')) {
          this.query = params['query'];
        }
  
        // Set the grid/wide viewMode
        if (params.hasOwnProperty('viewMode')) {
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
      // Apply the cost filter. These have a Go button so the input isn't "live" and moves around as you type.
      goCost: function(e) {
        if (e !== undefined) {
          e.preventDefault();
        }
  
        var minC = (this.minCostInput !== null) ? parseFloat(this.minCostInput.replace(/[^0-9.]/g, '')) : null;
        var maxC = (this.maxCostInput !== null) ? parseFloat(this.maxCostInput.replace(/[^0-9.]/g, '')) : null;
        var minCB = (this.minBillableCostInput !== null) ? parseFloat(this.minBillableCostInput.replace(/[^0-9.]/g, '')) : null;
        var maxCB = (this.maxBillableCostInput !== null) ? parseFloat(this.maxBillableCostInput.replace(/[^0-9.]/g, '')) : null;
  
        this.minCost = (isNaN(minC)) ? null : minC;
        this.maxCost = (isNaN(maxC)) ? null : maxC;
        this.minBillableCost = (isNaN(minCB)) ? null : minCB;
        this.maxBillableCost = (isNaN(maxCB)) ? null : maxCB;
  
        // set the inputs to the parsed values
        this.minCostInput = (this.minCost !== null) ? this.minCost.toString() : '';
        this.maxCostInput = (this.maxCost !== null) ? this.maxCost.toString() : '';
        this.minBillableCostInput = (this.minBillableCost !== null) ? this.minBillableCost.toString() : '';
        this.maxBillableCostInput = (this.maxBillableCost !== null) ? this.maxBillableCost.toString() : '';
  
        this.goToPage(this.page);
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
  
        // costs
        if (this.minCost != null && this.minCost != '') {
          query['minCost'] = this.minCost;
        }
        if (this.maxCost != null && this.maxCost != '') {
          query['maxCost'] = this.maxCost;
        }
        if (this.minBillableCost != null && this.minBillableCost != '') {
          query['minBillableCost'] = this.minBillableCost;
        }
        if (this.maxBillableCost != null && this.maxBillableCost != '') {
          query['maxBillableCost'] = this.maxBillableCost;
        }
  
        // search query
        if (this.query != null && this.query != '') {
          query['query'] = this.query;
        }
  
        this.$router.push({query: query});
  
      },
      // Remove a selected filter.
      removeFilter: function(filterId, itemId) {
  
        var v = this;
  
        var specialFilters = [
          'minCostInput',
          'maxCostInput',
          'minMaxCostInput',
          'minBillableCostInput',
          'maxBillableCostInput',
          'minMaxBillableCostInput'
        ];
  
        if (specialFilters.includes(filterId)) {
  
          if (filterId == 'minMaxCostInput') {
            v['minCostInput'] = '';
            v['maxCostInput'] = '';
          } else if (filterId == 'minMaxBillableCostInput') {
            v['minBillableCostInput'] = '';
            v['maxBillableCostInput'] = '';
          } else {
            v[filterId] = '';
          }
  
          v.goCost();
  
        }
  
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
          ['ID','Type','Title','Description']
        ];
        v.rows.forEach(function(row) {
          if (row.my_favorites == 'Yes') {
            csv_rows.push([
              row.thirdPartyID,
              row.trackName,
              '"' + row.title + '"',
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
  
        // include the title in the filter summary so it's clear what it is
        var titlesToInclude = [
          'elevator',
          'my_favorites',
          'air_conditioning',
          'ground_floor_available',
          'mixed_sex_apartment',
          'beds_in_bedroom',
          'bedrooms_in_apartment',
          'single_room'
        ];
  
        // Add normal filters.
        var filterSummary = [];
        Object.keys(this.filters).map(function(val) {
          if (v.filters[val].length > 0) {
            v.filters[val].map(function(filterName) {
  
              var filterSummaryTitle = '';
              if (titlesToInclude.includes(val)) {
                filterSummaryTitle = configuration.aggregations[val].title + ': ';
              }
  
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
  
        // Add special cost filters:
        if (this.minCost != null && this.maxCost != null) {
          filterSummary.push({
            'id': 'minMaxCostInput',
            'val': 'minMaxCostInput',
            'name': 'Min Total Cost',
            'summary': 'Total Cost $' + this.minCost + ' - $' + this.maxCost
          });
        } else if (this.minCost != null) {
          filterSummary.push({
            'id': 'minCostInput',
            'val': 'minCostInput',
            'name': 'Min Total Cost',
            'summary': 'Total Cost >= $' + this.minCost
          });
        } else if (this.maxCost != null) {
          filterSummary.push({
            'id': 'maxCostInput',
            'val': 'maxCostInput',
            'name': 'Max Total Cost',
            'summary': 'Total Cost <= $' + this.maxCost
          });
        }
  
        if (this.minBillableCost != null && this.maxBillableCost != null) {
          filterSummary.push({
            'id': 'minMaxBillableCostInput',
            'val': 'minMaxBillableCostInput',
            'name': 'Min Total Cost',
            'summary': 'Billable Cost $' + this.minBillableCost + ' - $' + this.maxBillableCost
          });
        } else if (this.minBillableCost != null) {
          filterSummary.push({
            'id': 'minBillableCostInput',
            'val': 'minBillableCostInput',
            'name': 'Min Total Cost',
            'summary': 'Billable Cost >= $' + this.minBillableCost
          });
        } else if (this.maxBillableCost != null) {
          filterSummary.push({
            'id': 'maxBillableCostInput',
            'val': 'maxBillableCostInput',
            'name': 'Max Total Cost',
            'summary': 'Billable Cost <= $' + this.maxBillableCost
          });
        }
  
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
      minCost: function() {
        this.updateQueryString();
      },
      maxCost: function() {
        this.updateQueryString();
      },
      minBillableCost: function() {
        this.updateQueryString();
      },
      maxBillableCost: function() {
        this.updateQueryString();
      },
    }
  });

// Enable bootstrap popovers
var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
  return new bootstrap.Popover(popoverTriggerEl)
})