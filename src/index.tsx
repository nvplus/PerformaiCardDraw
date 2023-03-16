import { App } from "./app";
import { render } from "react-dom";
import styles from "./app.css";
const appRoot = document.createElement("main");
document.body.prepend(appRoot);
appRoot.className = styles.main;
render(<App />, appRoot);
