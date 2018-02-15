import axios from "axios";
import { $ } from "./bling";

const mapOptions = {
  center: {
    lat: 43.25,
    lng: -79.820
  },
  zoom: 12
};

function loadPlaces(map, lat = mapOptions.center.lat, lng = mapOptions.center.lng) {
  // function loadPlaces(map, { lat, lng } = mapOptions.center) {
  axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`)
    .then(res => {
      const places = res.data;
      if (!places.length) {
        const inner = $(".inner__map");
        const mapNode = $(".map");
        const warnDivClass = $(".warning");
        if (!warnDivClass) {
          const warnDiv = document.createElement("div");
          warnDiv.className = "warning";
          warnDiv.style.fontSize = "25px";
          warnDiv.style.paddingBottom = "10px";
          warnDiv.style.color = "red";
          const warnText = document.createTextNode("No places Found!");
          warnDiv.appendChild(warnText);
          inner.insertBefore(warnDiv, mapNode);
          setTimeout(() => {
            warnDiv.remove();
          }, 5000);
        }
        return;
      }
      // create a bounds so the map auto zooms to the max level whilst showing all markers
      const bounds = new google.maps.LatLngBounds();
      const infoWindow = new google.maps.InfoWindow();

      const markers = places.map(place => {
        const [placeLng, placeLat] = place.location.coordinates;
        const position = { lat: placeLat, lng: placeLng };
        bounds.extend(position);
        const marker = new google.maps.Marker({ map, position });
        marker.place = place;
        return marker;
      });
      // when someone clicks on a mark, show the details of that marker
      markers.forEach(marker => marker.addListener("click", function () {
        console.log(this.place);
        const html = `
        <div class="popup" style="width:220px">
          <a href="/store/${this.place.slug}">
            <img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.name}" />
            <p>${this.place.name} - ${this.place.location.address}</p>
          </a>
        </div >
        `;
        infoWindow.setContent(html);
        infoWindow.open(map, marker);
        console.log(this.place);
      }));

      // after looping over markers, zoom map using bounds
      map.setCenter(bounds.getCenter());
      map.fitBounds(bounds);
    });
}

function makeMap(mapDiv) {
  if (!mapDiv) return;

  function generateMap() {
    const map = new google.maps.Map(mapDiv, mapOptions);
    loadPlaces(map);
    const input = $("[name='geolocate']");
    input.value = "";
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
    });
  }

  navigator.geolocation.getCurrentPosition(pos => {
    mapOptions.center.lat = pos.coords.latitude;
    mapOptions.center.lng = pos.coords.longitude;
    generateMap();
  }, err => generateMap());
}

export default makeMap;
