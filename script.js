/* 
Beeline
Created by Sandy Pranjic and Sharon Yi.

Beeline is a small web-based app that allows the user to enter any starting point in Toronto, and any end point in Toronto, and it shows them all the bike share stations within a 0.5km radius with a live update of how many bikes are available and how many docks (parking spots) are available. The user also has the ability to specifiy how many bikes and docks they need in case they're commuting with a friend.

We created our app using an API, and two different JSON datasets made publicly available by the City of Toronto. We used the Open Cage Data API to allow the user to input a starting location and ending location, and let us find the geo coordinates of both those locations (using latitude and longitude). Then, we make an AJAX call to the Station Information dataset that gives us the coordinates of every single Bixi station in Toronto. The Station Information dataset also provides us with an id for every station.

We run a forEach on the results array we get back from the AJAX call to the Station Information dataset, and plug each set of coordinates into a mathematical equation. The equation takes two sets of coordinates and calculates the distance between them in kilometres. If a station is within a 0.5km radius of the location the user inputted, we pass that station's information into a function called getNumberOfAvailableBikes() or getNumberOfAvailableDocks(). These two functions make another AJAX call to a different dataset called Station Status. Because we already have the station id associated to all the sets of coordinates, we can reiterate through the array we get back from the Station Status dataset using the id. If the id of the item in the Station Status array matches the id of a station id that's within a 0.5km radius of the user input's location, then we also check if the amount of available bikes/docks is greater than or equal to the user's input for the amount of bikes or docks they need. If the station satisfies both of these, then we append it to the page.

We have numbered comments for all the different steps of our code. 

Credits:
Open Cage Data: Used to find the coordinates of starting and end locations
https://opencagedata.com/

City of Toronto Open Data - Bixi Station Information: Used to find the geo-coordinates of all the Bixi locations in the city and then compare them to the geo-coordinates of the user's start and end points. This also provides us with an ID for each station that we can use in the Station Status dataset.
https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information

City of Toronto Open Data - Bixi Station Station Status: Used to figure out how many bikes and docks are available at each station within a 0.5km raidus from the user's start and end points, using the ID we have from the Station Information dataset. Updated in real-time.
https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_status

Mathematical equation to figure out the distance between two sets of coordinates from the Geo Data Source website (but modified so it's in ES6).
https://www.geodatasource.com/developers/javascript

Bicycle illustration by Sharon Yi.

*/

const app = {};

app.apiKey = "fe35ac72901446148ba4c27a3cc2c638";

/* 
2. We run two functions called getStartingLocationCoordinates() and getEndLocationCoordinates() to find the longitutde and latitude of both of the user's inputs. These two functions make AJAX calls to the Open Cage Data API. We use the first item in the results array because the API always shows the most relevant match in position 0. We save the values of geometry.lat and geometry.lng properties to variables called searchQueryLatitude and searchQueryLongitude for the starting location. For the end point, we save the values as searchEndQueryLatitude and searchEndQueryLongitude. We then pass these variables to functions called getStartingLocationBikeData() and getEndLocationDockData() respectively.
*/

app.getStartingLocationCoordinates = function(query, requiredNumberOfBikes) {
  $.ajax({
    url: `https://api.opencagedata.com/geocode/v1/json?q=${query}&key=fe35ac72901446148ba4c27a3cc2c638`,
    method: "GET",
    dataType: "json",
    data: {
      key: `${app.apiKey}`,
      q: `${query}`
    }
  }).then(function(result) {
    if (result.results.length === 0) {
      let errorMessage = `
      <div class="resultsErrorHandling"><span class="errorMessage">Our database doesn't contain any information about your starting point, please enter another location.</span></div>
      `;
      $(".results").html(errorMessage);
    }
    let searchQueryLatitude = result.results[0].geometry.lat;
    let searchQueryLongitude = result.results[0].geometry.lng;
    app.getStartingLocationBikeData(searchQueryLatitude, searchQueryLongitude, requiredNumberOfBikes);
  });
};

