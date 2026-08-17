import { render } from 'solid-js/web';
import './styles/global.css';
import AppRouter from './routes';


const root = document.getElementById('root');

if (root) {
  render(() => (
    <AppRouter />
  ), root);
}
