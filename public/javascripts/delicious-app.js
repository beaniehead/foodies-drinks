import "../sass/style.scss";
import typeAhead from "./modules/typeAhead";
import heart from "./modules/heart";
import autoComplete from "./modules/autocomplete";
import makeMap from "./modules/map";
import { $, $$ } from "./modules/bling";

autoComplete($("#address"), $("#lat"), $("#lng"));

typeAhead($(".search"));

makeMap($("#map"));

if ($$("form.heart")) {
  // With bling; using $$ you can add an event listener to multiple items in a nodelist rather than having to add using forEach
  $$("form.heart").on("submit", heart);
}
