// TODOs
/*
1. description of the tool

8. progress
9. error handling
11. hosting
*/

// globals:
//  events array (from events.js)
//  locations array
//  selected events array

/* CPT World Warrior

The purpose of this tool is to allow the user to select from a list of E-sports events that they
wish to attend. They provide their zipcode, number of passengers, and desired travel times - the
tool then searches for the cheapest possible flight and hotel information and returns that
information to the user.  

*/
var locations = {}
var selectedEvents = null;
var selectedElements = [];

// Requests ----------------------------------------------------------------------------------------


// obtain latitude/longitude for the user provided zipcode
function startRequests(userValues) {
    incrementProgressBar("25%", "width:25%", "Loading...");
    userLocationRequest(userValues.zipCode);
} 

// store 200 status callback in variable
// call locationRequest with with 200 status callback
function userLocationRequest(zipCode) {
    var locationRequestHandler = makeJSONRequestHandler(userLocationCallback, null);
    locationRequest(zipCode, locationRequestHandler);
}

// Obtain geocoding for zipcode provided 
function locationRequest(zipCode, requestHandler) {
    var apiKey = "AIzaSyBpT3NYIomURKXjpxCcgPGvg7n9w66OhIk";
    var url = "https://maps.googleapis.com/maps/api/geocode/json?address=Torun&components=" + 
        "postal_code:" + zipCode + "|country:US&key=" + apiKey;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = requestHandler.call(xhr);
    xhr.send();
}

// Obtain nearest possible airport for provided latitude/longitude
function airportForLocationRequest(userLocationLat, userLocationLng, cbname) {
    var apiKey = "ef10b5c731760c11accfe4ac5e84e900";
    var url ="https://airport.api.aero/airport/nearest/" + userLocationLat + "/" + userLocationLng +
        "?maxAirports=5&user_key=" + apiKey + "&callback=" + cbname;
    var xhr = new XMLHttpRequest();
    var script = document.createElement('script');
    script.src = url;
    document.querySelector('head').appendChild(script);
}

// iterate through selectedEvents array
// conditional confirming the presence of necessary information
// call airportForLocationRequest on each applicable item in the array
function airportsForEventsRequests() {
    console.log('airportsForEventsRequests')
    each(selectedEvents, function(event, index, collection) {
        if (event.locationLatitude && event.locationLongitude) {
            var lat = event.locationLatitude;
            var lng = event.locationLongitude;
            var cbname = event.callbackName;
            airportForLocationRequest(lat, lng, cbname);
        }
    });
}

// store user provided information 
// use provided user values to create JSON object for FlightRequest API call
function makeFlightData(
    passengerCount, 
    departingAirport, 
    arrivalAirport, 
    eventDate, 
    eventEndDate, 
    budget) {
    var values = getUserValues();
    var data = {
        "request": {
           "passengers": {
              "adultCount": passengerCount
           },
           "slice": [
               {
                    "origin": departingAirport,
                    "destination": arrivalAirport,
                    "date": eventDate,
                    "permittedDepartureTime": {
                        "earliestTime": values.earliestDepartureTime,
                        "latestTime": values.latestDepartureTime, 
                    }
               },
               {
                    "origin": arrivalAirport,
                    "destination":departingAirport,
                    "date": eventEndDate,
               }
           ],
           "solutions": "1",
           "maxPrice": budget
       }
    };
    return data;
}

// function to make flightRequest API call with stored 200 status callback
function makeFlightRequest(
    passengerCount, 
    departingAirport, 
    arrivalAirport, 
    eventDate, 
    eventEndDate, 
    budget, 
    eventName) {
    var flightRequestHandler = makeJSONRequestHandler(flightRequestCallback, null);
    flightRequest(
        passengerCount, 
        departingAirport, 
        arrivalAirport, 
        eventDate, 
        eventEndDate, 
        budget, 
        eventName, 
        flightRequestHandler);
}

// function to make hotelRequest API call with stored 200 status callback
function makeHotelRequest(latitude, longitude, event){
    var hotelRequestHandler = makeJSONRequestHandler(hotelRequestCallback, null);
    hotelRequest(latitude, longitude, event, hotelRequestHandler);
}

