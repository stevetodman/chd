import anchorHasHref from "./lib/rules/anchor-has-href.js";
import buttonHasAccessibleName from "./lib/rules/button-has-accessible-name.js";
import imgHasAlt from "./lib/rules/img-has-alt.js";

export const rules = {
  "anchor-has-href": anchorHasHref,
  "button-has-accessible-name": buttonHasAccessibleName,
  "img-has-alt": imgHasAlt
};

export const configs = {
  recommended: {
    plugins: ["jsx-a11y"],
    rules: {
      "jsx-a11y/anchor-has-href": "error",
      "jsx-a11y/button-has-accessible-name": "error",
      "jsx-a11y/img-has-alt": "error"
    }
  }
};

export default {
  rules,
  configs
};
