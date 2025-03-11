import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css"

function Register() {

    const navigate = useNavigate();

    const [error, setError] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rePassword, setRePassword] = useState("");

    const handleRegister = async() => {

        if(password !== rePassword){
            setError("Passwords don't match");
            return;
        }

        let query = `query Query($input: String!) {
            getUsernames(input: $input)
        }`;
        const response = await fetch("/graphql", {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query, variables:{input: username}})
        });
        const result = await response.json();
        const ind = result.data.getUsernames.findIndex((n:string) => n.toLowerCase() === username.toLowerCase());
        if(ind != -1){
            setError("Username already exists.");
            return;
        }

        const input = {
            name: username,
            password: password
        }

        query = `mutation Register($input: userInput) {
            Register(input: $input)
        }`;
        await fetch("/graphql", {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query, variables:{input}})
        });

        navigate('/login');

    }

    return (
        <>
        <form className="detailForm" name="login" method="POST" onSubmit={(e: React.FormEvent)=>{e.preventDefault();
            handleRegister();
        }}>
            <div className="details">
                <h2>Register</h2>
                <div>
                    <label htmlFor="username">Username:</label>
                    <input type="text" name="username" id="username" 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>)=>{setUsername(e.target.value)}} 
                            required/>
                    
                    <label htmlFor="password">Password:</label>
                    <input type="password" name="password" id="password"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>)=>{setPassword(e.target.value)}} 
                            required/>
                    
                    <ul>
                        <li>At least 7 character long</li>
                        <li>Must contain at least one UpperCase and one LowerCase letter</li>
                        <li>Must contain at least one symbol(~,!,@,#,$,%,^,&,*,(,))</li>
                        <li>Must contain at least one number</li>
                    </ul>

                    <label htmlFor="rePassword">Retype Password:</label>
                    <input type="password" name="rePassword" id="rePassword"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>)=>{setRePassword(e.target.value)}} 
                            required/>
                </div>
                <div>
                    <input type="submit" value='Submit' />
                    <button onClick={()=>{navigate('/login')}} >Sign In</button>
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

export default Register;