// API call for requesting flight information via Google API
function flightRequest(
    passengerCount, 
    departingAirport, 
    arrivalAirport, 
    eventDate, 
    eventEndDate, 
    budget, 
    eventName, 
    requestHandler) {
    var key = "AIzaSyDxyG1PwYJPDysAK5gbjHWXKO6oRm-vJfQ";
    var url = "https://www.googleapis.com/qpxExpress/v1/trips/search?key=" + key;
    var flightData = makeFlightData(passengerCount, departingAirport, arrivalAirport, eventDate, 
        eventEndDate, budget, eventName);
    var strData = JSON.stringify(flightData);
    var post = new XMLHttpRequest();
    post.open("POST", url, true);
    post.setRequestHeader("Content-type", "application/json");
    post.eventName = eventName;
    post.onreadystatechange = requestHandler.call(post);
    post.send(strData);
}

// API call for local hotel information via Expedia API
function hotelRequest(lat,longitude,event,requestHandler) {
    var xhr = new XMLHttpRequest();
    var key = "B7IRgNygcFP70m4ghOe2zNuIbHhSUzdR";
    var url = "http://terminal2.expedia.com:80/x/hotels?maxhotels=10&";
    url += "location="+lat+"%2C"+longitude+"&radius=5km&";
    url += "checkInDate="+event.startYear+"-"+event.startMonth+"-"+event.startDate;
    url += "&checkOutDate="+event.endYear+"-"+event.endMonth+"-"+event.endDate+"&";
    url += "adults=1&sort=price&include=description%2C%20address%2C%20thumbnailurl%2C%20" + 
        "amenitylist%2C%20geolocation&allroomtypes=false";
    xhr.open("GET",url,true);
    xhr.eventName = event.name;
    xhr.setRequestHeader("Authorization","expedia-apikey key="+key);
    xhr.onreadystatechange = requestHandler.call(xhr);
    xhr.send();
}

// use local variables to fulfill argument requirements for makeFlightRequest
function makeFlightRequestForEvent(event) {
    if(event.locationCountry !== "USA") {
        return;
    }
    
    var passengerCount = document.getElementById('passengerCount').value;
    var budget = "USD"+document.getElementById('budget').value;
    var departingAirport = locations.user.Airports[0][0].code;
    var arrivalAirport = event.ArrivalAirports[0][0].code;
    var e = event;
    var eventDate = e.startYear+"-"+e.startMonth+"-"+e.startDate;
    var eventEndDate = e.endYear+"-"+e.endMonth+"-"+e.endDate;
    makeFlightRequest(
        passengerCount, 
        departingAirport, 
        arrivalAirport, 
        eventDate, 
        eventEndDate, 
        budget, 
        e.name);
}

// Callbacks ---------------------------------------------------------------------------------------

// iterate through selectedEvents
// create callbackName for use in airportRequest
function createEventCallbacks(selectEvents) {
    for(var i = 0; i < selectEvents.length; i++) {
        (function (j) {
            selectEvents[j].callbackName = "selectedEvents[" + j + "].callback";
            selectEvents[j].callback = function(data) {
                selectEvents[j].ArrivalAirports = [];
                selectEvents[j].ArrivalAirports.push(data.airports);
                makeFlightRequestForEvent(selectEvents[j]);
                makeHotelRequest(
                    selectEvents[j].locationLatitude, 
                    selectEvents[j].locationLongitude, 
                    selectEvents[j]);
            }
        })(i);
    }
}

// create callback for readyState change to handle retrieved JSON from API call
function makeJSONRequestHandler(successCallback, failCallback) {
    return function() {
        // this refers to the xhr object
        var obj = this;
        return function() {
            if(obj.readyState == 4 && obj.status == 200) {
               var data = JSON.parse(obj.responseText);
               successCallback.call(obj, data);
            }
        }
    }
}

// find the correct event object with eventName and save flight information
function storeFlightForEvent(flight, eventName) {
    console.log('storeFlightForEvent')
    each(selectedEvents, function(event, index, collection) {
        if(event.name == eventName) {
           event.flightINFO = flight;
        }
    });
}

