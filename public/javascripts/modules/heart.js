import axios from "axios";
import { $ } from "./bling";

function heart(e) {
  e.preventDefault();
  // Posting with JS rather than having the html form POST
  axios
    .post(this.action)
    .then(res => {
      // below returns true or false depending on if the buttons is hearted
      const isHearted = this.heart.classList.toggle("heart__button--hearted");
      $(".heart-count").textContent = res.data.hearts.length;
      if (isHearted) {
        this.heart.classList.add("heart__button--float");
        // Use arrow function so this is not re-bound
        setTimeout(() => {
          this.heart.classList.remove("heart__button--float");
        }, 2000);
      }
    })
    .catch(console.error);
}

export default heart;
