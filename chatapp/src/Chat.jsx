import { useContext, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext.jsx";
import axios from "axios";
import Contact from "./Contact";
import {uniqBy} from "lodash"

export default function Chat() {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const { username, id, setId, setUsername } = useContext(UserContext);
  const divUnderMessages = useRef();

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4040");
    setWs(ws);
    ws.addEventListener("message", handleMessage);
  }, []);
  function showOnlinePeople(peopleArray) {
    //this will store unique value of userdata in people object
    const people = {};
    peopleArray.forEach(({ userId, username }) => {
      people[userId] = username;
    });
    console.log(people);
    setOnlinePeople(people);
  }
  function handleMessage(e) {   //from websocket
    console.log(e);
    const messageData = JSON.parse(e.data);
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    }
    else if('text' in messageData){
      setMessages(prev=>([...prev,{...messageData}]));

    }
  }
  function sendMessage(ev) {
    if (ev) ev.preventDefault();
    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        text: newMessageText,
        
      })
    );
    setNewMessageText('');

    setMessages(prev=>([...prev,{
      text:newMessageText,
      sender: id,
      recipient: selectedUserId,
      _id: Date.now(),
    }]));
         
  }
  useEffect(()=>{
    const div = divUnderMessages.current;
    if(div)
    div.scrollIntoView({behaviour:'smooth',block:'end'}); 
  },[messages])
  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];


  const messagesWithoutDupes = uniqBy(messages, '_id');

  return (
    <div>
      <div className="flex h-screen">
        <div className="bg-white w-1/3 flex flex-col">
          <div className="flex-grow">
            <Logo /> {username}{" "}
            {Object.keys(onlinePeopleExclOurUser).map((userId) => (
              <Contact
                key={userId}
                id={userId}
                online={true}
                username={onlinePeopleExclOurUser[userId]}
                onClick={() => {
                  setSelectedUserId(userId);
                  console.log({ userId });
                }}
                selected={userId === selectedUserId}
              />
            ))}
          </div>
          <div className="p-2 text-center flex items-center justify-center"></div>
        </div>
        <div className="flex flex-col bg-blue-50 w-2/3 p-2">
          <div className="flex-grow">
            {!selectedUserId && (
              <div className="flex h-full flex-grow items-center justify-center">
                <div className="text-gray-300">
                  &larr; Select a person from the sidebar
                </div>
              </div>
            )}
            {!!selectedUserId && ( 
              <div className="relative h-full ">
            <div className="overflow-y-scroll absolute inset-0">
            {messagesWithoutDupes.map(message => (
                  <div key={message._id} className={(message.sender === id ? 'text-right': 'text-left')}>
                    <div className={"text-left inline-block p-2 my-2 rounded-md text-sm " +(message.sender === id ? 'bg-blue-500 text-white':'bg-white text-gray-500')}>
                      sender:{message.sender}<br/>
                      my id: {id}<br/>
                      {message.text}
                     
                    </div>
                  </div>
                ))}
                <div ref={divUnderMessages}></div>
             
            </div></div>)}
          </div>
          {!!selectedUserId && (
            <form className="flex gap-2" onSubmit={sendMessage}>
              <input
                type="text"
                value={newMessageText}
                onChange={(ev) => setNewMessageText(ev.target.value)}
                placeholder="Type your message here"
                className="bg-white flex-grow border rounded-sm p-2"
              />

              <button
                type="submit"
                className="bg-blue-500 p-2 text-white rounded-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
