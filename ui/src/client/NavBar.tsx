import App from "./App"
import Login from "./Login";
import { Routes, Route } from "react-router-dom";
import Register from "./Register";

function NavBar(){

    return(
        <>
        <Routes>
            <Route path="/" element={<App />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
        </Routes>
        </>
    );
}

export default NavBar;