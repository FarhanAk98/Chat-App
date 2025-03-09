import ChatScreen from './ChatScreen';
import './App.css'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

const apolloClient = new ApolloClient({
    cache: new InMemoryCache(),
    uri: '/graphql'
});

type userType = {
    name: string
}

function App() {

    const navigate = useNavigate();

    const [friendsList, setFriendsList] = useState<string[]>([]);
    const [currentUser, setCurrentUser] = useState<userType>(JSON.parse(localStorage.getItem('user')!));

    useEffect(() => {
        if(!currentUser){
            navigate('/login');
        }
        else{
            getFriends();
        }
    }, []);

    const getFriends = async () => {
        const name = currentUser.name;

        const query = `query Query($name: String!) {
            GetFriends(name: $name)
        }`;

        const response = await fetch("/graphql", {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query, variables:{name}})
        });

        const result = await response.json();
        const friends = result.data.GetFriends;

        setFriendsList(friends);
    }

    const logOut = () => {
        setCurrentUser({name:""});
        localStorage.clear();
        navigate('/login');
    }

    return (
        <>
            {currentUser && <>
                <div id='topBar'>
                    <h1>{currentUser.name}</h1>
                    <input id='logout' type="button" onClick={logOut} value='logout' />
                </div>
                <main>
                    {apolloClient &&
                    <ApolloProvider client={apolloClient} >
                        <ChatScreen 
                            friendsList={friendsList}
                            currentUser={currentUser.name}
                            GetFriends={getFriends}
                        />
                    </ApolloProvider>}
                </main>

            </>}
        </>
    )
}

export default App
