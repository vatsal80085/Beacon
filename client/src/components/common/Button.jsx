const variantClassMap = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

const sizeClassMap = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

function Button({
  children,
  as: Component = "button",
  type = "button",
  variant = "primary",
  size = "md",
  className = "",
  loading = false,
  disabled = false,
  ...rest
}) {
  const classes = ["btn", variantClassMap[variant] ?? variantClassMap.primary, sizeClassMap[size] ?? sizeClassMap.md];

  if (className) {
    classes.push(className);
  }

  const sharedProps = {
    className: classes.join(" "),
    ...rest,
  };

  if (Component !== "button") {
    return (
      <Component {...sharedProps}>
        <span>{children}</span>
      </Component>
    );
  }

  return (
    <button type={type} disabled={disabled || loading} {...sharedProps}>
      {loading ? <span className="btn-loader" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}

export default Button;
