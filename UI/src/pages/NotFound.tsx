import { A } from "@solidjs/router";

function NotFound() {
  return (
    <div class="empty-state">
      <h2>404</h2>
      <p>This page doesn't exist.</p>
      <A href="/" class="btn btn-primary">
        Back to Collections
      </A>
    </div>
  );
}

export default NotFound;
