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

function hasNonEmptyAttribute(attr) {
  if (!attr || attr.value == null) return false;

  if (attr.value.type === "Literal") {
    return `${attr.value.value ?? ""}`.trim().length > 0;
  }

  if (attr.value.type === "JSXExpressionContainer") {
    const expression = attr.value.expression;
    if (!expression) return false;
    if (expression.type === "Literal") {
      return `${expression.value ?? ""}`.trim().length > 0;
    }
    return true;
  }

  return false;
}

function hasTextChildren(node) {
  if (!node.parent || !node.parent.children) {
    return false;
  }

  return node.parent.children.some((child) => {
    if (child.type === "JSXText") {
      return child.value.trim().length > 0;
    }
    if (child.type === "JSXExpressionContainer") {
      return child.expression != null && child.expression.type !== "JSXEmptyExpression";
    }
    return false;
  });
}

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce buttons have an accessible name",
      recommended: true
    },
    schema: [],
    messages: {
      missingAccessibleName: "Buttons must have discernible text or an accessible name."
    }
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = getName(node.name);
        if (name !== "button") return;

        if (
          hasNonEmptyAttribute(getAttribute(node, "aria-label")) ||
          hasNonEmptyAttribute(getAttribute(node, "aria-labelledby")) ||
          hasNonEmptyAttribute(getAttribute(node, "title")) ||
          hasTextChildren(node)
        ) {
          return;
        }

        context.report({ node, messageId: "missingAccessibleName" });
      }
    };
  }
};

export default rule;
