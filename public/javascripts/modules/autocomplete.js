function autocomplete(input, latInput, lngInput) {
  if (!input) return; // skips this function from running if there is no input on the page
  const dropdown = new google.maps.places.Autocomplete(input);
  dropdown.addListener("place_changed", () => {
    const place = dropdown.getPlace();
    const lat = latInput;
    const lng = lngInput;
    lat.value = place.geometry.location.lat();
    lng.value = place.geometry.location.lng();
  });
  // If someone hits enter on the address field, don't submit the form
  input.on("keydown", e => {
    if (e.keyCode === 13) e.preventDefault();
  });
}

export default autocomplete;
