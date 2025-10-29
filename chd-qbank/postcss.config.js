import autoprefixer from "autoprefixer";
import tailwindcss from "./vendor/@tailwindcss/postcss/index.js";

export default {
  plugins: [tailwindcss(), autoprefixer()],
};
