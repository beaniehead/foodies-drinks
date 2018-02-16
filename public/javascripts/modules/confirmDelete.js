import { $ } from "./bling";

function confirmDelete(e) {
  e.preventDefault();
  console.log(e);
  $("#confirm__button").setAttribute("style", "visibility: visible; padding:10px; height:50px;");
}

export default confirmDelete;
