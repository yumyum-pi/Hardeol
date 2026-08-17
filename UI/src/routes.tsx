import { Router, Route } from "@solidjs/router";
import { CollectionEditor } from "./pages/collectionEditor";
import { CollectionView } from "./pages/CollectionView";
import Layout from "./layout";
import HomePage from "./pages/home";

const AppRouter = () => (
  <Router root={Layout}>
    <Route path="/" component={HomePage} />
    <Route path="/collection/:name" component={CollectionView} />
    <Route path="/new" component={CollectionEditor} />
    <Route path="/collection/:name/edit" component={CollectionEditor} />
  </Router>
)

export default AppRouter;