// find the correct event object with eventName and save Hotel information
function storeHotelForEvent(hotel, eventName){
    console.log('storeHotelForEvent')
    each(selectedEvents, function(event, index, collection) {
        if(event.name == eventName) {
           event.hotelInfo = hotel;
        }
    });
}

// using the eventName argument - iterate through selectedEvents array and return the hotel 
// information saved to that key
function getHotelForEvent(eventName) {
    /*var eventsArray = filter(selectedEvents, function(element, index, collection) {
        return (element.name == eventName);
    });
    return eventsArray[0].hotelINFO;*/
    for(var i = 0; i < selectedEvents.length; i++) {
        if(selectedEvents[i].name == eventName) {
            return selectedEvents[i].hotelInfo;
        }
    }
    return null;
}

// store the user's retrieved geocoded location 
// using this information, call airportForLocationRequest
function userLocationCallback(data) {
    locations.user = {};
    locations.user.lat = data.results[0].geometry.location.lat;
    locations.user.lng = data.results[0].geometry.location.lng;
    airportForLocationRequest(locations.user.lat, locations.user.lng, "userAirportCallback");
}

// user's origin airport information retrieved and stored in this callback
// call airportsForEventsRequest
function userAirportCallback(data) {
    locations.user.Airports = [];
    locations.user.Airports.push(data.airports);
    airportsForEventsRequests();
}

// store parsed JSON in parsedFlight
// call sotreFlightForEvent to store flight information on event
// call displayFlight to deliver information to the user
function flightRequestCallback(data) {
    var parsedFlight = parseFlight(data);
    if (parsedFlight != null) {
        storeFlightForEvent(parsedFlight, this.eventName);
        displayFlight(parsedFlight, this.eventName);
    }
}

// store parsed JSON in parsedHotel
// call storeHotelForEvent to store hotel information on event
function hotelRequestCallback(data) {
    var parsedHotel = parseHotel(data);
    if(parsedHotel != null) {
        storeHotelForEvent(parsedHotel, this.eventName);
    }
}

// function to toggle the visibility of elements in the DOM
function toggle(element) {
    if (element.style.display == "block") {
        element.style.display = "none";
    }
    else {
        element.style.display = "block";
    }
} 

// UI ----------------------------------------------------------------------------------------------


// call createUI when upon page loading
document.addEventListener("DOMContentLoaded", function() {
    createUI();
});

// create progress bar
function createProgressBar(){
    var container = document.getElementById('progressDiv');
    console.log(container)
    var div = document.createElement('div');
    div.className = "progress";
    var div2 = document.createElement('div');
    div2.id = "progressBar";
    div2.className = "progress-bar progress-bar-success";
    div2.setAttribute('role', 'progressbar');
    div2.setAttribute('aria-valuenow','0');
    div2.setAttribute('aria-valuemin','0');
    div2.setAttribute('aria-valuemax','100');
    div2.setAttribute('style','width:0%');
    div2.innerHTML = "Submit data to begin.";

    div.appendChild(div2);
    container.appendChild(div);
}

// function that modifies the progress bar to communicate to the user where in the process their 
// request is being completed
function incrementProgressBar(percent,width,innerHTML) {
    var div = document.getElementById('progressBar');
    div.setAttribute('aria-valuenow', percent);
    div.setAttribute('style', width);
    div.innerHTML = innerHTML;
    div.className = "progress-bar progress-bar-striped active";
}

