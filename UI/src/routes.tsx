import { Router, Route } from "@solidjs/router";
import Layout from "./layout";
import HomePage from "./pages/home";
import NotFound from "./pages/NotFound";
import { CollectionView } from "./pages/collection/listing";
import { CollectionEditor } from "./pages/collection/editor";

const AppRouter = () => (
  <Router root={Layout}>
    <Route path="/" component={HomePage} />
    <Route path="/collection/:name" component={CollectionView} />
    <Route path="/collection/new" component={CollectionEditor} />
    <Route path="/collection/:name/edit-schema" component={CollectionEditor} />
    <Route path="*404" component={NotFound} />
  </Router>
)

export default AppRouter;
