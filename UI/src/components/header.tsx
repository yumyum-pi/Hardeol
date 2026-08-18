import { useNavigate } from "@solidjs/router";
import { children, JSXElement, Show } from "solid-js";

type HeaderProp = {
  back?: boolean;
  backFn?: () => void;
  title: string;
  children?: JSXElement | JSXElement[];
}
const Header = (props: HeaderProp) => {
  const navigate = useNavigate();
  const defaultBack = () => {
    navigate(-1)
  };
  const { back = false, backFn = defaultBack } = props;

  const safeChildren = children(() => props.children)
  return (
    <header class="page-header">
      <div class="header-left">
        <Show when={back}>
          <button class="btn btn-text" onClick={backFn}>
            {'<'}
          </button>
        </Show>
        <h2>{props.title}</h2>
      </div>
      <div class="header-actions">
        {safeChildren()}
      </div>
    </header>
  )
}

export default Header;