// create thumbnail element that will appear in the grid
// that allows the user to choose their event to search for.
// example:
/*
<div class="col-md-3 portfolio-item">
    <a class="thumbnail" href="#">
        <img class="col-sm-4" src="http://capcomprotour.com/wp-content/uploads/2014/02/
        final-round.jpg" alt="Final Round" height="750" width="400">
        <h5>Final Round</h5>
    </a>
</div>
*/
function createThumbnail(event, row) {
    var src = event.imageSrc;  
    var alt = event.imageAlt;
    var imageDivClass = "col-md-3 portfolio-item";
    var imageDivClassSelected = "col-md-3 portfolio-item bg-success";
    //var imageDivClassSelected = "col-lg-3 col-md-4 col-xs-6 thumb bg-success";
    var imageClass = "col-sm-4";
    
    var thumbDiv = document.createElement("div");
    thumbDiv.setAttribute("class", imageDivClass);
    
    var anchorDiv = document.createElement("a");
    anchorDiv.setAttribute("class", "thumbnail");
    anchorDiv.setAttribute("href", "#");
    
    var imgDiv = document.createElement("img");
    imgDiv.setAttribute("class", imageClass);
    imgDiv.setAttribute("src", src);
    imgDiv.setAttribute("alt", alt);
    imgDiv.setAttribute("height","750");
    imgDiv.setAttribute("width","400");

    var eventName = document.createElement('h5');
    eventName.innerHTML = event.name;
    
    thumbDiv.addEventListener("click", function() {
        var classString = this.getAttribute("class");
        if (classString == imageDivClass) {
            this.setAttribute("class", imageDivClassSelected);
        } else {
            this.setAttribute("class", imageDivClass); 
        }
    });
    
    thumbDiv.appendChild(anchorDiv);
    anchorDiv.appendChild(imgDiv);
    anchorDiv.appendChild(eventName)
    row.appendChild(thumbDiv);
}


function createUI() {
    createThumbnailGrid();
    createProgressBar();

    var submitButton = document.getElementById("submitButton");
    submitButton.addEventListener("click", submitMain);
}

/* create a selection of thumbnails to be delivered to the DOM
    // For example:
    <div class="eventThumbnails row row-eq-height">
    <div class="col-md-3 portfolio-item">
    <a class="thumbnail" href="#">
    <img class="col-sm-4" src="http://capcomprotour.com/wp-content/uploads/2014/02/final-round.jpg" 
        alt="Final Round" height="750" width="400">
    <h5>Final Round</h5>
    </a>
    </div>
    <div class="col-md-3 portfolio-item"><a class="thumbnail" href="#">
    <img class="col-sm-4" src="http://capcomprotour.com/wp-content/uploads/2016/02/
        norcal-regionals-2016.jpg" alt="NorCal Regionals" height="750" width="400">
        <h5>NorCal Regionals</h5>
    </a>
    </div>
    <div class="col-md-3 portfolio-item"><a class="thumbnail" href="#">
    <img class="col-sm-4" src="http://capcomprotour.com/wp-content/uploads/2016/02/
        west-coast-warzone-5.jpg" alt="West Coast Warzone" height="750" width="400">
    <h5>West Coast Warzone</h5>
    </a>
    </div>
    */
function createThumbnailGrid() {
    var container = document.getElementById("container")
    var row = document.getElementById("row");
    var imageDivClass = "col-md-3 portfolio-item";
    //var imageDivClassSelected = "col-lg-3 col-md-4 col-xs-6 thumb bg-success";
    var imageDivClassSelected = "col-md-3 portfolio-item bg-success"
    var imageClass = "col-sm-4";
    //  create Date
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1;
    var yyyy = today.getFullYear();
    for (var i = 0; i < events.length; i += 4) {
        var row = document.createElement('div');
        row.className = "eventThumbnails row row-eq-height";
        if(events[i].startYear == yyyy && events[i].startMonth >= mm && events[i].startDate >= dd) {
            var event = events[i];
            var src = event.imageSrc;  
            var alt = event.imageAlt;
            
            for (var j = 0; j < 4; j++) {
                if (events[i+j])
                    createThumbnail(events[i+j], row);
            }          
            container.appendChild(row);
        }
    }
}

