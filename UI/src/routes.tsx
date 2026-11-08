import { Router, Route } from "@solidjs/router";
import Layout from "./layout";
import HomePage from "./pages/home";
import NotFound from "./pages/NotFound";
import { CollectionView } from "./pages/collection/listing";
import { CollectionEditor } from "./pages/collection/editor";
import { RecordFormPage } from "./pages/collection/records";
import { TableViewsPage } from "./pages/collection/table-views";
import { FormViewsPage } from "./pages/collection/form-views";
import { ValidationPage } from "./pages/collection/validation";
import { FormViewEditor } from "./pages/collection/form-views/form-view-editor";
import { TableViewEditor } from "./pages/collection/table-views/table-view-editor";

const AppRouter = () => (
  <Router root={Layout}>
    <Route path="/" component={HomePage} />
    <Route path="/collection/:name" component={CollectionView} />
    <Route path="/collection/new" component={CollectionEditor} />
    <Route path="/collection/:name/edit-schema" component={CollectionEditor} />
    <Route path="/collection/:name/records/new" component={RecordFormPage} />
    <Route path="/collection/:name/records/:id/edit" component={RecordFormPage} />
    <Route path="/collection/:name/table-views" component={TableViewsPage} />
    <Route path="/collection/:name/table-views/:viewID" component={TableViewEditor} />
    <Route path="/collection/:name/form-views" component={FormViewsPage} />
    <Route path="/collection/:name/form-views/:formID" component={FormViewEditor} />
    <Route path="/collection/:name/manage-validation" component={ValidationPage} />
    <Route path="*404" component={NotFound} />
  </Router>
)

export default AppRouter;
