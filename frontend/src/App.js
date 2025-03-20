import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';
import NewVideoMeet from './pages/newVideoMeet';
import Transcription from './pages/Transcription';
function App() {
  return (
    <div className="App">

      <Router>

        <AuthProvider>


          <Routes>

            <Route path='/' element={<LandingPage />} />

            <Route path='/auth' element={<Authentication />} />

            <Route path='/home's element={<HomeComponent />} />
            <Route path='/history' element={<History />} />
            <Route path='/:url' element={<VideoMeetComponent />} />
            <Route path='/new/:url' element={<NewVideoMeet />} />
            <Route path='/trans' element={<Transcription />} />
          </Routes>
        </AuthProvider>

      </Router>
    </div>
  );
}

export default App;