// obtain user input values by referencing elements in the DOM
function getUserValues() {
    var values = {}
    values.zipCode = document.getElementById("inputZip").value;
    values.budget = document.getElementById("budget").value;
    values.passengerCount = document.getElementById("passengerCount").value;
    values.earliestDepartureTime = document.getElementById("earliestDepartureHour").value+":"+
        document.getElementById("earliestDepartureMinutes").value;
    values.latestDepartureTime = document.getElementById("latestDepartureHour").value+":"+
        document.getElementById("latestDepartureMinutes").value;
    var budget = true;
    var passengerCount = true;
    
    var isValidZipCode = validateZIP(values.zipCode);
    var isValidBudget = validateBudget(values.budget);
    var isValidPassengerCount = validatePassengerCount(values.passengerCount);

    var isValid = every([isValidZipCode, isValidBudget, isValidPassengerCount], function(parameter){
        return parameter;
    });

    if(isValid)
        return values;
    else
        return null;
}

// define the container by referencing the DOM
// using the defined container call createFlightDiv
function displayFlight(flight, eventName) {
    containerDiv = document.getElementById("output");
    createFlightDiv(containerDiv, flight, eventName, events);
}

// define the container by referncing the DOM
// using the defined container call createHotelDiv
function displayHotel(hotel, eventName) {
    containerDiv = document.getElementById("output");
    createHotelDiv(containerDiv, hotel, eventName, events);
}

// using the parsed information deliver pertinent information to the DOM
function createFlightDiv(containerDiv,flight,eventName,events) {
    // Create outer div
    var div1 = document.createElement('div');
    div1.className = "FlightDivContainer ";
    // Create "Header" div
    var div2 = document.createElement("div");
    // Implement anchor and anchor text
    var a = document.createElement('a');
    a.id = "anchor"+i;
    a.innerHTML = eventName;

    // Create Flight Info Div
    var FlightInfoDiv = document.createElement('div');
    var carrier = document.createElement('p');
    var flightNumber = document.createElement('p');
    var arrivalTime = document.createElement('p');
    var departureTime = document.createElement('p');
    var origin = document.createElement('p');
    var destination = document.createElement('p');
    var returnCarrier = document.createElement('p');
    var returnFlightNumber = document.createElement('p');
    var returnArrivalTime = document.createElement('p');
    var returnDepartureTime = document.createElement('p');
    var returnOrigin = document.createElement('p');
    var returnDestination = document.createElement('p');
    var saleTotal = document.createElement('p');

    // for(var i = 0; i < selectedEvents.length; i++){
        
        var dataDiv = document.createElement('div');
        // dataDiv.id = "showHideFlightDiv"+i
        dataDiv.className = "well";
        (function(id) {
        a.addEventListener("click", function() {
        toggle(id);
        });
        })(dataDiv)  


        FlightInfoDiv.appendChild(div2);
        div2.appendChild(a)
        div2.appendChild(dataDiv)
        
        dataDiv.appendChild(carrier);
        dataDiv.appendChild(flightNumber);
        dataDiv.appendChild(arrivalTime);
        dataDiv.appendChild(departureTime);
        dataDiv.appendChild(origin);
        dataDiv.appendChild(destination);
        dataDiv.appendChild(saleTotal);
        FlightInfoDiv.appendChild(dataDiv);
        div1.appendChild(FlightInfoDiv);
        containerDiv.appendChild(div1);

        dataDiv.appendChild(returnFlightNumber);
        dataDiv.appendChild(returnArrivalTime);
        dataDiv.appendChild(returnDepartureTime);
        dataDiv.appendChild(returnOrigin);
        dataDiv.appendChild(returnDestination);


        carrier.textContent = "The flight carrier is: " + flight[0].carrier;
        flightNumber.textContent = "The flight number is: " + flight[0].number;
        arrivalTime.textContent = "The arrival time is: " +  flight[0].arrivalTime;
        departureTime.textContent = "The departure time is: " + flight[0].departureTime;
        origin.textContent = "The origin is: " + flight[0].origin ;
        destination.textContent = "The destination is: " + flight[0].destination;

        returnCarrier.textContent = "The return flight carrier is: " + flight[1].carrier;
        returnFlightNumber.textContent = "The return flight number is: " + flight[1].number;
        returnArrivalTime.textContent = "The return arrival time is: " +  flight[1].arrivalTime;
        returnDepartureTime.textContent = "The return departure time is: " 
            + flight[1].departureTime;
        returnOrigin.textContent = "The return origin is: " + flight[1].origin ;
        returnDestination.textContent = "The return destination is: " + flight[1].destination;
        saleTotal.textContent = "The return sale total is: " + flight[0].saleTotal;
       
       var hotel = getHotelForEvent(eventName);
       var detailsURLAnchor = document.createElement('a');
        detailsURLAnchor.setAttribute("href", hotel[0].details);
        detailsURLAnchor.innerHTML = "Hotel Details and Booking Here!"
        dataDiv.appendChild(detailsURLAnchor);
}

