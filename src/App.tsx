import { BrowserRouter, Routes, Route } from 'react-router-dom';
import APCSQuestionGenerator from './components/APCSQuestionGenerator';


function App() {
  return (
 
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<APCSQuestionGenerator/>} />
       
      </Routes>
    </BrowserRouter>

  );
}

export default App;