import { Router, Route } from "@solidjs/router";
import { CollectionEditor } from "./pages/collectionEditor";
import { CollectionView } from "./pages/CollectionView";
import Layout from "./layout";
import HomePage from "./pages/home";
import NotFound from "./pages/NotFound";

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
