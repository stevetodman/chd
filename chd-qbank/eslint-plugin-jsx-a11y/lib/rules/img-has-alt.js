function getName(node) {
  if (node.type === "JSXIdentifier") return node.name;
  if (node.type === "JSXNamespacedName") return `${node.namespace.name}:${node.name.name}`;
  return null;
}

function getAttribute(node, name) {
  return node.attributes.find(
    (attr) => attr.type === "JSXAttribute" && attr.name && attr.name.name === name
  );
}

function isEmpty(attr) {
  if (!attr || attr.value == null) return true;

  if (attr.value.type === "Literal") {
    return `${attr.value.value ?? ""}`.trim() === "";
  }

  if (
    attr.value.type === "JSXExpressionContainer" &&
    attr.value.expression &&
    attr.value.expression.type === "Literal"
  ) {
    return `${attr.value.expression.value ?? ""}`.trim() === "";
  }

  return false;
}

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce <img> elements have alt text",
      recommended: true
    },
    schema: [],
    messages: {
      missingAlt: "Image elements must have an alt attribute providing alternative text."
    }
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = getName(node.name);
        if (name !== "img") return;

        const alt = getAttribute(node, "alt");
        if (!alt || isEmpty(alt)) {
          context.report({ node, messageId: "missingAlt" });
        }
      }
    };
  }
};