app.getEndLocationCoordinates = function(query, requiredNumberOfDocks) {
  $.ajax({
    url: `https://api.opencagedata.com/geocode/v1/json?q=${query}&key=fe35ac72901446148ba4c27a3cc2c638`,
    method: "GET",
    dataType: "json",
    data: {
      key: `${app.apiKey}`,
      q: `${query}`
    }
  }).then(function(result) {
    if (result.results.length === 0) {
      let errorMessage = `
      <div class="endResultsErrorHandling"><span class="errorMessage">Our database doesn't contain any information about your end point, please enter another location.</span></div>
      `;
      $(".endResults").html(errorMessage);
    }
    let searchEndQueryLatitude = result.results[0].geometry.lat;
    let searchEndQueryLongitude = result.results[0].geometry.lng;
    app.getEndLocationDockData(searchEndQueryLatitude, searchEndQueryLongitude, requiredNumberOfDocks);
  });
};

/*
3. We then run two functions called getStartingLocationBikeData() and getEndLocationDockData(). These two functions make AJAX calls to the City of Toronto dataset called Station Information. This dataset contains the coordinates of every Bixi station in Toronto and its associated id. When we recieve the info back from the AJAX calls, we use the .then() method to run a forEach() on the stations array. We run every station's coordinates and it's id through a function called caculateDistance() or calculateEndDistance().
*/

app.getStartingLocationBikeData = function(searchQueryLatitude, searchQueryLongitude, requiredNumberOfBikes) {
  $.ajax({
    url: `https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information`,
    method: "GET",
    dataType: "json"
  }).then(function(bikeResult) {
    bikeResult.data.stations.forEach(function(individualStation) {
      let stationId = individualStation.station_id;
      let startingBikeLatitude = individualStation.lat;
      let startingBikeLongitude = individualStation.lon;
      let stationName = individualStation.name;
      const distanceToEachStation = app.calcDistance(searchQueryLatitude, searchQueryLongitude, startingBikeLatitude, startingBikeLongitude, "K");
      if (distanceToEachStation < 0.5) {
        app.getNumberOfAvailableBikes(stationId, stationName, requiredNumberOfBikes, distanceToEachStation, startingBikeLatitude,  startingBikeLongitude);
      } else {
        $(".noBikesError").empty();
        const resultsError = `
          <span>There are no bikes available near this location.</span>
          `
        $(".noBikesError").append(resultsError);
        if ($(".endPointButton").hasClass("activeButton")) {
          $(".noBikesError").empty();
        }
      }
    });
  });
};

app.getEndLocationDockData = function(searchEndQueryLatitude, searchEndQueryLongitude, requiredNumberOfDocks) {
  $.ajax({
    url: `https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information`,
    method: "GET",
    dataType: "json"
  }).then(function(dockResult) {
    dockResult.data.stations.forEach(function(individualStation) {
      let stationId = individualStation.station_id;
      let endDockLatitude = individualStation.lat;
      let endDockLongitude = individualStation.lon;
      let stationName = individualStation.name;
      const distanceToEachStation = app.calcDistance(searchEndQueryLatitude, searchEndQueryLongitude, endDockLatitude, endDockLongitude, "K");
      if (distanceToEachStation <= 0.5) {
        app.getNumberOfAvailableDocks(stationId, stationName, requiredNumberOfDocks, distanceToEachStation, endDockLatitude, endDockLongitude);
      } else {
        $(".noDocksError").empty();
        const endResultsError = `
          <span>There are no docks available near this location.</span>
          `
        $(".noDocksError").append(endResultsError).hide();
      };
    });
  });
};

/* 
4. calculateDist() is a reuseable function that runs the coordinates of every station and either the starting location or end location. It uses a mathematical equation to calculate the distance between two sets of coordinates and returns the value in kilometres. This return value is then returned to the function where they were called and saved into a variable.

*** WE DID NOT CREATE THIS MATHEMATICAL EQUATION. We did some research and found a source online: https://www.geodatasource.com/developers/javascript.

*/

app.calcDistance = function(lat1, lon1, lat2, lon2, unit) {
  if (lat1 == lat2 && lon1 == lon2) {
    return 0;
  } else {
    let radlat1 = (Math.PI * lat1) / 180;
    let radlat2 = (Math.PI * lat2) / 180;
    let theta = lon1 - lon2;
    let radtheta = (Math.PI * theta) / 180;
    let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
      dist = 1;
    }
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit == "K") {
      dist = dist * 1.609344;
    }
    if (unit == "N") {
      dist = dist * 0.8684;
    }
    return dist;
  };
};

