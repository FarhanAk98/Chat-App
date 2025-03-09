
import { SyntheticEvent, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify/unstyled';
import "./FriendRequests.css"

function FriendRequests(props:{friendsList: string[], currentUser: string}){
    const [searchInput, setSearchInput] = useState("");
    const [availableUsers, setAvailableUsers] = useState<string[]>([]);

    const sendRequest = async (e: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
        e.preventDefault();
        const name = e.nativeEvent.submitter?.id;

        if(props.friendsList.indexOf(name!) > -1){
            toast("User is already your friend.");
        }
        else{
            const input = {
                reName: name,
                usName: props.currentUser
            }
            
            const query = `mutation Mutation($input: commInput) {
                SendRequest(input: $input)
            }`;
            
            await fetch("/graphql", {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({query, variables:{input}})
            });
    
            setAvailableUsers([]);
    
            toast.success("Request sent!", {
                closeOnClick: true        
            })
        }
    }

    const searchUser = async () => {
        if(searchInput.length > 0){
            const input = searchInput;
            let query = `query Query($input: String!) {
                getUsernames(input: $input)
            }`;
            const response = await fetch("/graphql", {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({query, variables:{input}})
            });

            const result = await response.json();

            setAvailableUsers(result.data.getUsernames.filter((n: String) => n != props.currentUser));
        }
    }

    return(
        <>
        <ToastContainer />
        <form id='search' method='POST' onSubmit={(e: React.FormEvent) => {e.preventDefault(); searchUser()}}>
            <input type="text" name="name" id="name" 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)} />
            <input type="submit" value='search'/>
        </form>
        <form id='available' method='POST' onSubmit={sendRequest}>
            {availableUsers.map((n: string) => 
                <div className='user'>
                
                    <label htmlFor={n}>{n}</label>
                    <input type='submit' id={n} value='Send Request' />
                </div>
            )}
            {(availableUsers.length > 0) && <><button onClick={()=>setAvailableUsers([])}>Clear</button></>}
        </form>
        </>
    );
}

export default FriendRequests
