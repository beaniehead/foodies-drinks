import axios from "axios";
import dompurify from "dompurify";

function searchResultsHTML(stores) {
  return stores.map(store =>
    `<a href="/store/${store.slug}" class="search__result">
      <strong>${store.name}</strong>
      <p style="font-size:0.9em">${(store.description).substring(0, 80)}...</p>
    </a>
    `)
    .join("");
}

function typeAhead(search) {
  if (!search) return;
  const searchInput = search.querySelector("input[name='search']");
  searchInput.value = "";
  const searchResults = search.querySelector(".search__results");
  // 'on' is Bling shortcut for addEventListener
  searchInput.on("input", function () {
    // If there is no value, quit it!
    if (!this.value) {
      searchResults.style.display = "none";
      return; // stop;
    }
    // show the search results
    searchResults.style.display = "block";
    searchResults.innerHTML = dompurify.sanitize("");
    axios
      .get(`/api/search?q=${this.value}`)
      .then(res => {
        if (res.data.length) {
          searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(res.data));
          // Change result class on hover
          const items = search.querySelectorAll(".search__result");
          items.forEach(item => item.addEventListener("mouseover", () => {
            items.forEach(itemOver => itemOver.classList.remove("search__result--active"));
            item.classList.add("search__result--active");
          }));
          return;
        }
        // Tell them nothing came back
        searchResults.innerHTML = dompurify.sanitize(`<div class="search__result">No result for ${this.value} found!</div>`);
      })
      .catch(err => console.log(err));
  });
  // Handle keyboard input

  searchInput.on("keyup", e => {
    // If they are not pressing up, down or enter, then skip
    if (![38, 40, 13].includes(e.keyCode)) {
      return; // Skip it
    }
    const activeClass = "search__result--active";
    const current = search.querySelector(`.${activeClass}`);
    const items = search.querySelectorAll(".search__result");
    let next;
    // Down
    if (e.keyCode === 40 && current) {
      next = current.nextElementSibling || items[0];
    } else if (e.keyCode === 40) {
      [next] = items;
    } else if (e.keyCode === 38 && current) {
      next = current.previousElementSibling || items[items.length - 1];
      e.preventDefault();
    } else if (e.keyCode === 38) {
      next = items[items.length - 1];
    } else if (e.keyCode === 13 && current.href) {
      window.location.href = current.href;
      return;
    }
    items.forEach(item => item.classList.remove(activeClass));
    next.classList.add(activeClass);
  });
}

export default typeAhead;