/*
5. getNumberOfAvailableBikes() and getNumberOfAvailableDocks() are functions that make an AJAX call to another City of Toronto dataset called Station Status. Since we already have the id of every station that's within a 0.5km distance of our start/end points, we use a forEach() to reiterate through every item in the stations array we get back from the AJAX call. If the id of the station that's within a 0.5km radius matches the id of one of the stations in the station array, then we run another if statement. If the variable we have saved as requiredNumberOfBikes or requiredNumberOfDocks is equal to or less than the num_bikes_available property or num_docks_available property of the item in the stations array, then we have a match of a station that is within 0.5km and also has at minimum the amount of bikes or docks the user needs. We then append this station to the page.
*/

app.getNumberOfAvailableBikes = function(stationId, stationName, requiredNumberOfBikes, dist, startingBikeLatitude, startingBikeLongitude) {
  $.ajax({
    url: `https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_status`,
    method: "GET",
    dataType: "json"
  }).then(function(stationResults) {
    stationResults.data.stations.forEach(function(individualStation) {
      let requiredNumberOfBikesInteger = parseInt(requiredNumberOfBikes);
      if (stationId === individualStation.station_id) {
        $(".noBikesError").empty();
        const resultsError = `
        <span>There are no bikes available near this location.</span>
        `
        $(".noBikesError").append(resultsError);
        if ($(".endPointButton").hasClass("activeButton")) {
          $(".noBikesError").empty();
        }
        if (requiredNumberOfBikesInteger <= individualStation.num_bikes_available) {
          const startingLocationHtml = `<div class="startingStationContainer">
                <div class="startingStation">
                    <div class="startingStationLocation" tabIndex="0">
                    <span class="stationName"><span class="visuallyHidden">There is a Bixi station </span>Located at ${stationName}</span>
                    <span class="distance"><i class="fas fa-walking"></i><span class="visuallyHidden">It's approximately</span> ${Math.round(
                      (dist / 4) * 60
                    )} min. walking or ${parseFloat(dist).toFixed(2)} km</span>
                    <a href="https://www.google.com/maps/search/?api=1&query=${startingBikeLatitude},${startingBikeLongitude}" class="openInMaps" target="_blank"><i class="fas fa-map-marker-alt"></i> Open in Google Maps</a>
                </div>

                <div class="startingStationBikesAvailable" tabIndex="0">
                    <span class="bikesAvailable"><span class="visuallyHidden">There are this many bikes available: </span>${individualStation.num_bikes_available}</span>
                    <span class="bikesAvailableText">Bikes Available</span>
                </div>
            </div>`;
          //${Math.round(dist * 1000)} to get meters
          $(".results").append(startingLocationHtml);
          $(".noBikesError").empty();
        }
      }
    });
  });
};

app.getNumberOfAvailableDocks = function(stationId, stationName, requiredNumberOfDocks, dist, endDockLatitude, endDockLongitude) {
  $.ajax({
    url: `https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_status`,
    method: "GET",
    dataType: "json"
  }).then(function(stationResults) {
    stationResults.data.stations.forEach(function(individualStation) {
      let requiredNumberOfDocksInteger = parseInt(requiredNumberOfDocks);
      if (stationId === individualStation.station_id) {
        $(".noDocksError").empty();
        const endResultsError = `
        <span>There are no bikes available near this location.</span>
        `
        $(".noDocksError").append(endResultsError).hide();
        if (requiredNumberOfDocksInteger <= individualStation.num_docks_available) {
          const endLocationHtml = `
            <div class="endStationContainer">
                <div class="endStation">
                    <div class="endStationLocation" tabIndex="0">
                    <span class="stationName"><span class="visuallyHidden">There is a station</span> Located at ${stationName}</span>
                    <span class="distance"><i class="fas fa-walking"></i><span class="visuallyHidden">The station is</span> Approximately ${Math.round(
                      (dist / 4) * 60
                    )} min. walking or ${parseFloat(dist).toFixed(2)} km</span>
                    <a href="https://www.google.com/maps/search/?api=1&query=${endDockLatitude},${endDockLongitude}" class="openInMaps" target="_blank"><i class="fas fa-map-marker-alt"></i> Open in Google Maps</a>
                </div>

                <div class="endStationDocksAvailable tabIndex="0"">
                    <span class="docksAvailable"><span class="visuallyHidden">There are this many docks available: </span>${individualStation.num_docks_available}</span>
                    <span class="docksAvailableText">Docks Available</span>
                </div>
            </div>`;
          $(".endResults").append(endLocationHtml);
          $(".noDocksError").empty();
        };
      };
    });
  });
};

