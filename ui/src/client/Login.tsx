import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login(){

    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async () => {
        const input = {
            name: username,
            password: password
        }
        const query = `query Query($input: userInput) {
            Users(input: $input)
        }`
        const response = await fetch('/graphql', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query, variables:{input}})
        });
        const result = await response.json();
        if(!result.data.Users){
            setError("Invalid username or password");
        }
        else{
            localStorage.setItem('user', JSON.stringify({
                name: result.data.Users
            }));
            setError("");
            navigate('/');
        }
    }

    return(
        <>
        <form className="detailForm" name="login" method="POST" onSubmit={(e: React.FormEvent)=>{e.preventDefault();
            handleLogin();
        }}>
            <div className="details">
                <h2>Sign In</h2>
                <div>
                    <label htmlFor="username">Username:</label>
                    <input type="text" name="username" id="username" 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>)=>{setUsername(e.target.value)}} 
                            required/>
                    
                    <label htmlFor="password">Password:</label>
                    <input type="password" name="password" id="password"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>)=>{setPassword(e.target.value)}} 
                            required/>
                </div>
                <div>
                    <input type="submit" value='Submit' />
                    <button onClick={()=>{navigate('/register')}} >Register</button>
                    <p className="error">{error}</p>
                </div>
            </div>
            <div className="title" >
                <h1>ChatApp</h1>
            </div>
        </form>
        </>
    );
}

export default Login;