// upon submitting user selected values in the DOM - adjust presented text to better inform the user
function replaceText(){
    document.getElementById('resultsDiv').innerHTML = "These are the event(s) you have selected";
    document.getElementById('instructionalPrompt').innerHTML = "The flight information" +
        " you provided is as follows";
    document.getElementById('output').innerHTML = "Your information as requested:";
}

// using the parsed information deliver pertinent information to the DOM
function createHotelDiv(containerDiv, data) {
    var div1 = document.createElement('div');
    div1.className = "HotelDivContainer";

    // Create Hotel Info Div
    var hotelInfoDiv = document.createElement('div');
    var hotelName = document.createElement('h1');
    var hotelPrice = document.createElement('h1');
    var hotelAmenities = document.createElement('h1');
    var detailsURLAnchor = document.createElement('a');
    detailsURLAnchor.setAttribute("href", data[0].details);
    detailsURLAnchor.innerHTML = "More Details and Booking Here!";

    // Append Div
    hotelInfoDiv.appendChild(hotelName);
    hotelInfoDiv.appendChild(hotelPrice);
    hotelInfoDiv.appendChild(hotelAmenities);
    hotelInfoDiv.appendChild(detailsURLAnchor);
    containerDiv.appendChild(HotelInfoDiv);

    hotelName.textContent = "the hotel name is " + data[0].name;
    hotelPrice.textContent = "the hotel price is " + data[0].price;
    hotelAmenities.textContent = "the amenities include " +  data[0].amenities;
}

    
// Input Validation/Data packaging------------------------------------------------------------------

// store pertinent information of the retrieved JSON via API call
function parseFlight(data) {
    var flight =[]

    if (!data.trips.tripOption) {
        return null;
    }

    var destinationFlight = {
        "carrier": data.trips.tripOption[0].slice[0].segment[0].flight.carrier,
        "number": data.trips.tripOption[0].slice[0].segment[0].flight.number,
        "arrivalTime": data.trips.tripOption[0].slice[0].segment[0].leg[0].arrivalTime,
        "departureTime": data.trips.tripOption[0].slice[0].segment[0].leg[0].departureTime,
        "origin" : data.trips.tripOption[0].slice[0].segment[0].leg[0].origin,
        "destination" : data.trips.tripOption[0].slice[0].segment[0].leg[0].destination,
        "saleTotal" : data.trips.tripOption[0].pricing[0].saleTotal,
    };
    var returnFlight = {
        "carrier": data.trips.tripOption[0].slice[1].segment[0].flight.carrier,
        "number": data.trips.tripOption[0].slice[1].segment[0].flight.number,
        "arrivalTime": data.trips.tripOption[0].slice[1].segment[0].leg[0].arrivalTime,
        "departureTime": data.trips.tripOption[0].slice[1].segment[0].leg[0].departureTime,
        "origin" : data.trips.tripOption[0].slice[1].segment[0].leg[0].origin,
        "destination" : data.trips.tripOption[0].slice[1].segment[0].leg[0].destination,
        "saleTotal" : data.trips.tripOption[0].pricing[0].saleTotal,
    };
    flight.push(destinationFlight);
    flight.push(returnFlight);
    return flight;
}