/* 
1. The app begins with an event listener. When the user submits the form, we prevent the default action of the form automatically refreshing the page. Then we save the value of all the user's different inputs to variables (their starting location, how many bikes they need, their destination, and how many docks they need). We pass the startingLocation and requiredNumberOfBikes variables to a function called getStartingLocationCoordinates(), and the endLocation and requiredNumberOfDocks variables to a function called getEndLocationCoordinates(). We also remove the class that hides the results.

We keep passing requiredNumberofBikes and requiredNumberOfDocks as arguments/parameters to all the functions we use to find the rest of the data we need because as of now, these variables are scoped to this initial event listener and we want to be able to access them in other places, because it affects the results of what we show the user depending on how many bikes/docks they need and how many are available.
*/

app.init = function() {
  $("form").on("submit", function (e) {
    e.preventDefault();
    $(".results").empty();
    $(".endResults").empty();
    $(".errorHandling").empty();
    $(".noBikesError").empty();
    $(".noDocksError").empty();
    $("html").animate({
      scrollTop: $("#toggleResults").offset().top
    }, 2000);
  
    let startingLocation = $(".startingLocationInput").val();
    let endLocation = $(".endLocationInput").val();
    let requiredNumberOfBikes = $(".numberOfBikesInput option:selected").val();
    let requiredNumberOfDocks = $(".numberOfDocksInput option:selected").val();
    
    if (startingLocation === "") {
      let errorMessage = `<span class="errorMessage">Please enter a valid starting location.</span>`;
      $(".errorHandling").html(errorMessage);
    }
  
    if (endLocation === "") {
      let errorMessage = `<span class="errorMessage">Please enter a valid destination.</span>`;
      $(".errorHandling").html(errorMessage);
    }
    if (requiredNumberOfDocks === "placeholder") {
      let errorMessage = `<span class="errorMessage">Please enter the amount of docks you need.</span>`;
      $(".errorHandling").html(errorMessage);
    }
    
    if (requiredNumberOfBikes === "placeholder") {
      let errorMessage = `<span class="errorMessage">Please enter the amount of bikes you need.</span>`;
      $(".errorHandling").html(errorMessage);
    }
  
  
  
    if (startingLocation !== "" && endLocation !== "" && requiredNumberOfBikes !== "placeholder" && requiredNumberOfDocks !== "placeholder") {
      app.getStartingLocationCoordinates(startingLocation, requiredNumberOfBikes);
      app.getEndLocationCoordinates(endLocation, requiredNumberOfDocks);
      $(".toggleResultsContainer").removeClass("toggleResultsContainerHideOnLoad");
  
      $(".toggleResults").on("click", ".endPointButton", function () {
        $(".noDocksError").show();
        $(".startingPointButton").removeClass("activeButton");
        $(".endPointButton").addClass("activeButton");
        $(".endResults").addClass("activeResults");
        $(".results").addClass("inactiveResults");
        $(".noDocksError").empty();
        $(".noBikesError").empty();
        if ($(".endPointButton").hasClass("activeButton") && $(".endResults").is(":empty")) {
          const endResultsError = `
          <span>There are no docks available near this location.</span>
          `
          $(".noDocksError").append(endResultsError);
        }
      });
      
      $(".toggleResults").on("click", ".startingPointButton", function () {
        $(".endPointButton").removeClass("activeButton");
        $(".startingPointButton").addClass("activeButton");
        $(".endResults").removeClass("activeResults");
        $(".results").removeClass("inactiveResults");
        $(".noBikesError").empty();
        $(".noDocksError").empty();
        if ($(".startingPointButton").hasClass("activeButton") && $(".results").is(":empty")) {
          const resultsError = `
          <span>There are no bikes available near this location.</span>
          `
          $(".noBikesError").append(resultsError);
        } 
      })
    }
  });
  
  $(".openMenuButton").on("click", function() {
    $(".slideOutMobileNav").addClass("activeMenu");
  });

  $(".exitMenuButton").on("click", function() {
    $(".slideOutMobileNav").removeClass("activeMenu");
  });
};

$(document).ready(function() {
  app.init();
});
