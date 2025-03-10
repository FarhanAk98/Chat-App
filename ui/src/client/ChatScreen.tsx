import './ChatScreen.css'
import { MouseEvent, SyntheticEvent, useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client';
import Pusher from 'pusher-js'
import FriendRequests from './FriendRequests';
import exclamation from "./assets/exclamation.png"

const allQuery = gql`query Query($input: commInput) {
  GetChatMessages(input: $input) {
    text
    time
    senderName
    receiverName
  }
}`

const addQuery = gql`mutation Mutation($input: messageInput) {
    Chats(input: $input) {
    text
    time
    senderName
    receiverName
  }
}`

type messageOutput = {
    text: string,
    time: string,
    senderName: string
}

function ChatScreen(props:{friendsList: string[], currentUser: string, GetFriends: () => Promise<void>}){
    const [currentChat, setCurrentChat] = useState(props.friendsList[0]);
    const pusherChat = useRef(currentChat)
    const [friendRequests, setFriendRequests] = useState<string[]>([]);
    const [responseUser, setResponseUser] = useState("")
    const [showSearch, setShowSearch] = useState(266)

    const [addMutation] = useMutation(addQuery)
    const result = useQuery(allQuery, {
        variables: {input:{usName: props.currentUser, reName: currentChat}},
        fetchPolicy: 'cache-and-network'
    })
    const [chatMessages, setChatMessages] = useState<JSX.Element[]>([]);
    const pusherMessages = useRef<JSX.Element[]>([])
    const [textAreaContent, setTextAreaContent] = useState("");

    const printMessageScreen = (m:messageOutput) => {
        const t = new Date(m.time)
        let hours = t.getHours();
        let minutes: string | number = t.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        minutes = minutes < 10 ? "0" + minutes : minutes;
        hours = hours % 12 || 12;
        return(
        <div className={(m.senderName==props.currentUser)?'sent':'received'}>
            <h4>{m.text}</h4>
            <p>{hours + ':' + minutes + ampm}</p>
        </div>)
    }

    useEffect(()=>{
        const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
            cluster: import.meta.env.VITE_PUSHER_CLUSTER
        })
        const query = `query Query($input: authPusher) {
            GetConnections(input: $input)
        }`;
        const subscribedChannels:Set<string> = new Set();
        pusher.connection.bind('connected', ()=>{
            const input = {
                name: props.currentUser,
                socket: pusher.connection.socket_id
            };
            (async()=>{
                const response = await fetch('/graphql', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({query, variables:{input}})
                })
                const result = await response.json();
                const connections = result.data.GetConnections;
                connections.forEach((ele: [string, string]) => {
                    if(!subscribedChannels.has(ele[1]) && ele[0] == "true"){
                        const channel = pusher.subscribe(ele[1]);
                        subscribedChannels.add(ele[1]);
                        channel.bind("new-message", (data: { GetNewMessages: any; })=>{
                            const { GetNewMessages } = data;
                            setMessage(GetNewMessages)
                        })
                    }
                });
            })();
        })
        
        getRequests();
        return () => {
            subscribedChannels.forEach((conn:string) => {
              pusher.unsubscribe(conn);
            });
            pusher.disconnect();
        };
    }, [])

    const setMessage = (message:any) => {
        if(message.senderName == pusherChat.current || message.receiverName == pusherChat.current){
            const msgs = [printMessageScreen(message), ...pusherMessages.current];
            pusherMessages.current = msgs
            setChatMessages(msgs)
        }
        else{
            const exc = document.getElementsByClassName('notif ' + message.senderName);
            (exc[0] as HTMLElement).style.display = "inline-block"
        }
    }

    useEffect(()=>{
        if(result.data){
            const msgs = result.data.GetChatMessages.slice().reverse().map(
                (m:messageOutput)=>printMessageScreen(m));
            pusherMessages.current = msgs;
            setChatMessages(msgs);
        }
            
    }, [result])


    const sendMessage = async() => {
        const today = new Date();
        const input = {
            text: textAreaContent,
            time: today.toString(),
            senderName: props.currentUser,
            receiverName: currentChat
        }
        await addMutation({
            variables: {input: input}
        })
    }

    const setReply = (n:string) => {
        setCurrentChat("")
        pusherChat.current = "";
        setResponseUser(n)
    }

    const getRequests = async () => {
        const name = props.currentUser;
                
        const query = `
            query Query($name: String!) {
            GetRequests(name: $name)
        }`;

        const response = await fetch("/graphql", {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query, variables:{name}})
        });

        const result = await response.json();

        setFriendRequests(result.data.GetRequests)
    }

    const sendResponse = async(e: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
        e.preventDefault();
        const input = {
            usName: props.currentUser,
            reName: e.nativeEvent.submitter?.getAttribute('name')
        }
        if(input.reName){
            if(e.nativeEvent.submitter?.getAttribute('value') == "Accept"){
                const query = `mutation AddFriend($input: commInput) {
                    AddFriend(input: $input)
                }`
                await fetch("/graphql", {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({query, variables:{input}})
                });
            }
            else{
                const query = `mutation Mutation($input: commInput) {
                    RemoveRequest(input: $input)
                }`;
                await fetch("/graphql", {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({query, variables:{input}})
                });
            }
            window.location.reload();
        }
    }

    const setChat = (e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>, n:string) => {
        const img = (e.target as HTMLElement).children[0] as HTMLElement;
        img.style.display = "none";
        setCurrentChat(n)
        pusherChat.current = n;
    }

    return(<>
        <div id='ChatScreen'>
            <div id='friends'>
                {props.friendsList.map((n:string) => 
                    <button onClick={(e)=>setChat(e, n)} style={{backgroundColor: n == currentChat ? "#79D7BE" : "#213555"}}>
                        <img className={'notif '+n} src={exclamation} alt="exclamation" />
                        {" "+n}
                    </button>
                )}
                <form id='requests' method='POST' onSubmit={sendResponse}>
                    {friendRequests.map((n:string) =>
                        <button onClick={()=>setReply(n)}><strong>{n}</strong> sent you a request</button>
                    )}
                </form>
            </div>
            <div id='chatTitle' >
                <h2>{currentChat? currentChat : ""}</h2>
                <button onClick={()=>setShowSearch(0)} >ADD</button>
            </div>
            <div id='screen'>
                {currentChat ? 
                <div id='messages'>
                    {chatMessages}
                </div>: 
                responseUser ? 
                <form id='response' method='POST' onSubmit={sendResponse}>
                    <div>
                        <h1>Add {responseUser}?</h1>
                        <input type="submit" name={responseUser} value='Accept' />
                        <input type="submit" name={responseUser} value='Decline' />
                    </div>
                </form> :
                <div id='default'>
                    {props.friendsList.length > 0 ?
                    <h2>Select a friend to chat with</h2> :
                    <h2>Select ADD to search for friends</h2>
                    }
                </div>}
            </div>
            <div id='messageInput'>
                <textarea onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)=>setTextAreaContent(e.target.value)}
                    name="textValue" id='textValue'></textarea>
                {currentChat? <button onClick={()=>sendMessage()}>Send</button> :
                <button disabled onClick={()=>sendMessage()}>Send</button>
                }
            </div>
        </div>
        <div id='friendRequest' style={{transform: `translate(${showSearch}px)`}} >
            <button onClick={()=>{setShowSearch(266)}} >{"->"}</button>
            <FriendRequests 
                friendsList={props.friendsList}
                currentUser={props.currentUser}
            />
        </div>
    </>);
}

export default ChatScreen