// store pertinent Hotel information of the retrieved JSON via API call
function parseHotel(data){
    var hotel = [];
    if(!data.HotelCount){
        return null
    }

    var validHotel1 = {
        "name" : data.HotelInfoList.HotelInfo[0].Name,
        "price" : data.HotelInfoList.HotelInfo[0].Price.TotalRate.Currency + " " + 
            data.HotelInfoList.HotelInfo[0].Price.TotalRate.Value,
        "thumbnailURL" : data.HotelInfoList.HotelInfo[0].ThumbnailUrl,
        "details" : data.HotelInfoList.HotelInfo[0].DetailsUrl
    }

    var validHotel2 = {
        "name" : data.HotelInfoList.HotelInfo[1].Name,
        "price" : data.HotelInfoList.HotelInfo[1].Price.TotalRate.Currency + " " + 
            data.HotelInfoList.HotelInfo[1].Price.TotalRate.Value,
        "thumbnailURL" : data.HotelInfoList.HotelInfo[1].ThumbnailUrl,
        "details" : data.HotelInfoList.HotelInfo[1].DetailsUrl
    }

    var validHotel3 = {
        "name" : data.HotelInfoList.HotelInfo[2].Name,
        "price" : data.HotelInfoList.HotelInfo[2].Price.TotalRate.Currency + " " + 
            data.HotelInfoList.HotelInfo[2].Price.TotalRate.Value,
        "thumbnailURL" : data.HotelInfoList.HotelInfo[2].ThumbnailUrl,
        "details" : data.HotelInfoList.HotelInfo[2].DetailsUrl
    }
    hotel.push(validHotel1, validHotel2, validHotel3);
    return hotel;
}

// validate the user provided zipcode
// alert the user in instances where user provided data is not acceptable
function validateZIP(field) {
    var valid = "0123456789-";
    var hyphencount = 0;

    if (field.length!=5 && field.length!=10) {
        alert("Please enter your 5 digit or 5 digit+4 zip code.");
        return false;
    }
    for (var i=0; i < field.length; i++) {
        temp = "" + field.substring(i, i+1);
        if (temp == "-") hyphencount++;
        if (valid.indexOf(temp) == "-1") {
        alert("Invalid characters in your zip code.  Please try again.");
        return false;
    }
    if ((hyphencount > 1) || ((field.length==10) && ""+field.charAt(5)!="-")) {
    alert("The hyphen character should be used with a properly formatted 5 digit+four zip code," +
        " like '12345-6789'.   Please try again.");
    return false;
    }
    }
    return true;
}

// validate user provided budget
// alert the user in instances where user provided data is not acceptable
function validateBudget(input){
    if(isNaN(input)){
        alert("your listed budget is not a numerical value");
        return false;
    }
    var input = Number(input);
    if(input <= 0){
        alert("budget must be greater than 0");
        return false;
    }
    return true;
}

// validate user provided passenger count
// alert the user in instances where user provided data is not acceptable
function validatePassengerCount(input){
    if(input.length != 1){
        alert("your selected passengers is not a recognized value");
        return false;
    }
    var input = Number(input);
    if(isNaN(input)){
        alert("your selected passengers is not a numerical value");
        return false;
    }
    else if(input > 0){
        return true;
    }
    else{
        alert("input must be greater than 0");
        return false;
    }
}

// Utilities ---------------------------------------------------------------------------------------

function every(array, predicate) {
    for(var i = 0; i < array.length; i++){
        if(predicate(array[i]) != true){
            return false;
        }
    }
    return true;
}

// TODO comment - describe the purpose
// callback is a function that takes as arguments the item, the index, and the collection.
function each(collection, callback) {
    if(Array.isArray(collection)) {
        for(var i = 0; i < collection.length; i++){
            callback(collection[i],i,collection);
        }
    } else if(typeof collection === 'object'){
        for(var key in collection) {
            callback(collection[key],key,collection);
        }
    }
    return collection;
}


function findEvent(element) {
    // search through events for the alt tag in element
    var alt = element.childNodes[0].childNodes[0].getAttribute("alt");
    for (var i = 0; i < events.length; i++) {
       if (alt == events[i].imageAlt) 
          return events[i];
    }
    return null;
}

function map(array, f) {
    var results = [];
    for(var i = 0; i < array.length; i++){
        results.push(f(array[i]));
    }
    return results;
}

