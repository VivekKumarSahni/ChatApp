import axios from "axios";
import { UserContextProvider } from "./UserContext";
import Routes from "./Routes";

function App() {
  axios.defaults.baseURL='http://localhost:4040';
  axios.defaults.withCredentials= true;//defined so that we can set cookie from our apis

  return (
    <div >
      <UserContextProvider>
        <Routes/>
        </UserContextProvider>
      
    </div>
  );
}

export default App;
