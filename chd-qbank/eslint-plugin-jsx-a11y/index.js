const anchorHasHref = require("./lib/rules/anchor-has-href");
const buttonHasAccessibleName = require("./lib/rules/button-has-accessible-name");
const imgHasAlt = require("./lib/rules/img-has-alt");

module.exports = {
  rules: {
    "anchor-has-href": anchorHasHref,
    "button-has-accessible-name": buttonHasAccessibleName,
    "img-has-alt": imgHasAlt
  },
  configs: {
    recommended: {
      plugins: ["jsx-a11y"],
      rules: {
        "jsx-a11y/anchor-has-href": "error",
        "jsx-a11y/button-has-accessible-name": "error",
        "jsx-a11y/img-has-alt": "error"
      }
    }
  }
};
