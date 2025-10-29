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

function isEmptyAttributeValue(attr) {
  if (!attr || attr.value == null) {
    return true;
  }

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

const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce anchors have a valid href",
      recommended: true
    },
    schema: [],
    messages: {
      missingHref: "Anchor elements must have a non-empty href attribute."
    }
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = getName(node.name);
        if (name !== "a") return;

        const href = getAttribute(node, "href");
        if (!href || isEmptyAttributeValue(href)) {
          context.report({ node, messageId: "missingHref" });
        }
      }
    };
  }
};

export default rule;
