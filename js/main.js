var windowH = $(window).height();
$("#map-container").height(windowH);
$("#infoWrapper").height(windowH);

var formatAcquiredTime = d3.time.format('%d-%b-%Y, %H:%M UTC');


// create basic leaflet map
// ========================
// tile layer for base map
var hotUrl = 'http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  hotAttribution = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, Tiles from <a href="http://hot.openstreetmap.org/" target="_blank">H.O.T.</a>',
  hotLayer = L.tileLayer(hotUrl, {attribution: hotAttribution}); 
// initialize map w options
var map = L.map('map', {
  layers: [hotLayer],
  center: new L.LatLng(0,0),
  zoom: 2,
  minZoom: 2
});



// initialize the SVG layer for D3 drawn survey points
map._initPathRoot()

// pick up the SVG from the map object
var svg = d3.select("#map").select("svg");
var markersGroup = svg.append('g').attr("id", "markers");


var surveyData = [];

function getSurveyData() {
  d3.csv("data/SurveyData.csv", function(data){ 
    surveyData = data;
    // add a LatLng object and an ID (for search integration) to each item in the dataset
    surveyData.forEach(function(d, i) {
      d.LatLng = new L.LatLng(d["_LOCATION_latitude"], d["_LOCATION_longitude"]);
      d.searchCode = d.VILLAGE_NAME + i;
    });

    // add a circle to the svg markers group for each survey point
    var mappedMarkers = markersGroup.selectAll("circle")
      .data(surveyData)
      .enter().append("circle").attr("r", 5)
      .attr('class','mappedMarker')
      .on("click", function(d){ selectedVillage(d); });
    // when map view changes adjust the locations of the svg circles
    function updatemarker(){
      mappedMarkers.attr("cx",function(d) { return map.latLngToLayerPoint(d.LatLng).x});
      mappedMarkers.attr("cy",function(d) { return map.latLngToLayerPoint(d.LatLng).y});
    }
    map.on("viewreset", updatemarker);
    updatemarker();
    mapToBounds();
    buildSearchBox()
  });
}



// function pointMousover(e){
//   var tooltipText = e.target.feature.properties.name;
//   $('#tooltip').append(tooltipText); 
// }

// function pointMouseout(e){
//   $('#tooltip').empty(); 
// }

// function onEachPoint(feature, layer) {
//   var popupHtml = "";
//   $.each(feature.properties, function(index, property){
//     popupHtml += "<small>" + index + ":</small> <strong>" + property + "</strong><br>";
//   })
//   layer.bindPopup(popupHtml);
//   layer.on({
//     mouseover: pointMousover,
//     mouseout: pointMouseout
//   });
// }



var visibleFeatures = {
  "type": "FeatureCollection",
  "features": []
};

function mapToBounds(){
  // visible markers FeatureCollection for d3 geo bounds
  visibleFeatures.features = [];
  function markerToJSON(input){
    var thisPoint = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
          "coordinates": [
            input.LatLng.lng,
            input.LatLng.lat 
          ]
      }
    };
    visibleFeatures.features.push(thisPoint);
  }
  // get bounds of all markers
  markersGroup.selectAll("circle").each(function(d){ markerToJSON(d) });
  var bounds = d3.geo.bounds(visibleFeatures);
  // reformat bounds arrays for compatibility with Leaflet and fit map to bounds
  var padding = {"padding":[0,0]};
  map.fitBounds([[Number(bounds[1][1]), Number(bounds[1][0])], [Number(bounds[0][1]), Number(bounds[0][0])]], padding);
}

// Search box
// ==========
function buildSearchBox() {
  // constructs the suggestion engine
  var villages = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('VILLAGE_NAME' , 'ALT_VILLAGE_NAME', 'CHIEFDOM', 'DISTRICT'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    local: surveyData
  });
   
  // kicks off the loading/processing of `local`
  villages.initialize();
   
  $('#search-box .typeahead').typeahead({
    // hint: true,
    highlight: true,
    minLength: 1
  },
  {
    name: 'villages',
    displayKey: Handlebars.compile('{{VILLAGE_NAME}}'),
    source: villages.ttAdapter(),
    templates: {
      empty:[
        '<div class="empty-message">',
        '<i>unable to find a matching village name</i>',
        '</div>'
      ].join('\n'),
      suggestion: Handlebars.compile('<p>{{VILLAGE_NAME}} / {{ALT_VILLAGE_NAME}}<br> &nbsp;&nbsp;&nbsp;<i>{{CHIEFDOM}}, {{DISTRICT}}</i></p>')
    }
  }).on('typeahead:selected', function (eventObj, datum) {
    selectedVillage(datum);
  });
}


function selectedVillage(datum) {
  $('#search-box .typeahead').typeahead('val', '');

  $("#info-village-name").html(datum.VILLAGE_NAME);
  $("#info-village-altname").html(datum.ALT_VILLAGE_NAME);
  $("#info-village-chiefdom").html(datum.CHIEFDOM);
  $("#info-village-district").html(datum.DISTRICT);
  $("#info-village-ward").html(datum.WARD);
  $("#info-village-constituency").html(datum.CONSTITUENCY);
  $("#info-village-households").html(datum.NUMBER_OF_HOUSEHOLDS);
  var searchCode = datum.searchCode;
  markersGroup.selectAll("circle").classed("selected", false);
  markersGroup.selectAll("circle").filter(function(d) {
    return d.searchCode == searchCode;
  }).classed("selected", true);

}

// tooltip follows cursor
$(document).ready(function() {
    $('#map').mouseover(function(e) {        
        //Set the X and Y axis of the tooltip
        $('#tooltip').css('top', e.pageY + 10 );
        $('#tooltip').css('left', e.pageX + 20 );         
    }).mousemove(function(e) {    
        //Keep changing the X and Y axis for the tooltip, thus, the tooltip move along with the mouse
        $("#tooltip").css({top:(e.pageY+15)+"px",left:(e.pageX+20)+"px"});        
    });
});

// on window resize
$(window).resize(function(){
  windowH = $(window).height();
  $("#map-container").height(windowH);
  $("#infoWrapper").height(windowH);
})


getSurveyData();