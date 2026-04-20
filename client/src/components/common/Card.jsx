import { useRef } from "react";

function Card({
  children,
  title,
  subtitle,
  actions,
  className = "",
  interactive = true,
  as = "section",
  ...rest
}) {
  const cardRef = useRef(null);
  const Component = as;

  const classes = ["beacon-card", "depth-card"];
  if (interactive) {
    classes.push("is-interactive");
  }
  if (className) {
    classes.push(className);
  }

  return (
    <Component
      ref={cardRef}
      className={classes.join(" ")}
      {...rest}
    >
      {(title || subtitle || actions) && (
        <header className="card-header">
          <div>
            {title ? <h3 className="card-title">{title}</h3> : null}
            {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="card-actions">{actions}</div> : null}
        </header>
      )}
      <div className="card-body">{children}</div>
    </Component>
  );
}

export default Card;