function filter(array, test){
    var passed = [];
    for(var i = 0; i < array.length; i++){
    if(test(array[i]))
        passed.push(array[i]);
    }
    return passed
}


// search the div's elements to determine whether thumbnail was selected based on its class name
// if the class name matches the class name that our onClick event sets the class name to be
// store that element in selectedElement
/*function search(div) {
    //var selectedElements = []
    var row = div;
    var els = row.childNodes;
    console.log(els)
    each(els, function(item, index, collection) {
        var el = item
        if(el.nodeType == 1){
            var className = el.getAttribute("class");
            console.log(className)
            if (className == "col-md-3 portfolio-item bg-success") {
                console.log(el)
                selectedElements.push(el);
            }
        }
    });
    console.log(selectedElements);
    return selectedElements;
};*/

// store that element in selectedElement
function search(div) {
    //var selectedElements = []
    var row = div;
    var els = row.childNodes;
    console.log("k")
    selectedElements = filter(els, function(item, index, collection) {
    if (item.nodeType == 1) {
      var className = item.getAttribute("class");
      if (className == "col-md-3 portfolio-item bg-success") {
        console.log('conditional')
         return true;
      } 
   }   
   return false;
});
return selectedElements;
};


/*function searchMacro(){
    console.log('searchMacro')
    var array = document.getElementsByClassName("eventThumbnails")                      
    var newArray = [];
    for(var i = 0; i < array.length;i++){
        newArray = newArray.concat(search(array[i])); 
    }
    return newArray;
}*/


function searchMacro(){
    var array = document.getElementsByClassName("eventThumbnails")                      
    var newArray = [];
    each(array,function(item,index,collection){
        newArray = newArray.concat(search(item)); 
    });
    return newArray;
}

// create new array to contain all user selected events
// iterate through selectedElements
// conditional to compare the attribute of childNode to object key 
// if true - push event to new array 
/*function searchSelectedElements(selectedElements) {
    var eventsSelected = [];
    for(var i = 0; i < selectedElements.length; i++) {
        if(selectedElements[0].childNodes[0].childNodes[0].getAttribute("alt") == 
                events[i].imageAlt) {
            eventsSelected.push(events[i]);
        }

    }
    return eventsSelected;
}*/

// iterate through the eventsSelected array
// if the attribute at the index of the selectedElements matches the attribute of selectedElements
// push the index of the selected elements to the new array eventsSelected
// effectively we are identifying the event desired by the element our user clicked
function searchSelectedElements(selectedElements) {
    var eventsSelected = [];
    each(selectedElements,function(item,index, collection) {
        if(selectedElements[0].childNodes[0].childNodes[0].getAttribute("alt") == 
                selectedElements.imageAlt) {
            eventsSelected.push(selectedElements);
        }
    });
    console.log('eventsSelected')
    return eventsSelected;
}

// function to iterate through identified DOM elements and remove them based on class identifier
function searchToDelete() {
    var row = document.getElementById("row");
    var els = row.childNodes;
    for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if(el.nodeType == 1){
            var className = el.getAttribute("class");
            if (className == "col-lg-3 col-md-4 col-xs-6 thumb") {
                row.removeChild(el);
                i--;
            }
        }
    }
}

// Toggle the disabled and active state of the submit button
// Change the appearance of the submit button to reflect its active or disabled state
function toggleSubmitButton(){
    var submitButton = document.getElementById('submitButton');
    if(submitButton.getAttribute("aria-pressed") == "false"){
        submitButton.setAttribute("aria-pressed","true");
        submitButton.setAttribute("disabled", "true");
    }
    else{
        submitButton.setAttribute("aria-pressed","true");
        submitButton.setAttribute("disabled", "false");
    }
}

function submitMain() {
    toggleSubmitButton()
    incrementProgressBar("5%", "width:5%", "5%");
    var selectedElements = searchMacro();
    selectedEvents = map(selectedElements, findEvent);
    var userValues = getUserValues();
    if(userValues != null){
        createEventCallbacks(selectedEvents);
        startRequests(userValues);
        searchToDelete();
        replaceText();
    }
}
